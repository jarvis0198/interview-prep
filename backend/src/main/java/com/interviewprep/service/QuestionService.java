package com.interviewprep.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.interviewprep.dto.GenerateQuestionsRequest;
import com.interviewprep.dto.GenerateQuestionsResponse;
import com.interviewprep.dto.MockInterviewRequest;
import com.interviewprep.dto.QuestionDto;
import com.interviewprep.dto.SessionSummaryDto;
import com.interviewprep.entity.PrepSession;
import com.interviewprep.entity.Question;
import com.interviewprep.entity.Resume;
import com.interviewprep.entity.User;
import com.interviewprep.repository.PrepSessionRepository;
import com.interviewprep.repository.QuestionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class QuestionService {

    private final PrepSessionRepository sessionRepository;
    private final QuestionRepository questionRepository;
    private final ResumeService resumeService;
    private final GroqService groqService;
    private final VectorStoreService vectorStore;
    private final CompanyKnowledgeService companyKB;
    private final TipsKnowledgeService tipsKB;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public GenerateQuestionsResponse generateQuestions(GenerateQuestionsRequest req, User user) {
        Resume resume = resumeService.getById(req.resumeId(), user);

        PrepSession session = new PrepSession();
        session.setCompanyName(req.companyName());
        session.setTargetRole(req.targetRole());
        session.setResume(resume);
        session = sessionRepository.save(session);

        // Retrieve RAG context
        String companyContext = companyKB.getRelevantContext(req.companyName(), req.targetRole(), 3);
        String pastQuestionsContext = getPastQuestionsContext(req.companyName());

        // Run both AI calls in parallel to halve generation time
        PrepSession finalSession = session;
        CompletableFuture<List<Question>> oaFuture = CompletableFuture.supplyAsync(
                () -> generateOAQuestions(resume, req, finalSession, companyContext, pastQuestionsContext));
        CompletableFuture<List<Question>> interviewFuture = CompletableFuture.supplyAsync(
                () -> generateInterviewQuestions(resume, req, finalSession, companyContext, pastQuestionsContext));

        List<Question> oaQuestions = oaFuture.join();
        List<Question> interviewQuestions = interviewFuture.join();

        questionRepository.saveAll(oaQuestions);
        questionRepository.saveAll(interviewQuestions);

        // Index generated questions for future RAG
        indexQuestions(oaQuestions, req.companyName());
        indexQuestions(interviewQuestions, req.companyName());

        return new GenerateQuestionsResponse(
                session.getId(),
                oaQuestions.stream().map(QuestionDto::from).toList(),
                interviewQuestions.stream().map(QuestionDto::from).toList()
        );
    }

    private void indexQuestions(List<Question> questions, String company) {
        for (Question q : questions) {
            String content = "Company: " + company + "\nType: " + q.getType() +
                    "\nCategory: " + q.getCategory() + "\n" + q.getQuestionText();
            vectorStore.store("QUESTION", q.getId(), content,
                    Map.of("company", company, "type", q.getType().name(), "category", q.getCategory()));
        }
    }

    private String getPastQuestionsContext(String company) {
        List<VectorStoreService.SearchResult> past =
                vectorStore.similaritySearch(company + " interview question", "QUESTION", 5);
        if (past.isEmpty()) return "";
        return "Previously generated questions for this company:\n" +
                past.stream().map(VectorStoreService.SearchResult::content)
                        .collect(Collectors.joining("\n---\n"));
    }

    private List<Question> generateOAQuestions(Resume resume, GenerateQuestionsRequest req,
            PrepSession session, String companyContext, String pastContext) {

        String tipsContext = tipsKB.getTipsForContext("DSA coding OA assessment " + req.companyName(), 3);

        String system = """
                You are a technical interviewer at %s. Generate Online Assessment (OA) questions.
                Return a JSON array (no markdown) with exactly 8 questions:
                [
                  {
                    "category": "<DSA/System Design/SQL/etc>",
                    "questionText": "<full question>",
                    "difficulty": "<Easy/Medium/Hard>",
                    "hint": "<optional hint>"
                  }
                ]
                Mix categories: 4 DSA coding problems, 2 SQL/database, 1 system design, 1 aptitude.
                Tailor questions to the candidate's specific skills from their resume.
                DO NOT repeat any previously generated questions listed in the context.
                """.formatted(req.companyName());

        String user = """
                Company: %s
                Role: %s

                Resume:
                %s

                %s

                %s

                %s
                """.formatted(
                req.companyName(),
                req.targetRole() != null ? req.targetRole() : "Software Engineer",
                resume.getContent(),
                companyContext.isBlank() ? "" : "Company Interview Patterns:\n" + companyContext,
                pastContext.isBlank() ? "" : pastContext,
                tipsContext.isBlank() ? "" : "Relevant Tips:\n" + tipsContext
        );

        return parseQuestions(groqService.chat(system, user), Question.QuestionType.OA, session);
    }

    private List<Question> generateInterviewQuestions(Resume resume, GenerateQuestionsRequest req,
            PrepSession session, String companyContext, String pastContext) {

        String tipsContext = tipsKB.getTipsForContext("behavioral technical interview " + req.companyName(), 4);

        String system = """
                You are a senior interviewer at %s. Generate interview questions for a candidate.
                Return a JSON array (no markdown) with exactly 10 questions:
                [
                  {
                    "category": "<Technical/Behavioral/HR/Role-Specific>",
                    "questionText": "<full question>",
                    "difficulty": "<Easy/Medium/Hard>",
                    "hint": "<what a strong answer covers>"
                  }
                ]
                Include: 4 technical, 3 behavioral (STAR format), 2 role-specific, 1 HR.
                Base technical questions on the candidate's specific skills.
                Behavioral questions should reflect this company's culture/values.
                DO NOT repeat any previously generated questions listed in the context.
                """.formatted(req.companyName());

        String user = """
                Company: %s
                Role: %s

                Resume:
                %s

                %s

                %s

                %s
                """.formatted(
                req.companyName(),
                req.targetRole() != null ? req.targetRole() : "Software Engineer",
                resume.getContent(),
                companyContext.isBlank() ? "" : "Company Interview Culture:\n" + companyContext,
                pastContext.isBlank() ? "" : pastContext,
                tipsContext.isBlank() ? "" : "Relevant Tips:\n" + tipsContext
        );

        return parseQuestions(groqService.chat(system, user), Question.QuestionType.INTERVIEW, session);
    }

    private List<Question> parseQuestions(String raw, Question.QuestionType type, PrepSession session) {
        List<Question> questions = new ArrayList<>();
        try {
            String json = extractJsonArray(raw);
            JsonNode array = objectMapper.readTree(json);
            for (JsonNode node : array) {
                Question q = new Question();
                q.setType(type);
                q.setCategory(node.path("category").asText("General"));
                q.setQuestionText(node.path("questionText").asText());
                q.setDifficulty(node.path("difficulty").asText("Medium"));
                q.setHint(node.path("hint").asText(null));
                q.setSession(session);
                questions.add(q);
            }
        } catch (Exception e) {
            Question fallback = new Question();
            fallback.setType(type);
            fallback.setCategory("General");
            fallback.setQuestionText("Failed to generate questions. Please try again.");
            fallback.setDifficulty("N/A");
            fallback.setSession(session);
            questions.add(fallback);
        }
        return questions;
    }

    private String extractJsonArray(String text) {
        int start = text.indexOf('[');
        int end = text.lastIndexOf(']');
        if (start >= 0 && end >= 0) return text.substring(start, end + 1);
        return "[]";
    }

    public Map<String, Object> generateMockInterview(MockInterviewRequest req, User user) {
        Resume resume = resumeService.getById(req.resumeId(), user);

        PrepSession session = new PrepSession();
        String roleLabel = (req.targetRole() != null && !req.targetRole().isBlank())
                ? req.targetRole() : "Software Engineer";
        session.setCompanyName(req.companyName());
        session.setTargetRole("[" + req.roundType() + "] " + roleLabel);
        session.setResume(resume);
        session = sessionRepository.save(session);

        String companyContext = companyKB.getRelevantContext(req.companyName(), req.targetRole(), 3);

        String systemPrompt = buildMockSystemPrompt(req.roundType(), req.companyName());
        String userMsg = """
                Company: %s
                Role: %s

                Resume:
                %s

                %s
                """.formatted(
                req.companyName(),
                req.targetRole() != null ? req.targetRole() : "Software Engineer",
                resume.getContent(),
                companyContext.isBlank() ? "" : "Company Context:\n" + companyContext
        );

        List<Question> questions = parseQuestions(groqService.chat(systemPrompt, userMsg),
                Question.QuestionType.INTERVIEW, session);
        questionRepository.saveAll(questions);

        return Map.of(
                "sessionId", session.getId(),
                "roundType", req.roundType()
        );
    }

    private String buildMockSystemPrompt(String roundType, String company) {
        return switch (roundType) {
            case "Behavioral" -> """
                    You are a senior HR interviewer at %s conducting a behavioral interview round.
                    Return a JSON array (no markdown) with exactly 8 questions focused entirely on behavioral scenarios.
                    Each question must use the STAR method format.
                    [{"category":"Behavioral","questionText":"<question>","difficulty":"<Easy/Medium/Hard>","hint":"<what strong answer covers>"}]
                    Mix: teamwork, conflict resolution, leadership, failure/learning, achievement, adaptability.
                    Tailor to the company's known culture and values.
                    """.formatted(company);
            case "Technical" -> """
                    You are a senior software engineer at %s conducting a technical interview round.
                    Return a JSON array (no markdown) with exactly 8 technical questions.
                    [{"category":"Technical","questionText":"<question>","difficulty":"<Easy/Medium/Hard>","hint":"<key concepts to cover>"}]
                    Focus on: algorithms, data structures, code design, debugging, system internals.
                    Base questions on the candidate's resume skills. Mix Easy/Medium/Hard.
                    """.formatted(company);
            case "DSA" -> """
                    You are a competitive programming interviewer at %s.
                    Return a JSON array (no markdown) with exactly 8 DSA problem-solving questions.
                    [{"category":"DSA","questionText":"<full problem statement with example>","difficulty":"<Easy/Medium/Hard>","hint":"<approach/pattern hint>"}]
                    Mix patterns: arrays, strings, trees, graphs, DP, sliding window, two pointers, backtracking.
                    Write full problem statements with input/output examples like a real OA.
                    """.formatted(company);
            case "System Design" -> """
                    You are a staff engineer at %s conducting a system design interview round.
                    Return a JSON array (no markdown) with exactly 6 system design questions.
                    [{"category":"System Design","questionText":"<question>","difficulty":"<Medium/Hard>","hint":"<components and trade-offs to cover>"}]
                    Include: scalability, distributed systems, databases, caching, APIs, real-world system designs.
                    Tailor complexity to a senior engineer level.
                    """.formatted(company);
            case "HR" -> """
                    You are an HR manager at %s conducting an HR screening round.
                    Return a JSON array (no markdown) with exactly 8 HR interview questions.
                    [{"category":"HR","questionText":"<question>","difficulty":"Easy","hint":"<what to convey>"}]
                    Cover: motivation, salary expectations, work style, culture fit, career goals, strengths/weaknesses,
                    notice period, why this company, relocation willingness.
                    """.formatted(company);
            case "Role-Specific" -> """
                    You are a hiring manager at %s conducting a role-specific interview round.
                    Return a JSON array (no markdown) with exactly 8 role-specific questions.
                    [{"category":"Role-Specific","questionText":"<question>","difficulty":"<Easy/Medium/Hard>","hint":"<key points>"}]
                    Questions must be directly tied to the candidate's resume experience, projects, and skills.
                    Dig into their past work, technology choices, and domain knowledge.
                    """.formatted(company);
            default -> """
                    You are a senior interviewer at %s conducting a full mixed interview round.
                    Return a JSON array (no markdown) with exactly 10 questions.
                    [{"category":"<Technical/Behavioral/HR/System Design/DSA>","questionText":"<question>","difficulty":"<Easy/Medium/Hard>","hint":"<key points>"}]
                    Mix: 3 technical, 2 behavioral, 2 DSA, 1 system design, 1 HR, 1 role-specific.
                    """.formatted(company);
        };
    }

    public List<QuestionDto> getBySession(Long sessionId) {
        return questionRepository.findBySessionId(sessionId)
                .stream().map(QuestionDto::from).toList();
    }

    public List<SessionSummaryDto> getAllSessions(User user) {
        List<PrepSession> sessions = sessionRepository.findByResumeUserOrderByCreatedAtDesc(user);
        return sessions.stream().map(s -> SessionSummaryDto.from(
                s,
                questionRepository.countBySessionIdAndType(s.getId(), Question.QuestionType.OA),
                questionRepository.countBySessionIdAndType(s.getId(), Question.QuestionType.INTERVIEW)
        )).toList();
    }

    public Map<String, String> getFeedback(Long questionId, String userAnswer) {
        Question q = questionRepository.findById(questionId)
                .orElseThrow(() -> new RuntimeException("Question not found: " + questionId));

        String system = """
                You are an expert technical interview coach. Evaluate the candidate's answer.
                Be constructive, specific, and encouraging. Structure your feedback in markdown:
                ## Score
                X/10 — one-line verdict.
                ## What You Got Right
                Bullet points of correct points.
                ## What Could Be Better
                Bullet points of gaps or improvements.
                ## Model Answer
                A concise ideal answer for reference.
                """;

        String userMsg = "Question: " + q.getQuestionText() + "\n\nCandidate's Answer: " + userAnswer;
        String feedback = groqService.chat(system, userMsg);
        return Map.of("feedback", feedback);
    }

    public QuestionDto updateNotes(Long questionId, String notes) {
        Question q = questionRepository.findById(questionId)
                .orElseThrow(() -> new RuntimeException("Question not found: " + questionId));
        q.setNotes(notes);
        return QuestionDto.from(questionRepository.save(q));
    }

    public QuestionDto getTestCases(Long questionId) {
        Question q = questionRepository.findById(questionId)
                .orElseThrow(() -> new RuntimeException("Question not found: " + questionId));

        if (q.getTestCases() != null && !q.getTestCases().isBlank()) {
            return QuestionDto.from(q);
        }

        String system = """
                You are an expert competitive programming judge.
                Given a coding problem, generate exactly 5 test cases.
                Return ONLY a JSON array, no markdown, no explanation:
                [
                  {
                    "id": 1,
                    "input": "<exact stdin input>",
                    "expectedOutput": "<exact expected stdout, trimmed>",
                    "description": "<what this case tests, e.g. empty input, large n, negative numbers>"
                  }
                ]
                Rules:
                - input and expectedOutput must be exact strings that can be piped to stdin/stdout
                - Cover: basic case, edge case (empty/zero/negative), large input, multiple outputs, corner case
                - expectedOutput must match exactly what a correct program would print (including newlines if multiple values)
                """;

        String userMsg = "Problem:\n" + q.getQuestionText();
        String raw = groqService.chat(system, userMsg);

        int start = raw.indexOf('[');
        int end = raw.lastIndexOf(']');
        String testCasesJson = (start >= 0 && end >= 0) ? raw.substring(start, end + 1) : "[]";

        q.setTestCases(testCasesJson);
        questionRepository.save(q);
        return QuestionDto.from(q);
    }

    public QuestionDto getSolution(Long questionId) {
        Question q = questionRepository.findById(questionId)
                .orElseThrow(() -> new RuntimeException("Question not found: " + questionId));

        if (q.getSolution() != null && !q.getSolution().isBlank()) {
            return QuestionDto.from(q);
        }

        String system = """
                You are an expert software engineer and interview coach.
                Provide a clear, concise solution to the given interview question.
                Format your response in markdown with these sections:
                ## Approach
                Brief explanation of the approach.
                ## Solution
                Code (if applicable) with explanation.
                ## Complexity
                Time and space complexity (if applicable).
                ## Key Points
                2-3 bullet points of what interviewers look for.
                """;

        String userMsg = "Question type: " + q.getType() + "\nCategory: " + q.getCategory() +
                "\nDifficulty: " + q.getDifficulty() + "\n\n" + q.getQuestionText();

        String solution = groqService.chat(system, userMsg);
        q.setSolution(solution);
        questionRepository.save(q);
        return QuestionDto.from(q);
    }

    public void deleteSession(Long sessionId, User user) {
        PrepSession session = sessionRepository.findByIdWithUser(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found: " + sessionId));
        if (!session.getResume().getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Session not found: " + sessionId);
        }
        sessionRepository.delete(session);
    }
}

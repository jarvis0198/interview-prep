package com.interviewprep.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.interviewprep.dto.GenerateQuestionsRequest;
import com.interviewprep.dto.GenerateQuestionsResponse;
import com.interviewprep.dto.QuestionDto;
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

    public List<QuestionDto> getBySession(Long sessionId) {
        return questionRepository.findBySessionId(sessionId)
                .stream().map(QuestionDto::from).toList();
    }

    public List<PrepSession> getAllSessions(User user) {
        return sessionRepository.findByResumeUserOrderByCreatedAtDesc(user);
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

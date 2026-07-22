package com.interviewprep.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.interviewprep.dto.BuildResumeRequest;
import com.interviewprep.dto.ResumeSuggestionResponse;
import com.interviewprep.dto.ResumeScoreResponse;
import com.interviewprep.entity.Resume;
import com.interviewprep.entity.User;
import com.interviewprep.repository.ResumeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.springframework.context.annotation.Lazy;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.StreamSupport;

@Service
@RequiredArgsConstructor
@Slf4j
public class ResumeService {

    private final ResumeRepository resumeRepository;
    private final GroqService groqService;
    @Lazy private final ResumeChatService resumeChatService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    public Resume uploadFile(MultipartFile file, User user) throws IOException {
        String content;
        String filename = file.getOriginalFilename();

        if (filename != null && filename.endsWith(".pdf")) {
            try (PDDocument doc = Loader.loadPDF(file.getBytes())) {
                content = new PDFTextStripper().getText(doc);
            }
        } else if (filename != null && (filename.endsWith(".docx") || filename.endsWith(".doc"))) {
            try (XWPFDocument doc = new XWPFDocument(file.getInputStream())) {
                StringBuilder sb = new StringBuilder();
                doc.getParagraphs().forEach(p -> sb.append(p.getText()).append("\n"));
                content = sb.toString();
            }
        } else {
            content = new String(file.getBytes());
        }

        Resume resume = new Resume();
        resume.setUser(user);
        resume.setContent(content.trim());
        resume.setOriginalFilename(filename);
        Resume saved = resumeRepository.save(resume);
        resumeChatService.indexResume(saved);
        return saved;
    }

    public Resume uploadText(String content, User user) {
        Resume resume = new Resume();
        resume.setUser(user);
        resume.setContent(content.trim());
        Resume saved = resumeRepository.save(resume);
        resumeChatService.indexResume(saved);
        return saved;
    }

    public Resume getById(Long id, User user) {
        return resumeRepository.findByIdAndUser(id, user)
                .orElseThrow(() -> new RuntimeException("Resume not found: " + id));
    }

    public List<Resume> getAll(User user) {
        return resumeRepository.findByUser(user);
    }

    public Resume update(Long id, String content, User user) {
        Resume resume = getById(id, user);
        resume.setContent(content);
        resume.setScore(null);
        resume.setScoreFeedback(null);
        Resume saved = resumeRepository.save(resume);
        resumeChatService.indexResume(saved);
        return saved;
    }

    public Resume updateTemplate(Long id, String templateName, User user) {
        Resume resume = getById(id, user);
        resume.setTemplateName(templateName);
        return resumeRepository.save(resume);
    }

    public Resume updateTitle(Long id, String title, User user) {
        Resume resume = getById(id, user);
        resume.setTitle(title != null ? title.trim() : null);
        return resumeRepository.save(resume);
    }

    public void delete(Long id, User user) {
        Resume resume = getById(id, user);
        resumeRepository.delete(resume);
    }

    public ResumeScoreResponse score(Long id, User user) {
        Resume resume = getById(id, user);

        String system = """
                You are a professional resume reviewer with 15 years of experience in tech hiring.
                Analyze the resume and return a JSON response with this exact structure (no markdown, just JSON):
                {
                  "score": <integer 0-100>,
                  "feedback": "<overall feedback paragraph>",
                  "strengths": ["<strength1>", "<strength2>", "<strength3>"],
                  "improvements": ["<improvement1>", "<improvement2>", "<improvement3>"]
                }
                """;

        String raw = groqService.chat(system, "Analyze this resume:\n\n" + resume.getContent());

        try {
            JsonNode node = objectMapper.readTree(extractJson(raw));
            int score = node.path("score").asInt();
            String feedback = node.path("feedback").asText();
            List<String> strengths = StreamSupport.stream(node.path("strengths").spliterator(), false)
                    .map(JsonNode::asText).toList();
            List<String> improvements = StreamSupport.stream(node.path("improvements").spliterator(), false)
                    .map(JsonNode::asText).toList();

            resume.setScore(score);
            resume.setScoreFeedback(feedback);
            resumeRepository.save(resume);

            return new ResumeScoreResponse(score, feedback, strengths, improvements);
        } catch (Exception e) {
            return new ResumeScoreResponse(0, "Failed to parse score. Raw: " + raw, List.of(), List.of());
        }
    }

    public ResumeSuggestionResponse suggestions(Long id, User user) {
        Resume resume = getById(id, user);

        String system = """
                You are an expert resume coach. Analyze the resume and return a JSON object with this exact structure (no markdown, just JSON):
                {
                  "sectionSuggestions": {
                    "contact": ["suggestion1", "suggestion2"],
                    "summary": ["suggestion1", "suggestion2"],
                    "experience": ["suggestion1", "suggestion2", "suggestion3"],
                    "skills": ["suggestion1", "suggestion2"],
                    "education": ["suggestion1", "suggestion2"],
                    "projects": ["suggestion1", "suggestion2"]
                  },
                  "overallTip": "<one actionable overall tip>"
                }
                Each suggestion should be specific, actionable, and based on what is present or missing in the resume.
                """;

        String raw = groqService.chat(system, "Give section-by-section improvement suggestions for this resume:\n\n" + resume.getContent());

        try {
            JsonNode node = objectMapper.readTree(extractJson(raw));
            JsonNode sectionsNode = node.path("sectionSuggestions");
            String overallTip = node.path("overallTip").asText();

            Map<String, List<String>> sectionSuggestions = new LinkedHashMap<>();
            sectionsNode.fields().forEachRemaining(entry -> {
                List<String> tips = new ArrayList<>();
                entry.getValue().forEach(tip -> tips.add(tip.asText()));
                sectionSuggestions.put(entry.getKey(), tips);
            });

            return new ResumeSuggestionResponse(sectionSuggestions, overallTip);
        } catch (Exception e) {
            log.warn("Failed to parse suggestions: {}", e.getMessage());
            return new ResumeSuggestionResponse(
                    Map.of("general", List.of("Unable to parse suggestions. Please try again.")),
                    raw.length() > 200 ? raw.substring(0, 200) : raw);
        }
    }

    public Map<String, Object> matchJobDescription(Long id, String jobDescription, User user) {
        Resume resume = getById(id, user);

        String system = """
                You are an expert technical recruiter and career coach.
                Compare the resume against the job description and return a JSON object (no markdown):
                {
                  "score": <integer 0-100>,
                  "summary": "<2-sentence overall assessment>",
                  "matchedSkills": ["skill1", "skill2"],
                  "missingSkills": ["skill1", "skill2"],
                  "matchedKeywords": ["keyword1", "keyword2"],
                  "suggestions": ["actionable suggestion 1", "actionable suggestion 2", "actionable suggestion 3"]
                }
                Score 90-100: excellent match, 70-89: good match, 50-69: partial match, below 50: weak match.
                """;

        String userMsg = "JOB DESCRIPTION:\n" + jobDescription + "\n\nRESUME:\n" + resume.getContent();
        String raw = groqService.chat(system, userMsg);

        try {
            JsonNode node = objectMapper.readTree(extractJson(raw));
            Map<String, Object> result = new java.util.LinkedHashMap<>();
            result.put("score", node.path("score").asInt());
            result.put("summary", node.path("summary").asText());
            result.put("matchedSkills", StreamSupport.stream(node.path("matchedSkills").spliterator(), false).map(JsonNode::asText).toList());
            result.put("missingSkills", StreamSupport.stream(node.path("missingSkills").spliterator(), false).map(JsonNode::asText).toList());
            result.put("matchedKeywords", StreamSupport.stream(node.path("matchedKeywords").spliterator(), false).map(JsonNode::asText).toList());
            result.put("suggestions", StreamSupport.stream(node.path("suggestions").spliterator(), false).map(JsonNode::asText).toList());
            return result;
        } catch (Exception e) {
            log.warn("Failed to parse JD match response: {}", e.getMessage());
            return Map.of("score", 0, "summary", "Failed to analyze. Please try again.", "matchedSkills", List.of(), "missingSkills", List.of(), "matchedKeywords", List.of(), "suggestions", List.of());
        }
    }

    public Resume buildResume(BuildResumeRequest req, User user) {
        String systemPrompt = buildSystemPrompt(req.mode());
        String userMessage = "url".equals(req.mode()) ?
                "URL: " + req.input() + "\n\nScraped content:\n" + fetchUrlContent(req.input()) :
                req.input();

        String raw = groqService.chat(systemPrompt, userMessage);

        Resume resume = new Resume();
        resume.setUser(user);
        resume.setContent(raw.trim());
        resume.setOriginalFilename("built-from-" + req.mode() + ".txt");
        Resume saved = resumeRepository.save(resume);
        resumeChatService.indexResume(saved);
        return saved;
    }

    private String buildSystemPrompt(String mode) {
        return switch (mode) {
            case "text" -> "You are a professional resume writer. Convert the natural-language description into a clean professional resume with sections: CONTACT INFORMATION, SUMMARY, EXPERIENCE, EDUCATION, SKILLS, PROJECTS. Use bullet points. Return only the resume text.";
            case "json" -> "You are a professional resume writer. Convert the JSON object into a clean professional resume with sections: CONTACT INFORMATION, SUMMARY, EXPERIENCE, EDUCATION, SKILLS, PROJECTS. Use bullet points. Return only the resume text.";
            case "keyvalue" -> "You are a professional resume writer. Parse the key-value format data and convert it into a clean professional resume with sections: CONTACT INFORMATION, SUMMARY, EXPERIENCE, EDUCATION, SKILLS, PROJECTS. Use bullet points. Return only the resume text.";
            case "regex" -> "You are a professional resume writer. Extract all resume information (names, emails, phones, job titles, companies, dates, skills, degrees) from the raw text and structure it into a clean professional resume with sections: CONTACT INFORMATION, SUMMARY, EXPERIENCE, EDUCATION, SKILLS, PROJECTS. Return only the resume text.";
            case "url" -> "You are a professional resume writer. The user provides a URL and its scraped content. Extract all relevant info and structure it into a clean professional resume with sections: CONTACT INFORMATION, SUMMARY, EXPERIENCE, EDUCATION, SKILLS, PROJECTS. Return only the resume text.";
            default -> "Convert the provided input into a clean professional resume. Use sections: CONTACT INFORMATION, SUMMARY, EXPERIENCE, EDUCATION, SKILLS. Return only the resume text.";
        };
    }

    private String fetchUrlContent(String url) {
        try {
            RestTemplate rt = new RestTemplate();
            ResponseEntity<String> resp = rt.getForEntity(url, String.class);
            String body = resp.getBody();
            if (body == null) return "(no content)";
            String text = body.replaceAll("<[^>]+>", " ").replaceAll("\\s{3,}", "\n").trim();
            return text.length() > 6000 ? text.substring(0, 6000) : text;
        } catch (Exception e) {
            log.warn("URL fetch failed for {}: {}", url, e.getMessage());
            return "(Could not fetch URL content: " + e.getMessage() + ")";
        }
    }

    private String extractJson(String text) {
        int start = text.indexOf('{');
        int end = text.lastIndexOf('}');
        if (start >= 0 && end >= 0) return text.substring(start, end + 1);
        return text;
    }
}

package com.interviewprep.service;

import com.interviewprep.entity.Resume;
import com.interviewprep.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Chunks a resume into paragraphs, embeds each chunk, and enables
 * semantic Q&A over the resume content.
 */
@Service
@RequiredArgsConstructor
public class ResumeChatService {

    private static final String DOC_TYPE = "RESUME_CHUNK";
    private final VectorStoreService vectorStore;
    private final GroqService groqService;

    /** Index a resume: chunk by paragraph, embed each chunk. */
    public void indexResume(Resume resume) {
        vectorStore.deleteBySourceId(DOC_TYPE, resume.getId());
        String[] paragraphs = resume.getContent().split("\\n{2,}");
        for (String para : paragraphs) {
            String chunk = para.trim();
            if (chunk.length() < 20) continue;
            vectorStore.store(DOC_TYPE, resume.getId(), chunk,
                    Map.of("resumeId", resume.getId()));
        }
    }

    /**
     * Answer a question about the resume using relevant chunks as context.
     * Returns the LLM answer string.
     */
    public String chat(Long resumeId, String userQuestion, User user) {
        List<VectorStoreService.SearchResult> chunks =
                vectorStore.similaritySearch(userQuestion, DOC_TYPE, 5);

        // Filter to only chunks belonging to this user's resume
        String resumeContext = chunks.stream()
                .filter(r -> resumeId == null || resumeId.equals(r.sourceId()))
                .map(VectorStoreService.SearchResult::content)
                .collect(Collectors.joining("\n\n"));

        if (resumeContext.isBlank()) {
            return "I couldn't find relevant information in your resume for that question. " +
                   "Make sure your resume has been indexed (upload or save it first).";
        }

        // Also pull relevant external KB context (tips, handbook content)
        List<VectorStoreService.SearchResult> externalChunks =
                vectorStore.similaritySearch(userQuestion, "EXTERNAL_KB", 2);
        String externalContext = externalChunks.stream()
                .map(VectorStoreService.SearchResult::content)
                .collect(Collectors.joining("\n\n"));

        String system = """
                You are a career coach analyzing a candidate's resume.
                Answer the question based on the resume excerpts provided.
                Where relevant, draw on the industry knowledge provided.
                Be specific, honest, and actionable. If the resume doesn't contain
                enough information to answer confidently, say so.
                """;

        String userMessage = """
                Resume excerpts:
                ---
                %s
                ---
                %s
                Question: %s
                """.formatted(
                resumeContext,
                externalContext.isBlank() ? "" : "\nRelevant industry knowledge:\n---\n" + externalContext + "\n---\n",
                userQuestion
        );

        return groqService.chat(system, userMessage);
    }
}

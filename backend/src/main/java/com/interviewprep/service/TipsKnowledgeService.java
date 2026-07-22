package com.interviewprep.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Retrieves relevant interview tips for a given question type or topic.
 */
@Service
@RequiredArgsConstructor
public class TipsKnowledgeService {

    private static final String DOC_TYPE = "TIPS_KB";
    private final VectorStoreService vectorStore;

    public void addTip(String category, String tip) {
        String content = "Category: " + category + "\n" + tip;
        vectorStore.store(DOC_TYPE, null, content, Map.of("category", category));
    }

    public String getTipsForContext(String questionContext, int topK) {
        // Search both static tips KB and external KB (tech-interview-handbook, behavioral guides, etc.)
        List<VectorStoreService.SearchResult> tipsResults =
                vectorStore.similaritySearch(questionContext, DOC_TYPE, topK);
        List<VectorStoreService.SearchResult> externalResults =
                vectorStore.similaritySearch(questionContext, "EXTERNAL_KB", 3);

        List<String> combined = new java.util.ArrayList<>();
        tipsResults.forEach(r -> combined.add(r.content()));
        externalResults.forEach(r -> combined.add(r.content()));

        return combined.isEmpty() ? "" : String.join("\n\n", combined);
    }
}

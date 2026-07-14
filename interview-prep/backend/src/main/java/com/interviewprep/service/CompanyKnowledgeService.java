package com.interviewprep.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Stores and retrieves known interview patterns per company.
 * Seeded on startup; users can also add entries via the API.
 */
@Service
@RequiredArgsConstructor
public class CompanyKnowledgeService {

    private static final String DOC_TYPE = "COMPANY_KB";
    private final VectorStoreService vectorStore;

    public void addEntry(String company, String pattern) {
        String content = "Company: " + company + "\n" + pattern;
        vectorStore.store(DOC_TYPE, null, content, Map.of("company", company));
    }

    public String getRelevantContext(String companyName, String role, int topK) {
        String query = companyName + " " + (role != null ? role : "software engineer") + " interview";

        // Search both static company KB and external KB (interview-formats-top-companies, etc.)
        List<VectorStoreService.SearchResult> companyResults =
                vectorStore.similaritySearch(query, DOC_TYPE, topK);
        List<VectorStoreService.SearchResult> externalResults =
                vectorStore.similaritySearch(companyName + " interview format culture", "EXTERNAL_KB", 2);

        List<String> combined = new java.util.ArrayList<>();
        companyResults.forEach(r -> combined.add(r.content()));
        externalResults.forEach(r -> combined.add(r.content()));

        return combined.isEmpty() ? "" : String.join("\n\n", combined);
    }
}

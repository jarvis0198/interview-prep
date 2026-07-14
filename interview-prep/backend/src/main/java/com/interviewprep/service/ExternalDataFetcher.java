package com.interviewprep.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Fetches raw content from GitHub and the Leetcode public API.
 * All methods return empty strings / empty lists on failure so the seeder
 * can continue gracefully if a single source is unavailable.
 */
@Service
@Slf4j
public class ExternalDataFetcher {

    private static final String GITHUB_RAW = "https://raw.githubusercontent.com";
    private static final String LEETCODE_GRAPHQL = "https://leetcode.com/graphql";
    private static final String LEETCODE_API = "https://leetcode.com/api/problems/algorithms/";

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    // ── GitHub markdown files ─────────────────────────────────────────────────

    public String fetchGithubRaw(String path) {
        try {
            ResponseEntity<String> res = restTemplate.getForEntity(GITHUB_RAW + path, String.class);
            if (res.getStatusCode().is2xxSuccessful() && res.getBody() != null) {
                return res.getBody();
            }
        } catch (Exception e) {
            log.warn("Failed to fetch {}: {}", path, e.getMessage());
        }
        return "";
    }

    public String fetchUrl(String url) {
        try {
            ResponseEntity<String> res = restTemplate.getForEntity(url, String.class);
            if (res.getStatusCode().is2xxSuccessful() && res.getBody() != null) {
                return res.getBody();
            }
        } catch (Exception e) {
            log.warn("Failed to fetch {}: {}", url, e.getMessage());
        }
        return "";
    }

    // ── Leetcode public GraphQL ───────────────────────────────────────────────

    /**
     * Returns up to maxResults free (non-premium) problems with title, difficulty,
     * and topic tags.
     */
    public List<Map<String, Object>> fetchLeetcodeProblems(int maxResults) {
        List<Map<String, Object>> results = new ArrayList<>();
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Referer", "https://leetcode.com");

            String query = "{ allQuestions { title difficulty topicTags { name } } }";
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(
                    Map.of("query", query), headers);

            ResponseEntity<String> response = restTemplate.postForEntity(
                    LEETCODE_GRAPHQL, request, String.class);

            JsonNode root = objectMapper.readTree(response.getBody());
            JsonNode questions = root.path("data").path("allQuestions");

            // Also fetch acceptance rates from REST API
            Map<String, Double> acceptanceRates = fetchAcceptanceRates();

            int count = 0;
            for (JsonNode q : questions) {
                if (count >= maxResults) break;
                String title = q.path("title").asText();
                String difficulty = q.path("difficulty").asText();

                List<String> tags = new ArrayList<>();
                for (JsonNode tag : q.path("topicTags")) {
                    tags.add(tag.path("name").asText());
                }

                // Skip problems with no tags (usually premium/special)
                if (tags.isEmpty()) continue;

                results.add(Map.of(
                        "title", title,
                        "difficulty", difficulty,
                        "tags", tags,
                        "acceptance", acceptanceRates.getOrDefault(title, 0.0)
                ));
                count++;
            }
        } catch (Exception e) {
            log.warn("Failed to fetch Leetcode problems: {}", e.getMessage());
        }
        return results;
    }

    private Map<String, Double> fetchAcceptanceRates() {
        try {
            ResponseEntity<String> res = restTemplate.getForEntity(LEETCODE_API, String.class);
            JsonNode root = objectMapper.readTree(res.getBody());
            java.util.HashMap<String, Double> rates = new java.util.HashMap<>();
            for (JsonNode pair : root.path("stat_status_pairs")) {
                if (pair.path("paid_only").asBoolean()) continue;
                String title = pair.path("stat").path("question__title").asText();
                double acs = pair.path("stat").path("total_acs").asDouble();
                double sub = pair.path("stat").path("total_submitted").asDouble();
                if (sub > 0) rates.put(title, Math.round((acs / sub) * 1000.0) / 10.0);
            }
            return rates;
        } catch (Exception e) {
            log.warn("Failed to fetch acceptance rates: {}", e.getMessage());
            return Map.of();
        }
    }
}

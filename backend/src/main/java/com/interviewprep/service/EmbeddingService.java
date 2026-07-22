package com.interviewprep.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

/**
 * Produces semantic float vectors via OpenAI text-embedding-3-small
 * (served through the local proxy at localhost:6655).
 * Falls back to deterministic n-gram hashing if the API is unreachable.
 */
@Service
@Slf4j
public class EmbeddingService {

    public static final int VECTOR_DIM = 1536;

    @Value("${openai.api.key}")
    private String apiKey;

    @Value("${openai.api.base-url}")
    private String baseUrl;

    @Value("${openai.embedding.model}")
    private String model;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public float[] embed(String text) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(apiKey);

            // Truncate to ~8000 chars to stay within token limits
            String input = text.length() > 8000 ? text.substring(0, 8000) : text;

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(
                    Map.of("model", model, "input", input), headers);

            String url = baseUrl.replaceAll("/$", "") + "/v1/embeddings";
            ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);

            JsonNode embeddingNode = objectMapper.readTree(response.getBody())
                    .path("data").get(0).path("embedding");

            float[] result = new float[embeddingNode.size()];
            for (int i = 0; i < embeddingNode.size(); i++) {
                result[i] = (float) embeddingNode.get(i).asDouble();
            }
            return result;

        } catch (Exception e) {
            log.warn("OpenAI embedding failed, using fallback: {}", e.getMessage());
            return fallbackEmbed(text);
        }
    }

    private float[] fallbackEmbed(String text) {
        float[] vec = new float[VECTOR_DIM];
        String lower = text.toLowerCase();
        for (int i = 0; i < lower.length() - 1; i++) {
            int hash = (lower.charAt(i) * 31 + lower.charAt(i + 1)) & 0x7FFFFFFF;
            vec[hash % VECTOR_DIM] += 1.0f;
        }
        float norm = 0;
        for (float v : vec) norm += v * v;
        norm = (float) Math.sqrt(norm);
        if (norm > 0) for (int i = 0; i < vec.length; i++) vec[i] /= norm;
        return vec;
    }

    public static int vectorDim() {
        return VECTOR_DIM;
    }
}

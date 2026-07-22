package com.interviewprep.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

/**
 * AI chat service. Supports two providers via application.properties:
 *   ai.provider=claude  → Anthropic Messages API  (default, uses local proxy)
 *   ai.provider=groq    → Groq Chat Completions API
 *
 * Switch at any time by changing ai.provider + the corresponding key/url/model properties.
 */
@Service
@Slf4j
public class GroqService {

    @Value("${ai.provider:claude}")
    private String provider;

    // Claude / Anthropic settings
    @Value("${claude.api.key:}")
    private String claudeApiKey;
    @Value("${claude.api.base-url:https://api.anthropic.com}")
    private String claudeBaseUrl;
    @Value("${claude.model:claude-sonnet-latest}")
    private String claudeModel;

    // Groq settings
    @Value("${groq.api.key:}")
    private String groqApiKey;
    @Value("${groq.api.base-url:https://api.groq.com/openai}")
    private String groqBaseUrl;
    @Value("${groq.model:llama-3.3-70b-versatile}")
    private String groqModel;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public String chat(String systemPrompt, String userMessage) {
        if ("groq".equalsIgnoreCase(provider)) {
            return chatGroq(systemPrompt, userMessage);
        }
        return chatClaude(systemPrompt, userMessage);
    }

    private String chatClaude(String systemPrompt, String userMessage) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("x-api-key", claudeApiKey);
        headers.set("anthropic-version", "2023-06-01");

        Map<String, Object> body = Map.of(
                "model", claudeModel,
                "max_tokens", 4096,
                "system", systemPrompt,
                "messages", List.of(Map.of("role", "user", "content", userMessage))
        );

        String url = claudeBaseUrl.replaceAll("/$", "") + "/v1/messages";
        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
        ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);

        try {
            JsonNode root = objectMapper.readTree(response.getBody());
            return root.path("content").get(0).path("text").asText();
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse Claude response: " + response.getBody(), e);
        }
    }

    private String chatGroq(String systemPrompt, String userMessage) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(groqApiKey);

        Map<String, Object> body = Map.of(
                "model", groqModel,
                "max_tokens", 4096,
                "messages", List.of(
                        Map.of("role", "system", "content", systemPrompt),
                        Map.of("role", "user", "content", userMessage)
                )
        );

        String url = groqBaseUrl.replaceAll("/$", "") + "/v1/chat/completions";
        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
        ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);

        try {
            JsonNode root = objectMapper.readTree(response.getBody());
            return root.path("choices").get(0).path("message").path("content").asText();
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse Groq response: " + response.getBody(), e);
        }
    }
}

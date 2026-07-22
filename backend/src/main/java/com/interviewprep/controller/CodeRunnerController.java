package com.interviewprep.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@RestController
@RequestMapping("/api/code")
@RequiredArgsConstructor
public class CodeRunnerController {

    private static final String PISTON_URL = "https://emkc.org/api/v2/piston/execute";
    private final RestTemplate restTemplate = new RestTemplate();

    @PostMapping("/run")
    public ResponseEntity<String> run(@RequestBody Map<String, Object> body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        try {
            ResponseEntity<String> res = restTemplate.postForEntity(
                    PISTON_URL,
                    new HttpEntity<>(body, headers),
                    String.class
            );
            return ResponseEntity.status(res.getStatusCode())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(res.getBody());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body("{\"error\":\"" + e.getMessage() + "\"}");
        }
    }
}

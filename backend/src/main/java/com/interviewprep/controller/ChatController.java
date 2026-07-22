package com.interviewprep.controller;

import com.interviewprep.entity.User;
import com.interviewprep.service.ResumeChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ResumeChatService resumeChatService;

    @PostMapping
    public ResponseEntity<Map<String, String>> chat(@RequestBody Map<String, Object> body,
                                                    @AuthenticationPrincipal User user) {
        Long resumeId = body.get("resumeId") != null
                ? Long.valueOf(body.get("resumeId").toString())
                : null;
        String question = (String) body.get("question");

        if (question == null || question.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "question is required"));
        }

        String answer = resumeChatService.chat(resumeId, question, user);
        return ResponseEntity.ok(Map.of("answer", answer));
    }
}

package com.interviewprep.controller;

import com.interviewprep.dto.GenerateQuestionsRequest;
import com.interviewprep.dto.GenerateQuestionsResponse;
import com.interviewprep.dto.QuestionDto;
import com.interviewprep.entity.PrepSession;
import com.interviewprep.entity.User;
import com.interviewprep.service.CompanyGithubService;
import com.interviewprep.service.QuestionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/questions")
@RequiredArgsConstructor
public class QuestionController {

    private final QuestionService questionService;
    private final CompanyGithubService companyGithubService;

    @PostMapping("/generate")
    public ResponseEntity<GenerateQuestionsResponse> generate(
            @Valid @RequestBody GenerateQuestionsRequest req,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(questionService.generateQuestions(req, user));
    }

    @GetMapping("/session/{sessionId}")
    public ResponseEntity<List<QuestionDto>> getBySession(@PathVariable Long sessionId) {
        return ResponseEntity.ok(questionService.getBySession(sessionId));
    }

    @GetMapping("/sessions")
    public ResponseEntity<List<PrepSession>> getSessions(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(questionService.getAllSessions(user));
    }

    @DeleteMapping("/sessions/{sessionId}")
    public ResponseEntity<Void> deleteSession(@PathVariable Long sessionId,
                                              @AuthenticationPrincipal User user) {
        questionService.deleteSession(sessionId, user);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{questionId}/solution")
    public ResponseEntity<QuestionDto> getSolution(@PathVariable Long questionId) {
        return ResponseEntity.ok(questionService.getSolution(questionId));
    }

    @PostMapping("/{questionId}/feedback")
    public ResponseEntity<java.util.Map<String, String>> getFeedback(
            @PathVariable Long questionId,
            @RequestBody java.util.Map<String, String> body) {
        return ResponseEntity.ok(questionService.getFeedback(questionId, body.get("userAnswer")));
    }

    @PatchMapping("/{questionId}/notes")
    public ResponseEntity<QuestionDto> updateNotes(@PathVariable Long questionId,
                                                    @RequestBody java.util.Map<String, String> body) {
        return ResponseEntity.ok(questionService.updateNotes(questionId, body.get("notes")));
    }

    @GetMapping("/github-companies")
    public ResponseEntity<List<String>> getGithubCompanies() {
        return ResponseEntity.ok(companyGithubService.getCompanyList());
    }

    @GetMapping("/github/{company}")
    public ResponseEntity<List<CompanyGithubService.GithubQuestion>> getGithubQuestions(
            @PathVariable String company) {
        return ResponseEntity.ok(companyGithubService.getQuestionsForCompany(company));
    }
}

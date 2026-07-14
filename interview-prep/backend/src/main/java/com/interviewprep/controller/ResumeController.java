package com.interviewprep.controller;

import com.interviewprep.dto.BuildResumeRequest;
import com.interviewprep.dto.ResumeSuggestionResponse;
import com.interviewprep.dto.ResumeScoreResponse;
import com.interviewprep.entity.Resume;
import com.interviewprep.entity.User;
import com.interviewprep.service.ResumeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/resumes")
@RequiredArgsConstructor
public class ResumeController {

    private final ResumeService resumeService;

    @PostMapping("/upload")
    public ResponseEntity<Resume> upload(@RequestParam("file") MultipartFile file,
                                         @AuthenticationPrincipal User user) throws IOException {
        return ResponseEntity.ok(resumeService.uploadFile(file, user));
    }

    @PostMapping("/text")
    public ResponseEntity<Resume> uploadText(@RequestBody Map<String, String> body,
                                             @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(resumeService.uploadText(body.get("content"), user));
    }

    @PostMapping("/build")
    public ResponseEntity<Resume> build(@RequestBody BuildResumeRequest req,
                                        @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(resumeService.buildResume(req, user));
    }

    @GetMapping
    public ResponseEntity<List<Resume>> getAll(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(resumeService.getAll(user));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Resume> getById(@PathVariable Long id,
                                          @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(resumeService.getById(id, user));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Resume> update(@PathVariable Long id,
                                         @RequestBody Map<String, String> body,
                                         @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(resumeService.update(id, body.get("content"), user));
    }

    @PatchMapping("/{id}/template")
    public ResponseEntity<Resume> updateTemplate(@PathVariable Long id,
                                                 @RequestBody Map<String, String> body,
                                                 @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(resumeService.updateTemplate(id, body.get("templateName"), user));
    }

    @PatchMapping("/{id}/title")
    public ResponseEntity<Resume> updateTitle(@PathVariable Long id,
                                              @RequestBody Map<String, String> body,
                                              @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(resumeService.updateTitle(id, body.get("title"), user));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id,
                                       @AuthenticationPrincipal User user) {
        resumeService.delete(id, user);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/score")
    public ResponseEntity<ResumeScoreResponse> score(@PathVariable Long id,
                                                     @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(resumeService.score(id, user));
    }

    @PostMapping("/{id}/suggestions")
    public ResponseEntity<ResumeSuggestionResponse> suggestions(@PathVariable Long id,
                                                                @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(resumeService.suggestions(id, user));
    }
}

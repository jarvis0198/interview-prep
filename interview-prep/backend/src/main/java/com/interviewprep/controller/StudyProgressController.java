package com.interviewprep.controller;

import com.interviewprep.entity.User;
import com.interviewprep.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Set;

@RestController
@RequestMapping("/api/study")
public class StudyProgressController {

    private final UserRepository userRepository;

    public StudyProgressController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping("/progress")
    public ResponseEntity<Set<String>> getProgress(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(user.getStudyProgress());
    }

    @PostMapping("/progress/toggle")
    public ResponseEntity<Set<String>> toggle(
            @AuthenticationPrincipal User user,
            @RequestBody ToggleRequest req) {
        Set<String> progress = user.getStudyProgress();
        if (progress.contains(req.subtopicId())) {
            progress.remove(req.subtopicId());
        } else {
            progress.add(req.subtopicId());
        }
        userRepository.save(user);
        return ResponseEntity.ok(progress);
    }

    @PostMapping("/progress/reset")
    public ResponseEntity<Set<String>> reset(@AuthenticationPrincipal User user) {
        user.getStudyProgress().clear();
        userRepository.save(user);
        return ResponseEntity.ok(Set.of());
    }

    public record ToggleRequest(String subtopicId) {}
}

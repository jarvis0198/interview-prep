package com.interviewprep.dto;

import java.util.List;

public record ResumeScoreResponse(
        int score,
        String feedback,
        List<String> strengths,
        List<String> improvements
) {}

package com.interviewprep.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record GenerateQuestionsRequest(
        @NotNull Long resumeId,
        @NotBlank String companyName,
        String targetRole
) {}

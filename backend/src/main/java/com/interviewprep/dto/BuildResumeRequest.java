package com.interviewprep.dto;

public record BuildResumeRequest(
        String mode,  // "text" | "json" | "keyvalue" | "regex" | "url"
        String input
) {}

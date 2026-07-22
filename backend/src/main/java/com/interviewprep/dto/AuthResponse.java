package com.interviewprep.dto;

public record AuthResponse(
        String token,
        Long id,
        String username,
        String email
) {}

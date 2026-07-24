package com.interviewprep.dto;

import com.interviewprep.entity.PrepSession;

import java.time.LocalDateTime;

public record SessionSummaryDto(
        Long id,
        String companyName,
        String targetRole,
        Long resumeId,
        LocalDateTime createdAt,
        long oaCount,
        long interviewCount
) {
    public static SessionSummaryDto from(PrepSession s, long oaCount, long interviewCount) {
        return new SessionSummaryDto(
                s.getId(),
                s.getCompanyName(),
                s.getTargetRole(),
                s.getResumeId(),
                s.getCreatedAt(),
                oaCount,
                interviewCount
        );
    }
}

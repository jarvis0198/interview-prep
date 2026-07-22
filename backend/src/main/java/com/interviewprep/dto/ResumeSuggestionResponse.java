package com.interviewprep.dto;

import java.util.List;
import java.util.Map;

public record ResumeSuggestionResponse(
        Map<String, List<String>> sectionSuggestions,
        String overallTip
) {}

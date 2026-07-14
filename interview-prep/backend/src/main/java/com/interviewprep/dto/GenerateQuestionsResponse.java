package com.interviewprep.dto;

import java.util.List;

public record GenerateQuestionsResponse(
        Long sessionId,
        List<QuestionDto> oaQuestions,
        List<QuestionDto> interviewQuestions
) {}

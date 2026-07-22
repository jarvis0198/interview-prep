package com.interviewprep.dto;

import com.interviewprep.entity.Question;

public record QuestionDto(
        Long id,
        Question.QuestionType type,
        String category,
        String questionText,
        String difficulty,
        String hint,
        String solution,
        Long sessionId
) {
    public static QuestionDto from(Question q) {
        return new QuestionDto(
                q.getId(),
                q.getType(),
                q.getCategory(),
                q.getQuestionText(),
                q.getDifficulty(),
                q.getHint(),
                q.getSolution(),
                q.getSession().getId()
        );
    }
}

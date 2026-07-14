package com.interviewprep.repository;

import com.interviewprep.entity.Question;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface QuestionRepository extends JpaRepository<Question, Long> {
    List<Question> findBySessionId(Long sessionId);
    List<Question> findBySessionIdAndType(Long sessionId, Question.QuestionType type);
}

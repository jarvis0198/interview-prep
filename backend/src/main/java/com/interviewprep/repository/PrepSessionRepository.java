package com.interviewprep.repository;

import com.interviewprep.entity.PrepSession;
import com.interviewprep.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PrepSessionRepository extends JpaRepository<PrepSession, Long> {
    List<PrepSession> findAllByOrderByCreatedAtDesc();
    List<PrepSession> findByResumeUserOrderByCreatedAtDesc(User user);

    @Query("SELECT ps FROM PrepSession ps JOIN FETCH ps.resume r JOIN FETCH r.user WHERE ps.id = :id")
    Optional<PrepSession> findByIdWithUser(@Param("id") Long id);
}

package com.example.issuetracker.repository;

import com.example.issuetracker.model.Issue;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface IssueRepository extends JpaRepository<Issue, Long> {
    List<Issue> findAllByOrderByIdDesc();
    List<Issue> findAllByStatusId(Long statusId);
    List<Issue> findByCreatedBy(com.example.issuetracker.model.User user);
    List<Issue> findByAssignedTo(com.example.issuetracker.model.User user);
}

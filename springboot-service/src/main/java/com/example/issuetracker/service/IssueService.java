package com.example.issuetracker.service;

import com.example.issuetracker.client.FastApiClient;
import com.example.issuetracker.dto.CommentDto;
import com.example.issuetracker.dto.LogDto;
import com.example.issuetracker.dto.SearchResponseDto;
import com.example.issuetracker.model.Issue;
import com.example.issuetracker.repository.IssueRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class IssueService {

    private final IssueRepository issueRepository;
    private final FastApiClient fastApiClient;

    public IssueService(IssueRepository issueRepository, FastApiClient fastApiClient) {
        this.issueRepository = issueRepository;
        this.fastApiClient = fastApiClient;
    }

    public List<Issue> getAllIssues() {
        return issueRepository.findAllByOrderByIdDesc();
    }

    public Optional<Issue> getIssueById(Long id) {
        return issueRepository.findById(id);
    }

    @Transactional
    public Issue createIssue(Issue issue) {
        Issue savedIssue = issueRepository.save(issue);
        
        // Index issue description and title in FastAPI for vector search
        String indexText = savedIssue.getTitle() + " " + savedIssue.getDescription();
        fastApiClient.indexIssue(savedIssue.getId(), indexText);

        // Write activity log to FastAPI (MongoDB)
        String creatorName = savedIssue.getCreatedBy() != null ? savedIssue.getCreatedBy().getUsername() : "System";
        LogDto logDto = LogDto.builder()
                .issue_id(savedIssue.getId())
                .action("CREATED")
                .details("Issue created with status " + savedIssue.getStatus().getName())
                .performed_by(creatorName)
                .build();
        fastApiClient.addLog(logDto);

        return savedIssue;
    }

    @Transactional
    public Issue updateIssue(Long id, Issue issueDetails, String updaterUsername) {
        Issue issue = issueRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Issue not found for id: " + id));

        StringBuilder logDetails = new StringBuilder("Issue updated:");
        boolean needsReindex = false;

        if (!issue.getTitle().equals(issueDetails.getTitle())) {
            logDetails.append(" Title changed.");
            issue.setTitle(issueDetails.getTitle());
            needsReindex = true;
        }

        if (!issue.getDescription().equals(issueDetails.getDescription())) {
            logDetails.append(" Description changed.");
            issue.setDescription(issueDetails.getDescription());
            needsReindex = true;
        }

        if (!issue.getStatus().getId().equals(issueDetails.getStatus().getId())) {
            logDetails.append(" Status changed from ")
                    .append(issue.getStatus().getName())
                    .append(" to ")
                    .append(issueDetails.getStatus().getName())
                    .append(".");
            issue.setStatus(issueDetails.getStatus());
        }

        if ((issue.getAssignedTo() == null && issueDetails.getAssignedTo() != null) ||
            (issue.getAssignedTo() != null && issueDetails.getAssignedTo() == null) ||
            (issue.getAssignedTo() != null && issueDetails.getAssignedTo() != null && 
             !issue.getAssignedTo().getId().equals(issueDetails.getAssignedTo().getId()))) {
            
            String oldAssignee = issue.getAssignedTo() != null ? issue.getAssignedTo().getUsername() : "Unassigned";
            String newAssignee = issueDetails.getAssignedTo() != null ? issueDetails.getAssignedTo().getUsername() : "Unassigned";
            logDetails.append(" Assignee changed from ").append(oldAssignee).append(" to ").append(newAssignee).append(".");
            issue.setAssignedTo(issueDetails.getAssignedTo());
        }

        Issue updatedIssue = issueRepository.save(issue);

        // Reindex if title/description changed
        if (needsReindex) {
            String indexText = updatedIssue.getTitle() + " " + updatedIssue.getDescription();
            fastApiClient.indexIssue(updatedIssue.getId(), indexText);
        }

        // Log the update action
        LogDto logDto = LogDto.builder()
                .issue_id(updatedIssue.getId())
                .action("UPDATED")
                .details(logDetails.toString())
                .performed_by(updaterUsername != null ? updaterUsername : "System")
                .build();
        fastApiClient.addLog(logDto);

        return updatedIssue;
    }

    @Transactional
    public void deleteIssue(Long id) {
        Issue issue = issueRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Issue not found for id: " + id));
        issueRepository.delete(issue);
        
        // Log delete (since it's deleted, we can store a log indicating deletion, but the issue itself is gone in SQL)
        LogDto logDto = LogDto.builder()
                .issue_id(id)
                .action("DELETED")
                .details("Issue deleted from database")
                .performed_by("System")
                .build();
        fastApiClient.addLog(logDto);
    }

    public List<Map<String, Object>> searchIssues(String query) {
        // Query FastAPI for ranked search results
        List<SearchResponseDto> hits = fastApiClient.searchIssues(query, 20);
        if (hits.isEmpty()) {
            return List.of();
        }

        // Gather issue IDs and their scores
        Map<Long, Double> scores = hits.stream()
                .collect(Collectors.toMap(SearchResponseDto::getIssue_id, SearchResponseDto::getScore, (a, b) -> a));

        // Fetch corresponding issues from database
        List<Issue> issues = issueRepository.findAllById(scores.keySet());

        // Construct search hit containing the issue object and the matching score
        List<Map<String, Object>> results = new ArrayList<>();
        for (Issue issue : issues) {
            Map<String, Object> hit = new HashMap<>();
            hit.put("issue", issue);
            hit.put("score", scores.get(issue.getId()));
            results.add(hit);
        }

        // Sort results by similarity score descending
        results.sort((a, b) -> Double.compare((Double) b.get("score"), (Double) a.get("score")));
        return results;
    }

    // Comment Proxy operations
    public CommentDto addComment(Long issueId, CommentDto commentDto) {
        commentDto.setIssue_id(issueId);
        CommentDto savedComment = fastApiClient.addComment(commentDto);
        
        // Log that a comment was added
        LogDto logDto = LogDto.builder()
                .issue_id(issueId)
                .action("COMMENT_ADDED")
                .details("Comment added by " + commentDto.getAuthor())
                .performed_by(commentDto.getAuthor())
                .build();
        fastApiClient.addLog(logDto);
        
        return savedComment;
    }

    public List<CommentDto> getComments(Long issueId) {
        return fastApiClient.getComments(issueId);
    }

    // Activity Log operations
    public List<LogDto> getLogs(Long issueId) {
        return fastApiClient.getLogs(issueId);
    }

    public List<LogDto> getAllLogs() {
        return fastApiClient.getAllLogs();
    }
}

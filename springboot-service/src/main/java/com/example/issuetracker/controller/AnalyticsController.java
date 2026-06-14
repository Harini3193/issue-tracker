package com.example.issuetracker.controller;

import com.example.issuetracker.model.Issue;
import com.example.issuetracker.service.IssueService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {

    private final IssueService issueService;

    public AnalyticsController(IssueService issueService) {
        this.issueService = issueService;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> getAnalytics() {
        List<Issue> allIssues = issueService.getAllIssues();
        
        long totalIssues = allIssues.size();
        long openIssues = allIssues.stream()
                .filter(i -> i.getStatus().getName().equalsIgnoreCase("OPEN"))
                .count();
        long resolvedIssues = allIssues.stream()
                .filter(i -> i.getStatus().getName().equalsIgnoreCase("RESOLVED") || 
                             i.getStatus().getName().equalsIgnoreCase("CLOSED"))
                .count();
        
        Map<String, Long> issuesByCategory = allIssues.stream()
                .filter(i -> i.getCategory() != null)
                .collect(Collectors.groupingBy(Issue::getCategory, Collectors.counting()));
                
        Map<String, Long> issuesByStatus = allIssues.stream()
                .filter(i -> i.getStatus() != null)
                .collect(Collectors.groupingBy(i -> i.getStatus().getName(), Collectors.counting()));
                
        Map<String, Long> engineerPerformance = allIssues.stream()
                .filter(i -> i.getAssignedTo() != null && i.getStatus().getName().equalsIgnoreCase("RESOLVED"))
                .collect(Collectors.groupingBy(i -> i.getAssignedTo().getUsername(), Collectors.counting()));

        Map<String, Object> analytics = new HashMap<>();
        analytics.put("totalIssues", totalIssues);
        analytics.put("openIssues", openIssues);
        analytics.put("resolvedIssues", resolvedIssues);
        analytics.put("issuesByCategory", issuesByCategory);
        analytics.put("issuesByStatus", issuesByStatus);
        analytics.put("engineerPerformance", engineerPerformance);
        
        return ResponseEntity.ok(analytics);
    }
}

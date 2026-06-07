package com.example.issuetracker.client;

import com.example.issuetracker.dto.CommentDto;
import com.example.issuetracker.dto.LogDto;
import com.example.issuetracker.dto.SearchResponseDto;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class FastApiClient {

    private final RestClient restClient;

    public FastApiClient(@Value("${fastapi.service.url:http://localhost:8000}") String fastApiUrl) {
        this.restClient = RestClient.builder()
                .baseUrl(fastApiUrl)
                .build();
    }

    public void indexIssue(Long issueId, String text) {
        Map<String, Object> body = new HashMap<>();
        body.put("issue_id", issueId);
        body.put("text", text);

        java.util.concurrent.CompletableFuture.runAsync(() -> {
            try {
                restClient.post()
                        .uri("/api/embeddings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(body)
                        .retrieve()
                        .toBodilessEntity();
            } catch (Exception e) {
                System.err.println("Failed to index issue in FastAPI: " + e.getMessage());
            }
        });
    }

    public List<SearchResponseDto> searchIssues(String query, int limit) {
        try {
            return restClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/api/search")
                            .queryParam("query", query)
                            .queryParam("limit", limit)
                            .build())
                    .retrieve()
                    .body(new ParameterizedTypeReference<List<SearchResponseDto>>() {});
        } catch (Exception e) {
            System.err.println("Failed to perform vector search in FastAPI: " + e.getMessage());
            return List.of();
        }
    }

    public CommentDto addComment(CommentDto commentDto) {
        try {
            return restClient.post()
                    .uri("/api/comments")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(commentDto)
                    .retrieve()
                    .body(CommentDto.class);
        } catch (Exception e) {
            System.err.println("Failed to add comment in FastAPI: " + e.getMessage());
            return null;
        }
    }

    public List<CommentDto> getComments(Long issueId) {
        try {
            return restClient.get()
                    .uri("/api/comments/" + issueId)
                    .retrieve()
                    .body(new ParameterizedTypeReference<List<CommentDto>>() {});
        } catch (Exception e) {
            System.err.println("Failed to get comments from FastAPI: " + e.getMessage());
            return List.of();
        }
    }

    public void addLog(LogDto logDto) {
        java.util.concurrent.CompletableFuture.runAsync(() -> {
            try {
                restClient.post()
                        .uri("/api/logs")
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(logDto)
                        .retrieve()
                        .toBodilessEntity();
            } catch (Exception e) {
                System.err.println("Failed to write log in FastAPI: " + e.getMessage());
            }
        });
    }

    public List<LogDto> getLogs(Long issueId) {
        try {
            return restClient.get()
                    .uri("/api/logs/" + issueId)
                    .retrieve()
                    .body(new ParameterizedTypeReference<List<LogDto>>() {});
        } catch (Exception e) {
            System.err.println("Failed to get logs from FastAPI: " + e.getMessage());
            return List.of();
        }
    }

    public List<LogDto> getAllLogs() {
        try {
            return restClient.get()
                    .uri("/api/logs")
                    .retrieve()
                    .body(new ParameterizedTypeReference<List<LogDto>>() {});
        } catch (Exception e) {
            System.err.println("Failed to get all logs from FastAPI: " + e.getMessage());
            return List.of();
        }
    }
}

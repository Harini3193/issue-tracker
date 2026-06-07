package com.example.issuetracker.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CommentDto {
    private Long issue_id; // Maps to fastapi comment field issue_id
    private String author;
    private String content;
    private String created_at;
}

package com.example.issuetracker.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LogDto {
    private Long issue_id;
    private String action;
    private String details;
    private String performed_by;
    private String created_at;
}

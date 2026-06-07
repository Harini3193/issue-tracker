package com.example.issuetracker.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "status")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Status {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name; // e.g., OPEN, IN_PROGRESS, RESOLVED, CLOSED

    @Column(nullable = false)
    private String color; // hex color code or class name for CSS styling
}

package com.example.issuetracker.controller;

import com.example.issuetracker.model.Status;
import com.example.issuetracker.repository.StatusRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/status")
public class StatusController {

    private final StatusRepository statusRepository;

    public StatusController(StatusRepository statusRepository) {
        this.statusRepository = statusRepository;
    }

    @GetMapping
    public List<Status> getAllStatuses() {
        return statusRepository.findAll();
    }
}

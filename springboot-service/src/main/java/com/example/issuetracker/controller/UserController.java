package com.example.issuetracker.controller;

import com.example.issuetracker.model.User;
import com.example.issuetracker.repository.UserRepository;
import com.example.issuetracker.security.JwtUtils;
import com.example.issuetracker.security.UserDetailsImpl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository userRepository;
    private final AuthenticationManager authenticationManager;
    private final JwtUtils jwtUtils;
    private final PasswordEncoder passwordEncoder;
    private final com.example.issuetracker.repository.IssueRepository issueRepository;

    public UserController(UserRepository userRepository, AuthenticationManager authenticationManager, JwtUtils jwtUtils, PasswordEncoder passwordEncoder, com.example.issuetracker.repository.IssueRepository issueRepository) {
        this.userRepository = userRepository;
        this.authenticationManager = authenticationManager;
        this.jwtUtils = jwtUtils;
        this.passwordEncoder = passwordEncoder;
        this.issueRepository = issueRepository;
    }

    @GetMapping
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    @PostMapping("/signup")
    public ResponseEntity<?> signup(@RequestBody User user) {
        if (userRepository.findByUsername(user.getUsername()).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Username already exists"));
        }
        
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        if (user.getRole() == null || user.getRole().isEmpty()) {
            user.setRole("USER");
        }
        
        User saved = userRepository.save(user);
        saved.setPassword(null); // Don't return password
        return ResponseEntity.ok(saved);
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> credentials) {
        String username = credentials.get("username");
        String password = credentials.get("password");

        if (username == null || password == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Username and password are required"));
        }

        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(username, password));

            SecurityContextHolder.getContext().setAuthentication(authentication);
            String jwt = jwtUtils.generateJwtToken(authentication);

            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            List<String> roles = userDetails.getAuthorities().stream()
                    .map(item -> item.getAuthority())
                    .collect(Collectors.toList());

            return ResponseEntity.ok(Map.of(
                    "token", jwt,
                    "id", userDetails.getId(),
                    "username", userDetails.getUsername(),
                    "email", userDetails.getEmail(),
                    "roles", roles
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Invalid username or password"));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateUserProfile(@PathVariable Long id, @RequestBody Map<String, String> updates) {
        return userRepository.findById(id).map(user -> {
            if (updates.containsKey("email")) {
                user.setEmail(updates.get("email"));
            }
            if (updates.containsKey("username")) {
                user.setUsername(updates.get("username"));
            }
            if (updates.containsKey("password") && !updates.get("password").isEmpty()) {
                user.setPassword(passwordEncoder.encode(updates.get("password")));
            }
            User updatedUser = userRepository.save(user);
            updatedUser.setPassword(null);
            return ResponseEntity.ok(updatedUser);
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        if (!userRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        
        User userToDelete = userRepository.findById(id).get();
        
        // Find all issues created by this user and reassign them to admin (user id 1)
        List<com.example.issuetracker.model.Issue> createdIssues = issueRepository.findByCreatedBy(userToDelete);
        User admin = userRepository.findById(1L).orElse(null);
        if (admin != null) {
            for (com.example.issuetracker.model.Issue issue : createdIssues) {
                issue.setCreatedBy(admin);
                issueRepository.save(issue);
            }
        }
        
        // Find all issues assigned to this user and set to null
        List<com.example.issuetracker.model.Issue> assignedIssues = issueRepository.findByAssignedTo(userToDelete);
        for (com.example.issuetracker.model.Issue issue : assignedIssues) {
            issue.setAssignedTo(null);
            issueRepository.save(issue);
        }

        userRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "User deleted successfully"));
    }
}

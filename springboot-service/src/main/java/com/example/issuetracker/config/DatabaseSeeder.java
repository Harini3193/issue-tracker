package com.example.issuetracker.config;

import com.example.issuetracker.model.Issue;
import com.example.issuetracker.model.Status;
import com.example.issuetracker.model.User;
import com.example.issuetracker.repository.StatusRepository;
import com.example.issuetracker.repository.UserRepository;
import com.example.issuetracker.repository.IssueRepository;
import com.example.issuetracker.service.IssueService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class DatabaseSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final StatusRepository statusRepository;
    private final IssueRepository issueRepository;
    private final IssueService issueService;

    public DatabaseSeeder(UserRepository userRepository, 
                          StatusRepository statusRepository, 
                          IssueRepository issueRepository,
                          IssueService issueService) {
        this.userRepository = userRepository;
        this.statusRepository = statusRepository;
        this.issueRepository = issueRepository;
        this.issueService = issueService;
    }

    @Override
    public void run(String... args) throws Exception {
        if (userRepository.count() > 0) {
            return; // DB already seeded
        }

        System.out.println("Seeding database...");

        // 1. Seed Users
        User admin = User.builder().username("admin").email("admin@example.com").password("password123").role("Admin").build();
        User john = User.builder().username("john_dev").email("john@example.com").password("password123").role("Developer").build();
        User sarah = User.builder().username("sarah_dev").email("sarah@example.com").password("password123").role("Developer").build();
        User mike = User.builder().username("mike_sub").email("mike@example.com").password("password123").role("Submitter").build();

        userRepository.save(admin);
        userRepository.save(john);
        userRepository.save(sarah);
        userRepository.save(mike);

        // 2. Seed Statuses
        Status open = Status.builder().name("OPEN").color("#3b82f6").build(); // blue
        Status inProgress = Status.builder().name("IN_PROGRESS").color("#eab308").build(); // yellow
        Status resolved = Status.builder().name("RESOLVED").color("#22c55e").build(); // green
        Status closed = Status.builder().name("CLOSED").color("#6b7280").build(); // gray

        statusRepository.save(open);
        statusRepository.save(inProgress);
        statusRepository.save(resolved);
        statusRepository.save(closed);

        // 3. Seed Issues (using service so it indexes in FastAPI vector store)
        Issue issue1 = Issue.builder()
                .title("Login failure on dashboard")
                .description("Users report a 500 error when attempting to log in via Google OAuth. Token verification is failing because of a public key mismatch.")
                .status(open)
                .createdBy(mike)
                .assignedTo(john)
                .build();

        Issue issue2 = Issue.builder()
                .title("Payment processing timeout during checkout")
                .description("The UI freezes on Stripe checkout. Backend logs show gateway timeouts and socket leaks under high concurrent load.")
                .status(inProgress)
                .createdBy(mike)
                .assignedTo(sarah)
                .build();

        Issue issue3 = Issue.builder()
                .title("Memory leak in background runner process")
                .description("Node.js background workers consume RAM linearly. It appears database client pools are not closing database connections properly.")
                .status(open)
                .createdBy(admin)
                .assignedTo(john)
                .build();

        Issue issue4 = Issue.builder()
                .title("Broken links on onboarding docs page")
                .description("Onboarding manuals contain outdated links directing to old API endpoints (v1 routes instead of v2 routes). Need updating.")
                .status(resolved)
                .createdBy(mike)
                .assignedTo(sarah)
                .build();

        // Save issues through issueService to index them and log creation in FastAPI
        issueService.createIssue(issue1);
        issueService.createIssue(issue2);
        issueService.createIssue(issue3);
        issueService.createIssue(issue4);

        System.out.println("Database seeding completed! Seeded 4 users, 4 statuses, and 4 issues.");
    }
}

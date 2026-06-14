package com.example.issuetracker.service;

import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class EmailService {
    
    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);

    public void sendEmail(String to, String subject, String body) {
        logger.info("\n======================================\n" +
                    "MOCK EMAIL SENT\n" +
                    "To: " + to + "\n" +
                    "Subject: " + subject + "\n" +
                    "Body:\n" + body + "\n" +
                    "======================================");
    }
}

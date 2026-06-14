# Issue Tracker Microservices Dashboard

This is a full-stack Issue Tracking Dashboard built with microservices architecture.

## Architecture
- **API Gateway**: FastAPI handles routing and semantic search.
- **Spring Boot Backend**: Manages users, issues, statuses, and role-based access control via PostgreSQL.
- **Node.js Backend**: Manages logs and real-time comments using MongoDB.
- **Frontend**: React/Vite dashboard.

## How to Run
Simply double-click the `start_services.bat` script to start all four services simultaneously in separate windows.

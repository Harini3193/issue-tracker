@echo off
echo Starting all services...

echo Starting Spring Boot Backend...
start "Spring Boot Backend" cmd /k "cd /d %~dp0springboot-service && mvnw.cmd spring-boot:run"

echo Starting FastAPI Service...
start "FastAPI Service" cmd /k "cd /d %~dp0fastapi-service && call venv\Scripts\activate.bat && uvicorn main:app --reload"

echo Starting Frontend...
start "Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo Starting Node.js Service...
start "Node.js Service" cmd /k "cd /d %~dp0nodejs-service && node server.js"

echo.
echo All services have been started in separate windows! 
echo You can now safely close Antigravity and the services will remain running.
echo To stop the services, simply close the four new command prompt windows that opened.
pause

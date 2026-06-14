@echo off
echo Installing secure tunneling service...
call npm install -g localtunnel
echo.
echo Creating your public URL...
echo Please wait a few seconds. When the URL appears, copy it and share it with your friend!
echo (Keep this window open to keep the connection alive)
echo.
call lt --port 5173
pause

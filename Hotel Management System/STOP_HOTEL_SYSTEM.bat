@echo off
title Stop Hotel Management System
cd /d "%~dp0"

echo =====================================================================
echo         STOPPING THE ROYAL ORCHID HOTEL MANAGEMENT SYSTEM
echo =====================================================================
echo.

set FOUND=0
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do (
    set FOUND=1
    echo Stopping server process on port 3000 (PID: %%a)...
    taskkill /F /PID %%a >nul 2>&1
)

if "%FOUND%"=="1" (
    echo.
    echo [SUCCESS] Hotel Management System server has been stopped.
) else (
    echo [INFO] No active server found running on port 3000.
)

echo.
timeout /t 3
exit /b

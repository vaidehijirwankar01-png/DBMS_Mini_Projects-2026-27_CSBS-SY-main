@echo off
title The Royal Orchid Hotel Management System
cd /d "%~dp0"

:: Ensure Node is available
set PATH=C:\nodejs;%PATH%

echo =====================================================================
echo           THE ROYAL ORCHID - HOTEL MANAGEMENT SYSTEM
echo =====================================================================
echo.

:: Check if port 3000 is already in use
netstat -ano | findstr :3000 | findstr LISTENING >nul
if %ERRORLEVEL% EQU 0 (
    echo [INFO] Server is already running on http://localhost:3000
    echo [INFO] Opening web browser automatically...
    start http://localhost:3000
    echo.
    echo Press any key to close this launcher window (server remains active)...
    pause >nul
    exit /b
)

echo [1/2] Starting Node.js backend server...
start /b "" node server.js

:: Wait 1.5 seconds for server to bind port
timeout /t 2 /nobreak >nul

echo [2/2] Launching web browser at http://localhost:3000 ...
start http://localhost:3000

echo.
echo =====================================================================
echo   Hotel Management System is now running!
echo   Website: http://localhost:3000
echo.
echo   To stop the server:
echo   - Click the "Stop Server" button in the website top-right, OR
echo   - Double-click STOP_HOTEL_SYSTEM.bat
echo =====================================================================
echo.
echo (You can minimize this window. Press any key to exit this launcher).
pause >nul

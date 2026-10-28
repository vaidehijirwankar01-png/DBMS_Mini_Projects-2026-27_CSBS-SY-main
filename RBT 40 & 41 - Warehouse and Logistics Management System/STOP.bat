@echo off
title Stop LogistiX Hub
color 0C
echo =====================================================
echo   Stopping LogistiX Hub...
echo =====================================================
echo.

REM Kill node processes on port 5000
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5000"') do (
  echo Killing process %%a on port 5000...
  taskkill /PID %%a /F >nul 2>&1
)

REM Also kill any stray node.exe processes (optional safety net)
taskkill /IM node.exe /F >nul 2>&1

echo.
echo All server processes stopped.
echo =====================================================
echo.
pause

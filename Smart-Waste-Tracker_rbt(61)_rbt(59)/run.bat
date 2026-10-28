@echo off
title Smart Waste Collection ^& Segregation Tracker
color 0A

echo =====================================================================
echo   Smart Waste Collection ^& Segregation Tracker Launcher
echo =====================================================================
echo.

:: Check Python installation
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Python was not found in your system PATH.
    echo Please install Python 3.10+ from https://www.python.org/
    pause
    exit /b 1
)

:: Run the direct Python launcher
python run.py

pause


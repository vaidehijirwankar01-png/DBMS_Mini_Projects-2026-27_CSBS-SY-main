@echo off
REM ============================================================================
REM Hospital Management System - Automated MySQL Execution Batch Script
REM ============================================================================

set MYSQL_EXE="C:\Program Files\MySQL\MySQL Server 26.7\bin\mysql.exe"

if not exist %MYSQL_EXE% (
    echo [ERROR] MySQL binary not found at %MYSQL_EXE%.
    echo Please ensure MySQL Server is installed.
    pause
    exit /b 1
)

echo ============================================================================
echo   Antigravity DBMS Mini Project: Hospital Management System
echo ============================================================================
echo.
set /p DB_USER="Enter MySQL Username [default: root]: " || set DB_USER=root
if "%DB_USER%"=="" set DB_USER=root

echo.
echo Executing master database deployment script (run_all.sql)...
%MYSQL_EXE% -u %DB_USER% -p < "%~dp0run_all.sql"

if %ERRORLEVEL% equ 0 (
    echo.
    echo [SUCCESS] Database schema, seed data, views, procedures, functions,
    echo           and triggers have been deployed successfully!
    echo.
) else (
    echo.
    echo [ERROR] Execution failed. Please verify credentials or SQL errors.
)

pause

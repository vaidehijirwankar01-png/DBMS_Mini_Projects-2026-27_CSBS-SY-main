@echo off
title LogistiX Hub - Warehouse Management System
color 0A
cls

echo =====================================================
echo   LogistiX Hub - Warehouse ^& Logistics System
echo =====================================================
echo.

cd /d "%~dp0"

REM ---- Check Node.js ----
where node >nul 2>&1
if %errorlevel% neq 0 (
  echo [ERROR] Node.js is not installed or not in PATH.
  echo         Download from: https://nodejs.org
  pause
  exit /b 1
)

REM ---- Install backend dependencies if needed ----
if not exist "backend\node_modules" (
  echo [1/3] Installing backend dependencies...
  cd backend
  npm install --silent
  cd ..
  echo       Done.
) else (
  echo [1/3] Backend dependencies OK.
)

REM ---- Build frontend if dist is missing ----
if not exist "frontend\dist\index.html" (
  echo [2/3] Building frontend ^(first time setup^)...
  cd frontend
  if not exist "node_modules" (
    npm install --silent
  )
  npm run build
  cd ..
  echo       Build complete.
) else (
  echo [2/3] Frontend build OK.
)

REM ---- Start backend server in a new window ----
echo [3/3] Starting backend server...
start "LogistiX Hub - Backend Server" cmd /k "cd /d %~dp0backend && echo. && echo  LogistiX Hub Backend Running && echo  API: http://localhost:5000/api && echo  App: http://localhost:5000 && echo. && echo  Press Ctrl+C to stop. && echo. && node server.js"

REM ---- Wait for server to boot ----
echo.
echo Waiting for server to start...
timeout /t 3 /nobreak >nul

REM ---- Open in browser ----
echo Opening http://localhost:5000 in your browser...
start http://localhost:5000

echo.
echo =====================================================
echo   App is running at: http://localhost:5000
echo   To STOP the server: close the backend window
echo              OR run: STOP.bat
echo =====================================================
echo.
pause

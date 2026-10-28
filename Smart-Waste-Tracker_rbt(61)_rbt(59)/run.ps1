# Smart Waste Collection & Segregation Tracker - PowerShell Launcher
Write-Host "=====================================================================" -ForegroundColor Green
Write-Host "  Smart Waste Collection & Segregation Tracker Launcher" -ForegroundColor Green
Write-Host "=====================================================================" -ForegroundColor Green
Write-Host ""

if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Python was not found in your system PATH." -ForegroundColor Red
    Write-Host "Please install Python 3.10+ from https://www.python.org/"
    pause
    exit 1
}

python run.py


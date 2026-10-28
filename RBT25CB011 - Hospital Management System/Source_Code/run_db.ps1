# ============================================================================
# Hospital Management System - Automated MySQL Execution PowerShell Script
# ============================================================================

$mysqlPaths = @(
    "C:\Program Files\MySQL\MySQL Server 26.7\bin\mysql.exe",
    "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe",
    (Get-Command mysql -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source)
)

$mysqlExe = $mysqlPaths | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1

if (-not $mysqlExe) {
    Write-Error "MySQL binary not found. Please install MySQL Server or ensure mysql.exe is in PATH."
    exit 1
}

Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "   Antigravity DBMS Mini Project: Hospital Management System" -ForegroundColor Cyan
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "Using MySQL executable at: $mysqlExe`n" -ForegroundColor Gray

$dbUser = Read-Host "Enter MySQL Username [default: root]"
if ([string]::IsNullOrWhiteSpace($dbUser)) { $dbUser = "root" }

$scriptPath = Join-Path $PSScriptRoot "run_all.sql"
Write-Host "`nExecuting master script: $scriptPath ..." -ForegroundColor Yellow

& $mysqlExe -u $dbUser -p --default-character-set=utf8mb4 -e "source $scriptPath"

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n[SUCCESS] hospital_db deployed successfully!" -ForegroundColor Green
} else {
    Write-Host "`n[ERROR] Database deployment exited with code $LASTEXITCODE." -ForegroundColor Red
}

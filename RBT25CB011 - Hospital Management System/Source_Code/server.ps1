# ============================================================================
# Hospital Management System - PowerShell Lightweight REST API & Web Server
# Serves http://localhost:8080 and connects directly to MySQL hospital_db
# ============================================================================

$port = 8080
$mysqlExe = "C:\Program Files\MySQL\MySQL Server 26.7\bin\mysql.exe"
$env:MYSQL_PWD = "123456789"
$rootDir = Join-Path $PSScriptRoot "public"

function Run-MySQLQuery([string]$query) {
    try {
        $tsv = & $mysqlExe -u root hospital_db --default-character-set=utf8mb4 -B -e $query 2>&1
        if ($LASTEXITCODE -ne 0) {
            return @{ error = ($tsv -join "`n") }
        }
        if (-not $tsv) {
            return @()
        }
        $objects = @($tsv | ConvertFrom-Csv -Delimiter "`t")
        return $objects
    } catch {
        return @{ error = $_.Exception.Message }
    }
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()
Write-Host "Hospital Management System Server running at http://localhost:$port/" -ForegroundColor Green

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        # CORS Headers
        $response.AddHeader("Access-Control-Allow-Origin", "*")
        $response.AddHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        $response.AddHeader("Access-Control-Allow-Headers", "Content-Type")

        if ($request.HttpMethod -eq "OPTIONS") {
            $response.StatusCode = 200
            $response.Close()
            continue
        }

        $path = $request.Url.AbsolutePath
        $method = $request.HttpMethod

        # Helper to read JSON request body
        $bodyJson = $null
        if ($request.HasEntityBody) {
            $reader = New-Object System.IO.StreamReader($request.InputStream, $request.ContentEncoding)
            $bodyStr = $reader.ReadToEnd()
            $reader.Close()
            if ($bodyStr) {
                try { $bodyJson = $bodyStr | ConvertFrom-Json } catch {}
            }
        }

        # Route matching
        if ($method -eq "GET" -and ($path -eq "/" -or $path -eq "/index.html")) {
            $filePath = Join-Path $rootDir "index.html"
            $content = [System.IO.File]::ReadAllBytes($filePath)
            $response.ContentType = "text/html; charset=utf-8"
            $response.OutputStream.Write($content, 0, $content.Length)
        }
        elseif ($method -eq "GET" -and $path -eq "/style.css") {
            $filePath = Join-Path $rootDir "style.css"
            $content = [System.IO.File]::ReadAllBytes($filePath)
            $response.ContentType = "text/css; charset=utf-8"
            $response.OutputStream.Write($content, 0, $content.Length)
        }
        elseif ($method -eq "GET" -and $path -eq "/app.js") {
            $filePath = Join-Path $rootDir "app.js"
            $content = [System.IO.File]::ReadAllBytes($filePath)
            $response.ContentType = "application/javascript; charset=utf-8"
            $response.OutputStream.Write($content, 0, $content.Length)
        }
        # --- API ENDPOINTS ---
        elseif ($method -eq "GET" -and $path -eq "/api/stats") {
            $res = Run-MySQLQuery @"
SELECT 
    (SELECT COUNT(*) FROM doctor) AS total_doctors,
    (SELECT COUNT(*) FROM patient) AS total_patients,
    (SELECT COUNT(*) FROM appointment) AS total_appointments,
    (SELECT COUNT(*) FROM room) AS total_rooms,
    (SELECT COUNT(*) FROM room WHERE availability = 'Occupied') AS occupied_rooms,
    (SELECT IFNULL(SUM(amount), 0.00) FROM bill WHERE payment_status = 'Paid') AS total_paid_revenue,
    (SELECT fn_get_department_total_revenue(1)) AS cardiology_revenue;
"@
            $json = $res | ConvertTo-Json -Depth 5
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
            $response.ContentType = "application/json; charset=utf-8"
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        }
        elseif ($method -eq "GET" -and $path -eq "/api/departments") {
            $res = Run-MySQLQuery "SELECT * FROM department ORDER BY department_id;"
            $json = $res | ConvertTo-Json -Depth 5
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
            $response.ContentType = "application/json; charset=utf-8"
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        }
        elseif ($method -eq "GET" -and $path -eq "/api/doctors") {
            $res = Run-MySQLQuery @"
SELECT d.doctor_id, d.name, d.specialization, d.phone_no, d.salary, d.experience, dept.department_name, dept.floor
FROM doctor d
JOIN department dept ON d.department_id = dept.department_id
ORDER BY d.doctor_id;
"@
            $json = $res | ConvertTo-Json -Depth 5
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
            $response.ContentType = "application/json; charset=utf-8"
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        }
        elseif ($method -eq "GET" -and $path -eq "/api/patients") {
            $res = Run-MySQLQuery @"
SELECT p.patient_id, p.name, p.age, p.gender, p.phone_no, p.address, p.room_no, r.room_type, p.created_at
FROM patient p
LEFT JOIN room r ON p.room_no = r.room_no
ORDER BY p.patient_id DESC;
"@
            $json = $res | ConvertTo-Json -Depth 5
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
            $response.ContentType = "application/json; charset=utf-8"
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        }
        elseif ($method -eq "GET" -and $path -eq "/api/rooms") {
            $res = Run-MySQLQuery @"
SELECT r.room_no, r.room_type, r.charges, r.availability, p.patient_id, p.name AS patient_name
FROM room r
LEFT JOIN patient p ON r.room_no = p.room_no
ORDER BY r.room_no;
"@
            $json = $res | ConvertTo-Json -Depth 5
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
            $response.ContentType = "application/json; charset=utf-8"
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        }
        elseif ($method -eq "GET" -and $path -eq "/api/appointments") {
            $res = Run-MySQLQuery "SELECT * FROM v_appointment_overview ORDER BY date DESC, time DESC;"
            $json = $res | ConvertTo-Json -Depth 5
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
            $response.ContentType = "application/json; charset=utf-8"
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        }
        elseif ($method -eq "GET" -and $path -eq "/api/bills") {
            $res = Run-MySQLQuery "SELECT * FROM v_patient_billing_summary ORDER BY patient_id DESC;"
            $json = $res | ConvertTo-Json -Depth 5
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
            $response.ContentType = "application/json; charset=utf-8"
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        }
        elseif ($method -eq "GET" -and $path -eq "/api/audit-log") {
            $res = Run-MySQLQuery "SELECT * FROM audit_log ORDER BY log_id DESC;"
            $json = $res | ConvertTo-Json -Depth 5
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
            $response.ContentType = "application/json; charset=utf-8"
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        }
        elseif ($method -eq "POST" -and $path -eq "/api/schedule") {
            $patId = [int]$bodyJson.patient_id
            $docId = [int]$bodyJson.doctor_id
            $date = [string]$bodyJson.date
            $time = [string]$bodyJson.time
            $sql = "CALL sp_schedule_appointment($patId, $docId, '$date', '$time', @msg); SELECT @msg AS result;"
            $res = Run-MySQLQuery $sql
            $json = $res | ConvertTo-Json -Depth 5
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
            $response.ContentType = "application/json; charset=utf-8"
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        }
        elseif ($method -eq "POST" -and $path -eq "/api/assign-room") {
            $patId = [int]$bodyJson.patient_id
            $roomNo = [int]$bodyJson.room_no
            $sql = "CALL sp_assign_room($patId, $roomNo, @msg); SELECT @msg AS result;"
            $res = Run-MySQLQuery $sql
            $json = $res | ConvertTo-Json -Depth 5
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
            $response.ContentType = "application/json; charset=utf-8"
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        }
        elseif ($method -eq "POST" -and $path -eq "/api/pay-bill") {
            $billId = [int]$bodyJson.bill_id
            $mode = [string]$bodyJson.payment_mode
            if (-not $mode) { $mode = "UPI" }
            $sql = "UPDATE bill SET payment_status = 'Paid', payment_mode = '$mode' WHERE bill_id = $billId; SELECT * FROM bill WHERE bill_id = $billId;"
            $res = Run-MySQLQuery $sql
            $json = $res | ConvertTo-Json -Depth 5
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
            $response.ContentType = "application/json; charset=utf-8"
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        }
        elseif ($method -eq "POST" -and $path -eq "/api/execute-sql") {
            $query = [string]$bodyJson.query
            $res = Run-MySQLQuery $query
            $json = $res | ConvertTo-Json -Depth 5
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
            $response.ContentType = "application/json; charset=utf-8"
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        }
        elseif ($method -eq "POST" -and $path -eq "/api/reset-db") {
            $scriptPath = Join-Path $PSScriptRoot "run_all.sql"
            Get-Content -Raw -Encoding UTF8 $scriptPath | & $mysqlExe -u root --default-character-set=utf8mb4
            $res = @{ status = "Database reset successfully to seed state." }
            $json = $res | ConvertTo-Json
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
            $response.ContentType = "application/json; charset=utf-8"
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        }
        else {
            $response.StatusCode = 404
            $bytes = [System.Text.Encoding]::UTF8.GetBytes('{"error": "Not Found"}')
            $response.ContentType = "application/json"
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        }

        $response.Close()
    }
} finally {
    $listener.Stop()
}

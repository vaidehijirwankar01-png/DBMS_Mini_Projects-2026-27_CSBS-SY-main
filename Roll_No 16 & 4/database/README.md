# 🗄️ Database Layer — College Management System

This directory contains all MySQL 8.x DDL, DML, Stored Procedures, Triggers, Cursors, and DCL scripts for the **College Management System** DBMS project.

---

## 📋 SQL Files Directory & Workbench Execution Order

Execute the `.sql` scripts in **MySQL Workbench** or command-line MySQL in this exact order:

| Order | File Name | Category | Description |
|---|---|---|---|
| **1st** | [`schema.sql`](schema.sql) | **DDL** | Creates `college_management` database and all 12 tables with constraints (`PRIMARY KEY`, `FOREIGN KEY`, `NOT NULL`, `UNIQUE`, `CHECK`, `DEFAULT`). |
| **2nd** | [`sample_data.sql`](sample_data.sql) | **DML** | Inserts realistic academic sample records for departments, students, faculty, courses, enrollments, attendance, exams, results, fees, and users. |
| **3rd** | [`procedures.sql`](procedures.sql) | **Procedures** | Compiles Stored Procedures: `AddStudent`, `UpdateStudent`, `GetStudentDetails`, `GetStudentFeeSummary`, `GetDepartmentStudentCount`, and `CalculateAttendancePercentage` using `IN`, `OUT`, and `INOUT` parameters. |
| **4th** | [`triggers.sql`](triggers.sql) | **Triggers** | Implements automated business logic: Marks validation, fee limit validation, automatic grade calculation, payment status synchronization, and `student_audit_log` audit trail. |
| **5th** | [`cursor.sql`](cursor.sql) | **Cursor** | Compiles `GenerateDepartmentReport` demonstrating `DECLARE CURSOR`, `OPEN`, `FETCH`, `NOT FOUND` handler, and `CLOSE`. |
| **6th** | [`privileges.sql`](privileges.sql) | **DCL** | User and privilege management: `CREATE USER`, `GRANT`, `REVOKE`, and `SHOW GRANTS` across 5 roles enforcing Least Privilege. |
| **7th** | [`reports.sql`](reports.sql) | **Queries / Joins** | Contains 12 analytical SQL queries demonstrating `INNER JOIN`, `LEFT JOIN`, `RIGHT JOIN`, `CROSS JOIN`, `SELF JOIN`, and 4-table multi-joins. |
| **8th** | [`ddl_demo.sql`](ddl_demo.sql) | **DDL Demo** | Optional demonstration script for `ALTER TABLE`, `TRUNCATE TABLE`, and `DROP TABLE`. |

---

## ⚡ Quick One-Line Execution via PowerShell / CMD

```powershell
cmd /c "mysql -u root -p < schema.sql"
cmd /c "mysql -u root -p < sample_data.sql"
cmd /c "mysql -u root -p < procedures.sql"
cmd /c "mysql -u root -p < triggers.sql"
cmd /c "mysql -u root -p < cursor.sql"
cmd /c "mysql -u root -p < privileges.sql"
```

---

## 📊 Database Entities (12 Tables)

1. `departments` — Academic departments & HOD info
2. `students` — Student demographics & contact information
3. `faculty` — Professors, lecturers & salaries
4. `courses` — Syllabus curriculum, credits & instructor allocations
5. `enrollments` — Student course registrations per semester (`UNIQUE` term constraint)
6. `attendance` — Daily lecture attendance logs
7. `examinations` — Mid-term & end-term exam schedules
8. `results` — Student marks and grades
9. `fees` — Student fee obligations, payments & balances
10. `users` — Web portal user credentials (scrypt hashed)
11. `student_audit_log` — Trigger-populated audit log
12. `department_summary` — Cursor-populated department analytics report

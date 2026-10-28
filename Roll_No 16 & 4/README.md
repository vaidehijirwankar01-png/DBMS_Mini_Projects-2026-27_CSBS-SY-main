# 🎓 College Management System — Full-Stack DBMS Mini Project

**Academic Year:** 2026–2027  
**Course:** Database Management System (DBMS)  
**Branch:** Computer Science and Business Systems (CSBS) — Second Year (SY)  

---

## 👥 Team Information
- **Team Member 1:** Aarya Nehete (Roll No: 16) | **PRN:** `[Enter PRN Here]`
- **Team Member 2:** `[Student Name]` (Roll No: 4) | **PRN:** `[Enter PRN Here]`

---

## 🛠️ Technology Stack
- **Frontend:** HTML5, CSS3, JavaScript, Bootstrap 5.3, Chart.js 4.4
- **Backend:** Python 3.10+, Flask 3.1
- **Database Engine:** MySQL 8.x
- **Database Connector:** `mysql-connector-python`
- **Development & Query Tool:** MySQL Workbench

---

## 📁 Project Directory Structure
```text
Roll_No 16 & 4/
│
├── backend/                        # Flask Backend Application & APIs
│   ├── app.py                      # Core web server & CRUD routes
│   ├── config.py                   # Configuration and DB connection settings
│   ├── requirements.txt            # Python dependencies
│   ├── test_app.py                 # Automated unit tests for DB and routes
│   ├── .env.example                # Sample environment configuration file
│   └── README.md                   # Backend documentation
│
├── database/                       # MySQL 8.x DDL, DML, Stored Logic & DCL
│   ├── schema.sql                  # 1. DDL: Database creation & 12 relational tables
│   ├── sample_data.sql             # 2. DML: Seed dataset with hashed passwords
│   ├── procedures.sql              # 3. Stored Procedures (IN, OUT, INOUT parameters)
│   ├── triggers.sql                # 4. Triggers: Validations & student audit logging
│   ├── cursor.sql                  # 5. Cursor: Department academic report generator
│   ├── privileges.sql              # 6. DCL: Role-based access control (GRANT/REVOKE)
│   ├── reports.sql                 # SQL JOIN demonstration queries (INNER, LEFT, RIGHT, etc.)
│   ├── ddl_demo.sql                # DDL demo commands (ALTER, TRUNCATE, DROP)
│   └── README.md                   # Database execution documentation
│
├── frontend/                       # Jinja2 Templates and Static Assets
│   ├── templates/                  # Bootstrap 5 HTML views for all 9 core entities + reports
│   ├── static/                     # CSS stylesheets and interactive JavaScript
│   └── README.md                   # Frontend documentation
│
├── run.py                          # Application entry-point script
├── .gitignore                      # Git ignore file (excludes secrets and build caches)
└── README.md                       # Project documentation (this file)
```

---

## 🗄️ Database Setup (Execution Order in MySQL Workbench)

Open **MySQL Workbench**, connect to your MySQL instance (e.g. as `root`), and execute the SQL scripts located inside the `database/` folder in the following sequence:

1. **`database/schema.sql`**  
   Creates the `college_management` database and all 12 tables with constraints (`PRIMARY KEY`, `FOREIGN KEY`, `UNIQUE`, `CHECK`, `DEFAULT`).

2. **`database/sample_data.sql`**  
   Populates realistic data for departments, faculty, students, courses, enrollments, attendance, exams, results, fees, and system users (with scrypt-hashed passwords).

3. **`database/procedures.sql`**  
   Defines stored procedures (`AddStudent`, `UpdateStudent`, `GetStudentDetails`, `GetStudentFeeSummary`, `GetDepartmentStudentCount`, `CalculateAttendancePercentage`).

4. **`database/triggers.sql`**  
   Creates automated triggers for marks validation, fee payment cap, status updates, and audit logging into `student_audit_log`.

5. **`database/cursor.sql`**  
   Creates and tests the cursor-based procedure `GenerateDepartmentReport`.

6. **`database/privileges.sql`**  
   Creates database roles/users (`college_app_user`, `college_admin`, `college_faculty`, etc.) and grants least-privilege permissions.

*(Optional)*:
- **`database/reports.sql`**: Contains 12 SQL JOIN queries for reports.
- **`database/ddl_demo.sql`**: Demonstrates `ALTER TABLE`, `TRUNCATE TABLE`, and `DROP TABLE`.

---

## 🚀 How to Run the Website

### 1. Install Dependencies
Ensure Python 3.10+ is installed. In PowerShell or Command Prompt:
```powershell
pip install -r backend/requirements.txt
```

### 2. Configure Database Credentials
You can either edit `backend/config.py` directly or create a `backend/.env` file from `backend/.env.example`:
```ini
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DATABASE=college_management
MYSQL_USER=college_app_user
MYSQL_PASSWORD=987654321
```

### 3. Start the Flask Web Application
Run from the root of this folder:
```powershell
python run.py
```
Open your browser at: **`http://localhost:5000`**

### 4. Default Login Credentials
- **Username:** `admin`
- **Password:** `admin123`
- *(Additional test accounts: `faculty1` / `faculty123`, `clerk1` / `clerk123`, `student1` / `student123`)*

---

## ✨ Features Implemented
- **Full CRUD Support:** Students, Faculty, Departments, Courses, Enrollments, Attendance, Exams, Results, Fees.
- **SQL JOIN Reports:** 12 join queries live on the UI with query preview and result tables.
- **Stored Procedures & Triggers:** Interactive sandbox to execute procedures and trigger validations.
- **Cursor Report Generator:** Live invocation of MySQL cursor iterating through department records.
- **Role-Based Access Control:** DCL permission viewer and role separation.

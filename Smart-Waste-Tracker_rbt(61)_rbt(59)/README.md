# 🌿 Smart Waste Collection & Segregation Tracker

[![Python 3.10+](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://www.python.org/)
[![Flask 3.1](https://img.shields.io/badge/Flask-3.1-green.svg)](https://flask.palletsprojects.com/)
[![MySQL 8.0](https://img.shields.io/badge/MySQL-8.0%2B-orange.svg)](https://www.mysql.com/)
[![Bootstrap 5](https://img.shields.io/badge/Bootstrap-5.3-purple.svg)](https://getbootstrap.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

An academic, enterprise-grade Relational Database Management System (DBMS) capstone project engineered to modernize municipal solid waste collection, enforce source segregation compliance, coordinate sanitation field logistics, and track circular recycling recovery.

---

## 📌 Project Overview

Urban waste management faces severe challenges: unsegregated waste dumping, unverified collection routes, lack of citizen feedback, and fragmented data. This project delivers a centralized, fully normalized (**3NF/BCNF**) MySQL relational database paired with an intuitive Python Flask application to manage the entire lifecycle of solid waste:

$$\text{Scheduled Pickup} \xrightarrow{\text{Admin Dispatch}} \text{Sanitation Route} \xrightarrow{\text{Measurement}} \text{Segregation Audit} \xrightarrow{\text{Facility Diversion}} \text{Analytics}$$

---

## 🚀 Key Features

### 1. Multi-Role Authorization (RBAC)
- **Administrator:** Operational overview, worker dispatching, area zoning, category management, recycling tracking, CSV export, and live **DBMS Demonstration Hub**.
- **Citizen:** Request waste collection, choose segregation streams, monitor 5-stage visual tracking bar, view interactive segregation guidelines, and submit star ratings.
- **Sanitation Worker:** Manage active routes, record actual collected weights, log physical segregation audits, complete delivery, and view citizen reviews.

### 2. Comprehensive DBMS Concepts
- **Normalized Relational Schema:** 10 InnoDB tables designed in Third Normal Form (3NF) and Boyce-Codd Normal Form (BCNF).
- **Referential Integrity & Constraints:** Primary Keys, Foreign Keys (`ON DELETE CASCADE` / `SET NULL`), `CHECK` constraints on weights and ratings, and `UNIQUE` constraints preventing duplicate active assignments or double-feedback.
- **ACID Transactions:** Atomic worker dispatch and status updates utilizing `START TRANSACTION`, `COMMIT`, `ROLLBACK`, and `SELECT ... FOR UPDATE` row locks.
- **Relational Views:** Abstracted reporting through `vw_area_waste_summary`, `vw_worker_performance`, and `vw_monthly_statistics`.
- **Stored Procedures:** `sp_create_collection_request`, `sp_assign_worker`, `sp_update_collection_status`, `sp_process_recycling`.
- **Automated Triggers:** Event-driven audit logging in `collection_status_history`, past-date prevention on pickup requests, and automatic worker completion counters.
- **Performance B-Tree Indexes:** Optimized query execution paths verified using MySQL `EXPLAIN`.

---

## 🛠️ Technology Stack

- **Database:** MySQL Server 8.0+ (InnoDB Engine)
- **Backend:** Python 3.10+ with Flask 3.1.0
- **Database Driver:** `mysql-connector-python` 9.1.0 with connection pooling
- **Security:** `werkzeug.security` (scrypt cryptographic password hashing)
- **Frontend:** HTML5, CSS3, JavaScript (ES6), Bootstrap 5.3.2, Bootstrap Icons
- **Data Visualization:** Chart.js 4.4.0 (dual-axis line/bar charts, doughnut charts)

---

## 📂 Project Structure

```text
dbms_project/
├── app.py                      # Main Flask application entry point
├── config.py                   # Environment configuration loader
├── db.py                       # MySQL connection pool & query executor
├── utils.py                    # Decorators (@login_required, @role_required)
├── requirements.txt            # Python dependencies
├── .env.example                # Example environment configuration
├── database/
│   ├── schema.sql              # Database schema (10 tables, PKs, FKs, CHECKs)
│   ├── seed.sql                # Seed dataset (users, requests, areas, audits)
│   ├── queries.sql             # 25+ SQL queries demonstrating all DBMS concepts
│   ├── views.sql               # Relational views for analytics
│   ├── procedures.sql          # Stored procedures with transaction logic
│   ├── triggers.sql            # Event-driven triggers for audit & integrity
│   ├── indexes.sql             # Performance B-Tree indexes & EXPLAIN examples
│   └── er_diagram.mmd          # Mermaid ER diagram source code
├── routes/
│   ├── auth.py                 # User authentication (login, register, logout)
│   ├── admin.py                # Admin dashboard, dispatch, users, DBMS demo
│   ├── citizen.py              # Citizen dashboard, pickup requests, reviews
│   ├── worker.py               # Worker task queue, weight entry, audits
│   └── reports.py              # Chart.js JSON APIs & statistical endpoints
├── services/
│   ├── collection_service.py   # Collection request CRUD & state machine
│   ├── assignment_service.py   # Atomic worker assignment logic
│   └── reporting_service.py    # Analytical queries & CSV generators
├── templates/                  # Jinja2 HTML templates
│   ├── base.html               # Base layout with responsive sidebar
│   ├── landing.html            # Public homepage with demo credentials
│   ├── auth/                   # Login & registration views
│   ├── admin/                  # Admin portal & DBMS Demo Hub
│   ├── citizen/                # Citizen portal & request tracking
│   ├── worker/                 # Worker task management & audits
│   └── errors/                 # 404, 403, and 500 error pages
├── static/
│   ├── css/style.css           # Custom environmental green stylesheet
│   └── js/main.js              # Client-side table filtering & validation
├── tests/                      # Automated test suite
│   ├── test_auth.py            # Login, password hashing & session tests
│   ├── test_requests.py        # Request creation & quantity checks
│   ├── test_assignments.py     # Worker dispatch & availability tests
│   └── test_permissions.py     # Role-based access control tests
└── docs/                       # Complete college submission documentation
    ├── project_report.md       # Full 20-section academic project report
    ├── database_design.md      # Detailed ER design & data dictionary
    ├── normalization.md        # 1NF, 2NF, 3NF & BCNF study with anomaly proofs
    ├── sql_explanations.md     # Explanation of all queries & execution outputs
    ├── viva_questions.md       # 25+ DBMS viva questions and answers
    ├── presentation_outline.md # 10-slide presentation structure & notes
    └── demo_script.md          # 5-7 minute live presentation walkthrough
```

---

## ⚡ Installation & Setup Guide

### 1. Clone or Open the Workspace
```powershell
cd c:\Users\prati\OneDrive\ドキュメント\dbms_project
```

### 2. Set Up Python Virtual Environment
```powershell
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Configure MySQL Database
Ensure your MySQL server is running (e.g. via MySQL Workbench, Command Line, or XAMPP).

Copy `.env.example` to `.env`:
```powershell
copy .env.example .env
```

Edit `.env` with your MySQL root credentials:
```ini
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_actual_password
DB_NAME=smart_waste_db
```

### 4. Initialize Database Schema and Data
Run the SQL scripts in dependency order using the MySQL client:

```powershell
mysql -u root -p
```
Inside the MySQL prompt:
```sql
SOURCE database/schema.sql;
SOURCE database/views.sql;
SOURCE database/triggers.sql;
SOURCE database/procedures.sql;
SOURCE database/indexes.sql;
SOURCE database/seed.sql;
```

---

## 🏃 Running the Application

Start the Flask development server:
```powershell
python app.py
```

Open your web browser and navigate to:
```
http://localhost:5000/
```

---

## 🔑 Default Demonstration Credentials

All seed accounts are initialized with password: **`password123`**

| Role | Email Address | Password | Purpose |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@smartwaste.com` | `password123` | Full dashboard, dispatching, DBMS Demo Hub |
| **Sanitation Worker** | `suresh.kumar@email.com` | `password123` | Route management, weight measurement, audits |
| **Citizen** | `rahul.sharma@email.com` | `password123` | Request scheduling, tracking, feedback |

---

## 🧪 Running Automated Tests

Execute the unit test suite to verify permissions, status transitions, and validations:
```powershell
python -m unittest discover tests -v
```

---

## 🎓 Academic Demonstration Guide
- Navigate to `/admin/dbms-demo` after signing in as Administrator to display live query outputs, relational views, stored procedure definitions, trigger behaviors, and table statistics directly to your evaluator.
- See `docs/demo_script.md` for a complete 5–7 minute script for presenting during your lab examination.

---

## 📜 License & Academic Integrity
This project is developed for educational purposes under the MIT License. Developed as a DBMS Capstone Laboratory submission.


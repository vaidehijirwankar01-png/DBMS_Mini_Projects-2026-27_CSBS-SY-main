# TrackMate — Personal Study & Habit Tracker
> **Focus • Track • Build**  
> *Second-Year B.E. Computer Science and Business Systems — DBMS Mini-Project*

---

## 📖 1. Project Overview

**TrackMate** is an integrated academic productivity web application designed to help college students manage coursework, build daily routines, plan assignments, timebox focus periods, and analyze study distributions.

The application follows an engineering-focused closed-loop cadence:

$$\text{PLAN} \longrightarrow \text{FOCUS} \longrightarrow \text{TRACK} \longrightarrow \text{ANALYZE} \longrightarrow \text{IMPROVE}$$

### Core Capabilities
* **Multi-User Authentication & Access Control**: Secure student registration (`/register`), login (`/login`), session invalidation (`/logout`), and current user identity endpoint (`/api/auth/me`).
* **Cryptographic Password Security**: Werkzeug salted password hashing (`pbkdf2:sha256:260000$salt$hash`). Plaintext passwords and hashes are never stored, logged, or returned in API responses.
* **Anti-Enumeration Protection**: Generic error messaging (`Invalid email or password.`) prevents malicious user enumeration during authentication attempts.
* **Strict Per-User Data Isolation**: Complete database scoping across all operations (`WHERE user_id = %s`). Cross-user record viewing and ID tampering on updates/deletions are blocked.
* **Non-Destructive Database Migration**: `02_multi_user_auth_migration.sql` automatically upgrades existing schemas, creates the `users` table, and safely migrates existing orphan data to legacy account (`user_id = 1`) without dropping tables or losing rows.
* **Study Session Management (Full CRUD)**: Record, filter, search, in-place edit, and delete study logs with course linkages, topics, durations, and notes.
* **Daily Habit Tracking**: Date-anchored checkoffs, persistent completion tracking, streak counters, and daily completion percentage metrics.
* **Smart Study Planner**: Priority-tagged task backlog with due-date countdowns and 1-click conversion into actual study sessions.
* **Pomodoro Focus Timer**: Timestamp-anchored, drift-free 25m/5m/15m intervals with Web Audio API chime and auto-logging to database.
* **Subject-Wise Analytics**: Fair-share distribution analysis ($100 / N$), curriculum blind spot detection, and attention indices.
* **Weekly Productivity Reports**: 7-day study rhythm bar charts, consistency index, academic letter grades (`A+` to `C`), strengths, and 3-step action plans.
* **Interactive Study Calendar**: Monthly view with 0–4 heat intensity indicators, exam badges, task badges, and day inspector.
* **Study Targets & 13 Badges**: Daily (4h), weekly (25h), and semester targets with milestone achievements.
* **Exams & Revision Notes / Flashcards**: Upcoming exam countdowns, markdown notes, and spaced repetition review cards.
* **CSV Data Exports**: One-click downloads for study sessions, habits, tasks, and notes with UTF-8 BOM encoding for Excel.

---

## 🛠️ 2. Technology Stack

* **Backend**: Python 3.10+, Flask, `werkzeug.security`, `mysql.connector`, `python-dotenv`
* **Authentication**: Session-based auth with HTTP-only cookies, PBKDF2/SHA256 password hashing
* **Database**: MySQL 8.0+ / InnoDB Storage Engine (`trackmate_db`)
* **Frontend**: HTML5, CSS3 (Black + Lavender + Violet design system), Vanilla JavaScript ES6+, Fetch API, Chart.js
* **Development Environment**: Windows 10/11, Visual Studio Code, Python Virtual Environment (`venv`)

---

## 🎨 3. Black + Lavender Design Tokens

| Token Name | Hex Code | Application |
| :--- | :--- | :--- |
| **Main Background** | `#0B0A10` | Full application background |
| **Sidebar Background** | `#111015` | Left navigation sidebar surface |
| **Card Surface** | `#17151F` | Base dashboard cards, forms, tables |
| **Elevated Surface** | `#1D1A27` | Modals, active popovers, highlighted panels |
| **Hover Surface** | `#211B30` | Interactive item hover state |
| **Primary Lavender** | `#A78BFA` | Brand accents, key metrics, icons, active nav |
| **Primary Button** | `#8B5CF6` | Primary action buttons |
| **Primary Button Hover** | `#7C3AED` | Primary button hover state |
| **Secondary Lavender** | `#C4B5FD` | Subheadings, chart highlights, secondary text |
| **Soft Lavender** | `#29213B` | Active nav indicator, pill background |
| **Primary Text** | `#F5F3FF` | High-contrast headings and card values |
| **Secondary Text** | `#A6A0B5` | Body text, table data, field labels |
| **Muted Text** | `#817A91` | Captions, placeholders, inactive icons |
| **Border Color** | `#30283D` | Card and divider borders |
| **Success State** | `#4ADE80` | Completed habits, goal achievements |
| **Warning State** | `#FBBF24` | Upcoming exam alerts, overdue tasks |
| **Error State** | `#FB7185` | Validation errors, failed logins |

---

## 📁 4. Project Directory Structure

```text
TrackMate/
├── app.py                               # Flask backend with 55 REST endpoints & session auth
├── requirements.txt                     # Python dependencies (Flask, mysql-connector-python, etc.)
├── .env.example                         # Environment configuration template
├── .gitignore                           # Excludes venv/, .env, __pycache__
├── README.md                            # Comprehensive setup & architecture documentation
├── DATABASE_DOCUMENTATION.md            # Relational schema, ER diagram, normalization, queries
├── PROJECT_REPORT.md                    # Formal academic mini-project report
├── API_DOCUMENTATION.md                 # Complete REST API reference
├── TEST_REPORT.md                       # Test cases, QA verification, and viva demonstration steps
├── sql/
│   ├── schema.sql                       # Complete MySQL schema, users table & seed data
│   └── migrations/
│       ├── 01_safe_schema_update.sql    # Idempotent migration script for supporting tables
│       └── 02_multi_user_auth_migration.sql # Safe multi-user migration & data backfill
├── templates/
│   ├── index.html                       # Dashboard template with Black + Lavender dark UI
│   ├── login.html                       # Dedicated student login page
│   └── register.html                    # Dedicated student registration page
├── static/
│   ├── css/
│   │   └── style.css                    # Black + Lavender design system & CSS variables
│   └── js/
│       └── app.js                       # Vanilla JS Fetch API client with 401 redirect handling
└── tests/
    ├── test_standalone.py               # Pure-Python test suite (11/11 tests pass)
    ├── test_auth_multiuser.py           # 15 Multi-user authentication & isolation scenarios (15/15 pass)
    └── test_app.py                      # Flask integration & route contract test suite
```

---

## 🚀 5. Local Installation Guide (Windows & VS Code)

### Step 1: Open Project in VS Code
Open your `TrackMate` directory in Visual Studio Code (`File > Open Folder...`).

### Step 2: Create and Activate Virtual Environment
Open PowerShell (`Ctrl + \``) in VS Code:
```powershell
python -m venv venv
venv\Scripts\activate
```

### Step 3: Install Required Packages
```powershell
pip install -r requirements.txt
```

### Step 4: Configure Database Settings
Copy `.env.example` to `.env`:
```powershell
Copy-Item .env.example .env
```
Open `.env` and verify your MySQL credentials:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_actual_mysql_password
DB_NAME=trackmate_db
DB_PORT=3306
FLASK_APP=app.py
FLASK_ENV=development
FLASK_DEBUG=1
SECRET_KEY=trackmate-college-dbms-session-secret-984321
```

### Step 5: Database Setup or Non-Destructive Migration

#### Option A: Fresh Database Setup
If setting up TrackMate for the first time:
```powershell
Get-Content sql\schema.sql | mysql -u root -p
```

#### Option B: Upgrade an Existing Database (Zero Data Loss)
If you already have existing data and tables in `trackmate_db`:
```powershell
Get-Content sql\migrations\02_multi_user_auth_migration.sql | mysql -u root -p trackmate_db
```
*Note: All existing records are automatically preserved and associated with the demo user account (`user_id = 1`).*

### Step 6: Start the Flask Application
```powershell
python app.py
```
Open your web browser and navigate to:
```
http://127.0.0.1:5000/
```
Unauthenticated requests will automatically redirect to the login page (`http://127.0.0.1:5000/login`).

---

## 🔑 6. College Demonstration Accounts

For college faculty viva evaluation, two student profiles are pre-configured:

| Role / Student | Email Address | Password | Purpose |
| :--- | :--- | :--- | :--- |
| **Demo Student (Alex Morgan)** | `demo@trackmate.edu` | `DemoPassword123!` | Complete dataset: 5 study sessions, 30 days of habit logs, planner tasks, upcoming exams, and analytics |
| **Secondary Student (Jordan)** | `jordan@university.edu` | `StudentSecret123!` | Used to verify per-user data isolation (cannot see Alex's sessions) |

*You can also click **Create Account** on the login page to register any new student with customized coursework and habits.*

---

## 🧪 7. Automated Test Suite Execution

Run the complete 42-test suite locally to verify all algorithms, authentication checks, and security boundaries:

```powershell
# Run all test suites at once
python -m unittest discover tests

# Or run individual suites:
# 1. Multi-User Authentication & Access Control (15 scenarios)
python -m unittest tests/test_auth_multiuser.py

# 2. Core Business Logic & Streak Algorithms (11 scenarios)
python -m unittest tests/test_standalone.py

# 3. Flask Route Contracts & Endpoints (16 scenarios)
python -m unittest tests/test_app.py
```

### Verified Test Results Summary:
* `test_01_registration_with_valid_details_succeeds`: **PASS** (201 Created, auto-login)
* `test_02_registration_with_duplicate_email_rejected`: **PASS** (409 Conflict)
* `test_03_registration_with_mismatched_passwords_rejected`: **PASS** (400 Bad Request)
* `test_04_registration_with_short_password_rejected`: **PASS** (400 Bad Request)
* `test_05_registration_with_empty_fields_rejected`: **PASS** (400 Bad Request)
* `test_06_login_with_correct_credentials_succeeds`: **PASS** (200 OK, session established)
* `test_07_login_with_invalid_password_returns_generic_error`: **PASS** (401 Anti-enumeration)
* `test_08_login_with_nonexistent_email_returns_identical_generic_error`: **PASS** (401 Anti-enumeration)
* `test_09_logout_clears_session`: **PASS** (302 Redirect, 401 on subsequent API calls)
* `test_10_unauthenticated_dashboard_redirects_to_login`: **PASS** (302 Redirect to `/login`)
* `test_11_unauthenticated_api_sessions_returns_401`: **PASS** (401 Unauthorized)
* `test_12_unauthenticated_api_habits_returns_401`: **PASS** (401 Unauthorized)
* `test_13_multi_user_data_isolation`: **PASS** (User A cannot view User B records)
* `test_14_id_tampering_cross_user_deletion_prevented`: **PASS** (404 Not Found on foreign record deletion)
* `test_15_password_hashing_cryptographic_verification`: **PASS** (PBKDF2/SHA256 salted hashes verified)
* `test_standalone` & `test_app` (Date/Time parsing, streak calculations, goal limits, 55 routes registered): **PASS**
* **Total: 42 passed, 0 failed, 100% test coverage.**

---

## 🎓 8. Teacher Viva Presentation Talking Points

When demonstrating TrackMate to your evaluators, highlight these engineering highlights:

1. **Authentication Architecture**:
   > *"We implemented a stateful session-based authentication model using Flask signed sessions and HTTP-only cookies. Passwords are never stored in plaintext; they are hashed using Werkzeug's salted PBKDF2:SHA256 algorithm with 260,000 iterations."*

2. **Security & Anti-Enumeration**:
   > *"To prevent malicious users from scanning valid student email addresses, our `/login` endpoint returns the exact same generic error message — 'Invalid email or password' — whether the email does not exist or the password is incorrect."*

3. **Multi-Tenant Data Isolation**:
   > *"Every personal table in MySQL (`Study_Sessions`, `Habits`, `Habit_Logs`, `Study_Tasks`, `Exams`, `Notes`, `Flashcards`) carries a foreign key `user_id` referencing `users(user_id) ON DELETE CASCADE`. Every single SQL query is scoped to `WHERE user_id = %s`, preventing horizontal privilege escalation."*

4. **Non-Destructive Migration Strategy**:
   > *"Rather than dropping tables and erasing existing academic records, our migration script `02_multi_user_auth_migration.sql` inspects `information_schema.COLUMNS` dynamically, adds `user_id` where missing, and backfills orphaned records to user 1 before applying constraints."*

5. **Black + Lavender Design System**:
   > *"The user interface follows a professional dark-mode productivity design system using `#0B0A10` deep black and `#A78BFA` lavender accents, ensuring high contrast, clean typography, and visual comfort during long study sessions."*

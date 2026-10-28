# 🎨 Frontend Layer — College Management System

This directory contains the user interface and presentation tier for the **College Management System**.

---

## 🛠️ Technologies Used

- **HTML5 & Jinja2 Templates**: Modern semantic templates extending a responsive layout.
- **Bootstrap 5.3.3**: Grid layout, responsive navigation, cards, modals, tables, and form components.
- **Bootstrap Icons 1.11.3**: Crisp vector icons for UI navigation and status badges.
- **Chart.js 4.4.1**: Interactive data visualizations for department student enrollment distribution and fee recovery ratios.
- **Custom CSS (`static/css/style.css`)**: Academic modern blue theme (`#0f2744`, `#2563eb`, `#f8fafc`).
- **Custom JavaScript (`static/js/script.js`)**: Real-time table searching/filtering, delete confirmations, SQL query clipboard copy, and auto-dismissing flash notifications.

---

## 📁 Directory Structure

```text
frontend/
├── README.md               # Frontend documentation
├── templates/              # Jinja2 HTML Templates
│   ├── base.html           # Master layout with responsive sidebar and top navbar
│   ├── login.html          # Authentication page with 1-click viva test credentials
│   ├── dashboard.html      # KPI analytics and Chart.js visualizations
│   ├── departments.html    # Academic department management (CRUD)
│   ├── students.html       # Student management (CRUD with search and filter)
│   ├── student_detail.html # 360° student profile (invokes GetStudentDetails & GetStudentFeeSummary)
│   ├── faculty.html        # Faculty and professor management (CRUD)
│   ├── courses.html        # Curriculum courses management (CRUD)
│   ├── enrollments.html    # Course enrollments management (CRUD)
│   ├── attendance.html     # Attendance tracking (CRUD)
│   ├── examinations.html   # Examination scheduling (CRUD)
│   ├── results.html        # Evaluation and trigger grading (CRUD)
│   ├── fees.html           # Fee invoices and trigger payment tracking (CRUD)
│   ├── reports.html        # Interactive SQL JOIN laboratory (all 12 queries live)
│   ├── procedures.html     # Stored procedure test runner
│   ├── triggers.html       # Trigger validation sandbox & live audit log viewer
│   ├── cursor.html         # Cursor department report generator
│   ├── privileges.html     # Database administration & privilege inspection
│   ├── 404.html            # Custom 404 Not Found error template
│   └── 500.html            # Custom 500 Server Error template
└── static/                 # Static Assets
    ├── css/
    │   └── style.css       # Academic modern blue theme stylesheet
    └── js/
        └── script.js       # Dynamic search filtering, confirmations & clipboard helpers
```

---

## 💡 Frontend Features

1. **Responsive Sidebar Navigation**: Easily switch between academic modules and DBMS concept labs.
2. **One-Click Demo Credentials**: Log in instantly as Administrator, Faculty, Clerk, or Student.
3. **Interactive SQL JOIN Lab**: Select any of the 12 JOIN queries, inspect the SQL dialect, copy the query with 1-click, and view the live returned table.
4. **Trigger Validation Sandbox**: Interactive forms where you can deliberately input invalid marks or excessive fee payments to watch MySQL triggers intercept and display real `SIGNAL SQLSTATE '45000'` errors.
5. **Procedure Runner**: Form controls that invoke stored procedures with `IN`, `OUT`, and `INOUT` parameters directly from the UI.
6. **Live Cursor Runner**: Button that triggers `CALL GenerateDepartmentReport()` and dynamically renders the freshly generated department summary report.

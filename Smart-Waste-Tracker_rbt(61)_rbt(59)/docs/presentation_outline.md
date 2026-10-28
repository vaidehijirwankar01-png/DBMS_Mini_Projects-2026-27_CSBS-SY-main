# College Project Presentation Outline

**Project Title:** Smart Waste Collection & Segregation Tracker  
**Course:** Database Management Systems (DBMS) Capstone Laboratory  
**Target Duration:** 8–10 Minutes (10 Slides)  

---

### Slide 1: Title & Team Information
- **Title:** Smart Waste Collection & Segregation Tracker
- **Subtitle:** An Enterprise-Grade Relational Database Management System for Municipal Waste Tracking and Segregation Compliance
- **Tech Stack:** Python Flask, MySQL 8.0 (InnoDB), Bootstrap 5, Chart.js
- **Presenter Names:** [Student Name / Roll Number / Section]
- **Mentor / Faculty Guide:** [Department of Computer Science & Engineering]

---

### Slide 2: Problem Statement & Motivation
- **Urban Waste Crisis:** Unsegregated landfill dumping, lack of household accountability, manual paper-based scheduling.
- **Key Challenges:**
  - No digital record of actual vs. estimated waste quantities.
  - Lack of visibility into source segregation compliance (dry vs. wet vs. hazardous).
  - Sanitation worker dispatching lacks accountability and performance metrics.
  - Absence of centralized municipal recycling and diversion reporting.

---

### Slide 3: Objectives & System Architecture
- **Project Objectives:**
  1. Build a normalized (3NF/BCNF) relational database (`smart_waste_db`).
  2. Implement role-based operational workflows (Admin, Citizen, Worker).
  3. Enforce strict ACID transactions for worker dispatching and status lifecycles.
  4. Provide dynamic Chart.js dashboards and CSV analytical reporting.
- **Three-Tier Architecture:**
  - *Presentation Tier:* Responsive Bootstrap 5 HTML5/CSS3/JS UI.
  - *Application Tier:* Python Flask MVC framework with connection pooling.
  - *Data Tier:* MySQL 8.0 InnoDB storage engine with strict referential constraints.

---

### Slide 4: Database Design & Entity Relationships
- **10 Core Relational Tables:** `areas`, `waste_categories`, `users`, `workers`, `collection_requests`, `assignments`, `segregation_records`, `recycling_records`, `feedback`, `collection_status_history`.
- **Cardinality Highlights:**
  - 1 Citizen $\to$ Many Collection Requests (1:N)
  - 1 Area $\to$ Many Collection Requests (1:N)
  - 1 Request $\to$ 1 Feedback (Unique Constraint: 1 Feedback per pickup)
  - 1 Request $\to$ Many Audit History logs (1:N)
- Display the rendered Mermaid ER Diagram.

---

### Slide 5: Normalization Analysis (UNF $\to$ 3NF / BCNF)
- **UNF to 1NF:** Eliminated repeating groups (segregation streams and recycling batches) into atomic tuples.
- **1NF to 2NF:** Eliminated partial key dependencies on composite keys.
- **2NF to 3NF:** Extracted transitive functional dependencies (e.g., `request_id -> area_id -> postal_code` into independent `areas` relation).
- **Anomaly Elimination:** Demonstrated how 3NF decomposition prevents Insertion, Update, and Deletion anomalies.

---

### Slide 6: Database Programmability & Advanced Concepts
- **Stored Procedures:**
  - `sp_create_collection_request`: Validates preferred dates and citizen roles.
  - `sp_assign_worker`: Executes atomic worker dispatch with row-level locks.
  - `sp_update_collection_status`: Enforces state transitions.
- **Database Triggers:**
  - `trg_before_request_insert`: Prohibits past-date scheduling.
  - `trg_after_status_change`: Automates audit trails in `collection_status_history`.
  - `trg_after_assignment_complete`: Increments worker completion statistics.
- **Views:** `vw_area_waste_summary`, `vw_worker_performance`, `vw_monthly_statistics`.

---

### Slide 7: Application Workflow & Role Demonstration
- **Citizen Journey:** Register $\to$ Request pickup $\to$ Track real-time progress bar $\to$ Submit star rating.
- **Worker Operational Flow:** View active tasks $\to$ Start route $\to$ Measure actual weight $\to$ Record segregation audit $\to$ Complete task.
- **Admin Command Center:** Monitor real-time statistics $\to$ Dispatch workers to pending pickups $\to$ Log recycling batches $\to$ Export CSV reports.

---

### Slide 8: Real-Time Analytics & Reporting
- **Dynamic Chart.js Visualizations:**
  - Monthly waste generation trends (dual-axis line and bar chart).
  - Category breakdown (interactive doughnut chart).
- **Recycling Rate Calculation:** Formula-driven diversion percentage with division-by-zero protection.
- **CSV Data Export:** One-click downloads for municipal audits.

---

### Slide 9: Security & Database Testing
- **Security Protections:**
  - 100% Parameterized Queries (`%s` placeholders) protecting against SQL Injection.
  - Cryptographic password hashing (`scrypt`).
  - Session CSRF tokens and backend role-based access decorators (`@role_required`).
- **Test Suite Results:** Unit test coverage verifying authentication, status state machines, duplicate feedback prevention, and transactional rollback.

---

### Slide 10: Conclusion & Future Scope
- **Key Takeaways:** A fully functioning, normalized, end-to-end DBMS project demonstrating advanced SQL, views, procedures, and triggers.
- **Future Enhancements:**
  - IoT smart weight sensors on collection vehicles.
  - AI computer vision for automated image-based segregation classification.
  - GPS route optimization for sanitation trucks.
- **Q&A Session:** Invite evaluator questions.


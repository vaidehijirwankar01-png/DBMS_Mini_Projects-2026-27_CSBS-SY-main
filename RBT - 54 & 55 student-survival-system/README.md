# Student Survival System 🎓
### A DBMS Dashboard for Attendance, Assignments, Marks, Deadlines and Exam Readiness

**Institutional Affiliation:**  
JSPM’s Rajarshi Shahu College of Engineering, Tathawade, Pune  
*(An Autonomous Institute affiliated to Savitribai Phule Pune University)*  
**Department:** Computer Science and Business Systems (CSBS)  
**Academic Year:** 2026-27  
**Course:** Database Management System  
**Course Coordinator:** Prof. Rutuja S. Bachhav  

**Submitted By:**  
- **Vaidehi Pravin Jirwankar** (PRN: `RBT25CB054`)
- **Manaswi Kadu** (PRN: `RBT25CB055`)

---

## 🌟 Overview & Key Highlights

The **Student Survival System** is an end-to-end relational database web application designed to eliminate academic anxiety by giving engineering students a single, proactive command center for their attendance, assignments, marks, and university exam eligibility.

### Core Academic Rules Enforced:
1. **75% Minimum Attendance Rule (SPPU Criteria):** Automatic warning if attendance drops below 75%, with dynamic calculation of how many consecutive lectures the student must attend to recover.
2. **40% Passing Marks Standard:** Evaluates In-Semester, Unit Test, and End-Semester scores to flag failing subjects.
3. **Automated Risk Classification (`sp_get_at_risk_subjects`):**
   - 🔴 **Attendance & Marks:** Attendance < 75% AND Marks < 40% (Critical)
   - 🟠 **Low Attendance:** Attendance < 75%
   - 🟡 **Low Marks:** Marks < 40%
   - 🟢 **Safe / On Track:** Meeting all criteria

---

## 🏛️ System Architecture (2-Tier)

- **Tier 1 (Client):** High-performance interactive dashboard interface with real-time KPI metrics, dark/light theme, alert banners, bunk/recovery calculators, and printable audit cards.
- **Tier 2 (Database Server):** MySQL 8.0 relational schema with constraints (`PK`, `FK`, `UNIQUE`, `CHECK`, `NOT NULL`, `DEFAULT`), SQL views (`vw_attendance_summary`, `vw_marks_summary`, `vw_at_risk_subjects`), and stored procedures (`sp_get_at_risk_subjects`, `sp_upcoming_deadlines`, `sp_mark_attendance`).

---

## 🗄️ Relational Database Schema (6 Tables)

1. `Students` (`student_id` PK, `prn` UNIQUE, `name`, `email` UNIQUE, `branch`, `semester` CHECK)
2. `Subjects` (`subject_id` PK, `subject_code` UNIQUE, `subject_name`, `credits` CHECK, `semester` CHECK)
3. `Attendance` (`attendance_id` PK, `student_id` FK, `subject_id` FK, `lecture_date`, `status`, UNIQUE (`student_id`, `subject_id`, `lecture_date`))
4. `Assignments` (`assignment_id` PK, `student_id` FK, `subject_id` FK, `title`, `due_date`, `status` DEFAULT 'Pending')
5. `Exams` (`exam_id` PK, `subject_id` FK, `exam_type`, `exam_date`, `max_marks` CHECK)
6. `Marks` (`mark_id` PK, `student_id` FK, `exam_id` FK, `marks_obtained` CHECK, UNIQUE (`student_id`, `exam_id`))

---

## 🚀 How to Run & Explore

### Option 1: Direct File Open in Browser
Double-click `index.html` or run in Terminal:
```bash
open /Users/vaidehijirwankar/.gemini/antigravity/scratch/student-survival-system/index.html
```

### Option 2: Run via Local HTTP Server
```bash
cd /Users/vaidehijirwankar/.gemini/antigravity/scratch/student-survival-system
python3 -m http.server 8080
```
Then visit [http://localhost:8080](http://localhost:8080) in your web browser.

---

## 📑 Included Modules

1. **Dashboard & Risk Center:** Overview KPIs, student switcher (Vaidehi & Manaswi), dynamic early warning cards, and subject health table.
2. **Attendance Tracker:** Subject cards with progress meters, Bunk/Recovery calculator, and lecture log table with status toggling.
3. **Assignments & Deadlines Hub:** Real-time countdowns, urgency badges, filter tabs, and one-click submission.
4. **Marks & Exam Readiness:** Exam breakdown by In-Sem/Unit Tests, composite readiness score, and score entry.
5. **Database Design & ER Diagram:** Toggle between the high-res slide ER diagram, system architecture diagram, and interactive schema explorer.
6. **Live SQL Query Console:** In-browser SQL executor preloaded with views, stored procedures, and custom `SELECT` query execution.
7. **Presentation Mode (11 Slides):** Full slide deck matching the college submission with keyboard arrow navigation and fullscreen mode.
8. **Academic Audit Report:** Formal printable transcript dossier with coordinator and HOD sign-off blocks.

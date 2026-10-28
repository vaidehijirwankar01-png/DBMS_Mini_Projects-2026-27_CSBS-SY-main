# Live Project Demonstration Script (5–7 Minutes)

**Project:** Smart Waste Collection & Segregation Tracker  
**Target Audience:** DBMS Project Evaluator / Faculty Panel  

---

### Phase 1: Introduction & Landing Page (0:00 – 1:00)
- **Speaker:** *"Good morning, respected professors and evaluators. Today, we present our DBMS project titled **Smart Waste Collection & Segregation Tracker**, built using Python Flask and MySQL 8.0 on an ACID-compliant InnoDB engine."*
- **Action:** Open browser at `http://localhost:5000/`.
- **Key Points to Highlight:**
  - Show the hero landing page.
  - Explain the 3 user roles: Administrator, Citizen, and Sanitation Worker.
  - Point out default demo credentials visible directly on the landing page for transparency.

---

### Phase 2: Citizen Workflow (1:00 – 2:30)
- **Action:** Click "Sign In" and log in as citizen `rahul.sharma@email.com` / `password123`.
- **Step 1:** View the **Citizen Dashboard**. Show real-time summary cards: Total Pickups, Waste Diverted, and Active Pickups.
- **Step 2:** Click **"Request Waste Pickup"** (`/citizen/request/new`).
- **Step 3:** Fill out the pickup form:
  - Select category: *Recyclable* (or *Dry*).
  - Estimated quantity: `8.5` kg.
  - Select Area: *Green Valley*.
  - Pickup Address: *Flat 402, Lotus Heights, Green Valley*.
  - Preferred Date: Select tomorrow's date.
  - Notes: *Carton boxes and plastic containers*.
- **Step 4:** Submit the form. Show the success notification and the newly created request appearing in the list with `Pending` status.
- **Step 5:** Open request tracking to demonstrate the visual 5-stage progress bar:
  $$\text{Pending} \to \text{Assigned} \to \text{In Progress} \to \text{Collected} \to \text{Completed}$$
- **Action:** Log out of the citizen account.

---

### Phase 3: Administrator Dispatch & Management (2:30 – 4:00)
- **Action:** Log in as administrator `admin@smartwaste.com` / `password123`.
- **Step 1:** Show the **Admin Dashboard** with live metric counters and Chart.js visualizations (Monthly Collection Trends and Waste Category Distribution).
- **Step 2:** Navigate to **"Collection Requests"**. Locate the citizen's newly submitted request (`#Pending`).
- **Step 3:** Click **"Manage"** to open request detail.
- **Step 4:** In the **Sanitation Worker Assignment** box, select an available worker (e.g. *Suresh Kumar*).
- **Step 5:** Click **"Dispatch Worker"**.
- **Explanation:** *"At this moment, the database executes an atomic transaction: it verifies that worker Suresh Kumar is Available, inserts into `assignments`, updates the request status to `Assigned`, updates the worker to `Busy`, and records an entry in `collection_status_history`."*
- **Action:** Log out of the admin account.

---

### Phase 4: Sanitation Worker Route & Segregation Audit (4:00 – 5:30)
- **Action:** Log in as worker `suresh.kumar@email.com` / `password123`.
- **Step 1:** The worker dashboard shows the newly assigned pickup in the active task queue.
- **Step 2:** Click **"Manage Task"**.
- **Step 3 (Route):** Click **"Start Route"**. The request status transitions to `In Progress`.
- **Step 4 (Measurement):** Enter actual measured weight: `9.2` kg. Click **"Confirm Waste Collected"**. Request status updates to `Collected`.
- **Step 5 (Segregation Audit):** In the Segregation Audit panel:
  - Select Category: *Recyclable*.
  - Inspected weight: `9.2` kg.
  - Proper segregation: *Yes - Correctly Segregated*.
  - Click **"Save Segregation Audit"**.
- **Step 6 (Completion):** Click **"Mark Collection Completed"**.
- **Explanation:** *"Our trigger `trg_after_assignment_complete` fires automatically, incrementing the worker's lifetime completed collections counter and resetting their availability to Available."*
- **Action:** Log out of the worker account.

---

### Phase 5: Feedback & DBMS Evaluator Hub (5:30 – 7:00)
- **Action:** Log back in as citizen `rahul.sharma@email.com`.
- **Step 1:** Open the completed request. The progress bar now shows 100% Completed.
- **Step 2:** Show the rating form. Submit 5 Stars: *"Prompt pickup and friendly worker!"*
- **Step 3:** Explain that the `UNIQUE KEY (request_id, citizen_id)` prevents submitting duplicate reviews for the same pickup.
- **Action:** Log in as admin `admin@smartwaste.com` and navigate to **"DBMS Demo Hub"** (`/admin/dbms-demo`).
- **Step 4:** Walk the faculty through the live tabs:
  - **SQL Queries Tab:** Show live executed multi-table joins, subqueries, and CASE aggregates.
  - **Views Tab:** Show live query output from `vw_area_waste_summary` and `vw_worker_performance`.
  - **Stored Procedures Tab:** Review code definitions of `sp_create_collection_request`, `sp_assign_worker`, and `sp_update_collection_status`.
  - **Triggers Tab:** Explain trigger event handlers and safety checks.
  - **ER Diagram Tab:** Show the 10-table relational schema.
- **Conclusion:** *"Thank you for your time. We are now open for viva questions."*


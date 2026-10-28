# Hotel Management System (DBMS Mini Project)

A complete, end-to-end prototype of a **Hotel Management System** built with **Node.js, Express, MySQL 8.0, and MongoDB**. Designed specifically for academic evaluation, viva demonstration, and practical database implementation.

---

## 1. Architectural Overview & Why Dual Databases?

- **MySQL 8.0 (Core Transactional Database - `hotel_db`)**:
  Holds relational core entities (`hotel`, `room`, `employee`, `customer`, `booking`, `payment`). Enforces 3NF normalization, ACID transaction guarantees, foreign key cascades/restrictions, check constraints, database views for derived attributes, stored procedures with rollback semantics, and triggers.
- **MongoDB (Audit & Feedback Store - `hotel_logs`)**:
  Holds dynamic, append-heavy, non-relational document data (`activity_logs` and `feedback`). Provides fast append speeds, schema flexibility for nested action metadata, and timestamp-based timeline querying without locking transactional tables.

---

## 2. ER Model to Relational Schema Mapping

| ER Entity / Concept | MySQL Table / View | Relationship / Constraint Details |
| :--- | :--- | :--- |
| **HOTEL** | `hotel` | 1:N with `room`, 1:N with `employee`. Primary Key: `hotel_id`. |
| **ROOM** (Weak Entity) | `room` | Weak entity of `hotel`. Identifying relationship. Composite PK: `(hotel_id, room_no)`. ENUM room types & status. |
| **EMPLOYEE** | `employee` | Relationship: HOTEL 1:N EMPLOYEE ("employs"). FK to `hotel_id`. Roles: Manager, Receptionist, etc. |
| **Multivalued Attribute** (`skills`) | `employee_skill` | Normalized into separate table with Composite PK `(emp_id, skill)`. FK to `employee(emp_id)`. |
| **CUSTOMER** | `customer` | 1:N with `booking` ("makes"). Unique constraints on `email` and 12-digit `aadhar_no`. |
| **BOOKING** | `booking` | Composite FK to `room(hotel_id, room_no)`, FK to `cust_id`, FK to `emp_id`. CHECK (`check_out > check_in`). |
| **Derived Attribute** (`total_amount`) | `v_booking_bill` (View) | **Not stored in table**. Derived dynamically: `nights * price_per_night - total_paid = balance_due`. |
| **PAYMENT** | `payment` | 1:N with `booking` ("paid by"). Modes: Cash, UPI, Card, Net Banking. Overpayment guarded by `sp_add_payment`. |
| **AUDIT LOGS** | `activity_logs` (MongoDB) | Captures action, entity, entity_id, performed_by, details, timestamp. Indexed on `timestamp`. |
| **GUEST FEEDBACK** | `feedback` (MongoDB) | Captures booking_id, cust_id, cust_name, rating (1-5), comment, createdAt. Indexed on `createdAt`. |

---

## 3. Database Objects Implemented

### SQL Views
1. `v_room_availability`: Real-time inventory status of all hotel rooms.
2. `v_booking_details`: Full join of bookings with customers, rooms, and receptionist staff.
3. `v_booking_bill`: Calculates stay duration, room charges, total payments received, and outstanding balance due.

### Stored Function & Procedures
1. `fn_nights(check_in, check_out)`: Deterministic function calculating night counts.
2. `sp_create_booking`: Transactional procedure enforcing room availability, maintenance blocks, capacity limits, and overlapping reservation prevention with `SIGNAL SQLSTATE '45000'`.
3. `sp_check_in`: Updates booking status to `Checked-in` and atomically marks the room as `Occupied`.
4. `sp_check_out`: Validates zero unpaid balance (`balance_due = 0`) before releasing room to `Available` and setting status to `Checked-out`.
5. `sp_cancel_booking`: Cancels future bookings and refunds payments.
6. `sp_add_payment`: Rejects negative amounts and refuses payments that exceed the remaining balance due.

### Triggers
1. `trg_validate_capacity_booking`: BEFORE INSERT trigger ensuring guest count does not exceed room capacity.
2. `trg_prevent_checkedout_modification`: BEFORE UPDATE trigger preventing tampering with checked-out reservations.

---

## 4. Prerequisites

- **Node.js** (v18+ or v20+) and **npm** installed.
- **MySQL Server 8.0** running locally on port `3306`.
- **MongoDB Community Server** running locally on port `27017`.
- **MySQL Workbench** and **MongoDB Compass** installed to view databases visually.

---

## 5. Quick Setup & Execution

### Step 1: Configure Environment Variables
Open the `.env` file in the project root:
```ini
PORT=3000

# MySQL Configuration
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_mysql_root_password
MYSQL_DATABASE=hotel_db

# MongoDB Configuration
MONGO_URI=mongodb://localhost:27017
MONGO_DATABASE=hotel_logs
```
> **Note**: Replace `your_mysql_root_password` with your actual MySQL root password.

### Step 2: Install Dependencies
```powershell
npm install
```

### Step 3: Run Database Setup & Verification
```powershell
npm run db:setup
```
This single command executes:
- Creates `hotel_db` in MySQL.
- Creates all 7 tables, 3 views, 1 function, 5 stored procedures, and 2 triggers.
- Inserts seed data: 1 Hotel, 20 Rooms, 6 Employees with skills, 10 Customers, 12 Bookings, and Payments.
- Creates `hotel_logs` in MongoDB, builds indexes, and seeds 15 activity logs and 6 guest reviews.
- Verifies every object on console.

### Step 4: Start the Server
```powershell
npm start
```
Open your browser and navigate to:
**[http://localhost:3000](http://localhost:3000)**

---

## 6. How to View Data in Visual Tools

### In MySQL Workbench
1. Open MySQL Workbench and connect to `localhost:3306` with user `root`.
2. Under **SCHEMAS** on the left navigator, find `hotel_db`.
3. Right-click on `Tables` &rarr; `Refresh All`.
4. You will see:
   - Tables: `hotel`, `room`, `employee`, `employee_skill`, `customer`, `booking`, `payment`.
   - Views: `v_booking_bill`, `v_booking_details`, `v_room_availability`.
   - Stored Procedures: `sp_add_payment`, `sp_cancel_booking`, `sp_check_in`, `sp_check_out`, `sp_create_booking`.
   - Functions: `fn_nights`.
5. Run:
   ```sql
   USE hotel_db;
   SELECT * FROM v_booking_bill;
   ```

### In MongoDB Compass
1. Open MongoDB Compass.
2. Connect to `mongodb://localhost:27017`.
3. Locate the database `hotel_logs`.
4. Open collections:
   - `activity_logs`: View audit logs created by system events.
   - `feedback`: View guest feedback and ratings.

---

## 7. Viva Presentation & Demo Script

Follow this 5-minute walkthrough during your project demonstration:

1. **Dashboard Overview**:
   - Show the KPI cards: Total Rooms (20), Available vs Occupied, Revenue this month, and the Occupancy by Category bar chart.
   - Point out that all data is fetched live from MySQL aggregates.

2. **Step 1: Check Room Inventory & Search**:
   - Go to **Bookings** &rarr; click **+ New Booking**.
   - Select Check-in and Check-out dates, set Guests count to 2, and click **Search Available Rooms**.
   - Show how it filters out Occupied and Maintenance rooms in real-time. Pick an available room (e.g. Room 202).
   - Select a guest and click **Confirm & Create Reservation**.
   - Explain: *This calls stored procedure `sp_create_booking` inside a database transaction, guarding against overlapping dates and capacity overages.*

3. **Step 2: Check-In**:
   - Find the newly created booking in the Bookings table (status: `Booked`).
   - Click the green **Check-in** button.
   - Show that the status changes to `Checked-in` and the corresponding room in the Rooms tab is automatically marked `Occupied`.

4. **Step 3: Billing & Attempt Check-Out (Constraint Demonstration)**:
   - Click the **Bill** button on this booking. Show the calculated total charges and the outstanding due.
   - Click **Check-out**.
   - The system intercepts the request and displays:  
     `"Cannot check out: Outstanding balance unpaid. Please clear dues before checkout."`
   - Explain: *This proves business logic is enforced inside MySQL procedure `sp_check_out`, not bypassed by client code.*

5. **Step 4: Record Payment**:
   - Click **Make Payment** or go to **Payments** &rarr; **+ Record Payment**.
   - Pay the full balance due using UPI / Card.
   - Explain: *Stored procedure `sp_add_payment` validates the amount and prevents accidental overpayment.*
   - Now click **Check-out** again: the check-out succeeds, booking status becomes `Checked-out`, and the room is released as `Available`.

6. **Step 5: SQL Implementation Slide (Reports Tab)**:
   - Navigate to the **SQL Reports** tab.
   - Click through the 10 queries (Monthly Revenue, Room Occupancy GROUP BY, Top VIP Customers HAVING, Unpaid Balances, Rooms Never Booked LEFT JOIN, Staff Workload).
   - Show the SQL query code and live results to the examiner.

7. **Step 6: MongoDB Activity Audit Trail & Guest Feedback**:
   - Navigate to the **MongoDB Logs** tab.
   - Show that every action just taken (Create Booking, Check-In, Payment, Check-Out) was automatically written to MongoDB `activity_logs`.
   - Submit a 5-star review in the Guest Feedback form and show it appear immediately in the review list.

# 📦 Warehouse & Logistics Management System
## 🎓 Complete Beginner's Project Guide & Viva Handbook

> **Target Audience:** College / University students presenting this project in DBMS Practical Lab, Semester Project Submission, and Viva Voce.

---

## 📑 Table of Contents
1. [Project Overview (What are we building and why?)](#1-project-overview)
2. [Understanding the Real-World Scenario](#2-understanding-the-real-world-scenario)
3. [ER Diagram Concepts Explained Simply](#3-er-diagram-concepts-explained-simply)
4. [ER to Relational Schema Mapping (How ER turns into SQL)](#4-er-to-relational-schema-mapping)
5. [Database Normalization (1NF, 2NF, 3NF Proof)](#5-database-normalization)
6. [The 7 Database Tables Explained](#6-the-7-database-tables-explained)
7. [Advanced DBMS Concepts: Triggers, Procedures & Views](#7-advanced-dbms-concepts)
8. [System Architecture (How Frontend, Backend & Database talk)](#8-system-architecture)
9. [Step-by-Step Setup Guide](#9-step-by-step-setup-guide)
10. [Top 15 Viva Voce Questions & Answers](#10-top-15-viva-voce-questions--answers)
11. [Live Demo Script for the Examiner](#11-live-demo-script-for-the-examiner)

---

## 1. Project Overview

### What is this project?
The **Warehouse & Logistics Management System** is a software solution designed to track goods stored across different regional warehouses and manage how those goods are packed, shipped, and delivered to customers via various freight carriers (Road, Rail, Air, Sea).

### Why do companies need it?
Imagine Amazon, Flipkart, or BlueDart. They manage thousands of items in warehouses across different cities:
- If a customer orders 5 laptops, the system must verify whether the selected warehouse actually has 5 laptops in stock.
- The system must **automatically reduce stock** the moment items are packed.
- If a delivery is cancelled, the system must **put the stock back** into the warehouse.
- Warehouse managers must know before stock runs out (Low Stock Alerts) and prevent warehouses from exceeding their physical capacity.

---

## 2. Understanding the Real-World Scenario

To understand the database, imagine this real-life workflow:
1. **Warehouses** exist in cities like Mumbai, Delhi, and Bengaluru. Each warehouse has a maximum capacity.
2. **Products** (like Barcode Scanners, Forklift Lights, Safety Boots) are supplied by sellers and stored in these warehouses.
3. The **Inventory Stock** records how many units of each product are present inside each warehouse.
4. When a dispatch is ordered, a **Shipment** is created from a specific warehouse to a customer's address using a **Carrier** (e.g., BlueDart, Delhivery).
5. The shipment contains several **Shipment Items** (e.g., 2 scanners, 10 safety vests).
6. As soon as the shipment items are entered, **database logic (Triggers)** automatically checks availability and subtracts stock.

---

## 3. ER Diagram Concepts Explained Simply

When your examiner looks at your ER (Entity-Relationship) diagram, they test your understanding of different attribute and entity types:

```
[ Warehouse ] 1 ---- keeps ---- N [ Inventory Stock ] N ---- tracks ---- 1 [ Product ]
      |                                                                        |
      | 1 (dispatch)                                                           | 1 (included in)
      v                                                                        v
 [ Shipment ] 1 =============== contains (Weak) =============== N [[ Shipment Item ]]
      ^
      | N (transports)
      |
  [ Carrier ] === (Multivalued) ===> (( Carrier Contacts ))
```

### Key Conceptual Highlights:

1. **Entity:** An object that exists in the real world (e.g., `Warehouse`, `Product`, `Carrier`, `Shipment`).
2. **Composite Attribute (Location):** 
   - A single concept made up of multiple sub-parts.
   - *Example:* A warehouse's address has `State`, `City`, and `Locality`.
   - *Relational Rule:* Flatten it into separate columns (`state`, `city`, `locality`).
3. **Multivalued Attribute (Support Contacts):**
   - An entity can have *more than one* value for this attribute.
   - *Example:* A carrier company like BlueDart has a customer care phone, an emergency phone, and an operations email.
   - *Relational Rule:* Never store comma-separated values in one column (violates 1NF). Instead, create a separate child table (`carrier_contact`) with a composite primary key `(carrier_id, contact)`.
4. **Weak Entity (`Shipment_Item`):**
   - An entity that cannot exist without its parent entity.
   - A `Shipment_Item` (e.g., "5 units of scanners") has no meaning unless it belongs to a valid `Shipment`.
   - Represented in ER by a **double rectangle** and identified by a composite key `(shipment_id, item_no)` along with `ON DELETE CASCADE`.

---

## 4. ER to Relational Schema Mapping

Here is the exact rule-by-rule conversion from ER concepts into Relational Tables:

| ER Concept | Applied To | Relational Implementation |
|---|---|---|
| **Regular Entity** | Warehouse, Product, Carrier | Separate tables with surrogate Primary Keys (`AUTO_INCREMENT`). |
| **Composite Attribute** | Warehouse Location | Flattened into `state VARCHAR(50)`, `city VARCHAR(50)`, `locality VARCHAR(100)`. |
| **Multivalued Attribute** | Carrier Support Contacts | New table `carrier_contact` with PK `(carrier_id, contact)`. |
| **1:N Relationship** | Warehouse $\to$ Shipment | Put the Foreign Key `source_warehouse_id` on the $N$ side (`shipment` table). |
| **1:N Relationship** | Carrier $\to$ Shipment | Put the Foreign Key `carrier_id` on the $N$ side (`shipment` table). |
| **Weak Entity** | Shipment $\to$ Shipment Item | Primary Key is `(shipment_id, item_no)` with `FOREIGN KEY (shipment_id) REFERENCES shipment(shipment_id) ON DELETE CASCADE`. |
| **M:N Relationship with Attributes** | Warehouse $\leftrightarrow$ Product | Resolved via associative entity `inventory_stock (stock_id, warehouse_id, product_id, quantity_available)`. |

---

## 5. Database Normalization

Examiners love asking: *"Is your database in 3NF? Prove it."*

### 1. First Normal Form (1NF)
- **Requirement:** Each column must contain atomic (single, indivisible) values; no repeating groups or arrays.
- **Proof:**
  - Phone numbers are not stored as `"9820011223, 9820011224"` in the `carrier` table. They are broken into atomic rows in `carrier_contact`.
  - Location is separated into `state`, `city`, and `locality`.
  - $\therefore$ The database is in **1NF**.

### 2. Second Normal Form (2NF)
- **Requirement:** Must be in 1NF, and all non-key attributes must be fully functionally dependent on the primary key (no partial dependencies on composite keys).
- **Proof:**
  - For composite PK `(shipment_id, item_no)` in `shipment_item`, the non-key attributes are `product_id` and `quantity_shipped`. Both depend on the specific item within that specific shipment. Product name and price are not duplicated in `shipment_item`; they remain in `product`.
  - For composite PK `(carrier_id, contact)` in `carrier_contact`, the only other attribute is `contact_type`, which describes that specific contact entry.
  - $\therefore$ The database is in **2NF**.

### 3. Third Normal Form (3NF)
- **Requirement:** Must be in 2NF, and no non-key attribute should depend on another non-key attribute (no transitive dependency $X \to Y \to Z$).
- **Proof:**
  - In `shipment`: `shipment_id` $\to$ `source_warehouse_id`. We do *not* store the warehouse city or state inside the `shipment` table. If we did, `shipment_id` $\to$ `warehouse_id` $\to$ `city` would be a transitive dependency.
  - In `inventory_stock`: `stock_id` $\to$ `product_id`. We do *not* store the product price or category in `inventory_stock`.
  - All functional dependencies $X \to Y$ satisfy: either $X$ is a superkey, or $Y$ is a prime attribute.
  - $\therefore$ The database is strictly in **3NF**.

---

## 6. The 7 Database Tables Explained

### Table 1: `warehouse`
Stores regional fulfillment centers and storage limits.
- `warehouse_id` (INT, PK, AUTO_INCREMENT)
- `warehouse_name` (VARCHAR)
- `state`, `city`, `locality` (VARCHAR)
- `storage_capacity` (INT, CHECK > 0)

### Table 2: `product`
Stores catalog items available for distribution.
- `product_id` (INT, PK, AUTO_INCREMENT)
- `product_name` (VARCHAR)
- `category` (VARCHAR)
- `seller` (VARCHAR)
- `price` (DECIMAL(10,2), CHECK >= 0)
- `sku` (VARCHAR, UNIQUE)

### Table 3: `inventory_stock`
Associative table linking products to warehouses with live counts.
- `stock_id` (INT, PK, AUTO_INCREMENT)
- `warehouse_id` (INT, FK $\to$ warehouse)
- `product_id` (INT, FK $\to$ product)
- `quantity_available` (INT, CHECK >= 0)
- `min_threshold` (INT, Default 10)
- `last_restock_date` (DATE)
- `UNIQUE (warehouse_id, product_id)` ensures a product is only listed once per warehouse.

### Table 4: `carrier`
Transport logistics companies.
- `carrier_id` (INT, PK, AUTO_INCREMENT)
- `company_name` (VARCHAR)
- `transport_type` (ENUM: 'Road', 'Rail', 'Air', 'Sea')
- `rating` (DECIMAL(2,1))

### Table 5: `carrier_contact`
Child table supporting multivalued contact lines.
- `carrier_id` (INT, FK $\to$ carrier)
- `contact` (VARCHAR)
- `contact_type` (VARCHAR: 'Phone', 'Email', 'Hotline')
- `PRIMARY KEY (carrier_id, contact)`

### Table 6: `shipment`
Outbound delivery headers.
- `shipment_id` (INT, PK, AUTO_INCREMENT)
- `tracking_no` (VARCHAR, UNIQUE)
- `carrier_id` (INT, FK $\to$ carrier)
- `source_warehouse_id` (INT, FK $\to$ warehouse)
- `destination_address` (VARCHAR)
- `estimated_delivery` (DATE)
- `status` (ENUM: 'Pending', 'In Transit', 'Delivered', 'Cancelled')

### Table 7: `shipment_item` (Weak Entity)
Line items belonging to each shipment.
- `shipment_id` (INT, FK $\to$ shipment ON DELETE CASCADE)
- `item_no` (INT)
- `product_id` (INT, FK $\to$ product)
- `quantity_shipped` (INT, CHECK > 0)
- `PRIMARY KEY (shipment_id, item_no)`

---

## 7. Advanced DBMS Concepts

*This section is what differentiates a top-scoring DBMS project from a simple web app.*

### ⚡ Trigger 1: Stock Deduction & Validation (`trg_deduct_stock`)
- **Event:** `BEFORE INSERT ON shipment_item`
- **What it does:**
  1. Finds the `source_warehouse_id` of the shipment.
  2. Checks `inventory_stock` for that product in that warehouse.
  3. If stock is less than `quantity_shipped`, it halts execution using:
     ```sql
     SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Insufficient stock for product in source warehouse.';
     ```
  4. If stock is sufficient, it immediately executes:
     ```sql
     UPDATE inventory_stock 
     SET quantity_available = quantity_available - NEW.quantity_shipped
     WHERE warehouse_id = v_warehouse_id AND product_id = NEW.product_id;
     ```
- **Why it matters:** The stock calculation happens in the **SQL engine**, not in JavaScript. Even if someone bypasses the UI and enters data directly in MySQL, stock rules cannot be broken!

### ⚡ Trigger 2: Automatic Stock Return on Cancel (`trg_restore_stock_on_cancel`)
- **Event:** `AFTER UPDATE ON shipment`
- **Condition:** `IF NEW.status = 'Cancelled' AND OLD.status != 'Cancelled'`
- **What it does:** Joins `shipment_item` with `inventory_stock` and adds back all item quantities to the source warehouse inventory.

### ⚙️ Stored Procedure: Restock Product (`sp_restock_product`)
- **Input Parameters:** `(p_warehouse_id, p_product_id, p_quantity, p_restock_date)`
- **Logic:** Checks if a row already exists in `inventory_stock`. If yes, it increments `quantity_available` and updates `last_restock_date`. If not, it creates a new record.

### 📊 Database Views (Virtual Tables)
Views provide pre-computed SQL queries that look and act like tables:
1. `v_warehouse_utilization`: Calculates `SUM(quantity_available)` grouped by warehouse, comparing current stock against max storage capacity as a percentage.
2. `v_carrier_performance`: Computes total orders, delivered count, and transit completion percentage per carrier.
3. `v_low_stock`: Filters inventory items where `quantity_available <= min_threshold`.
4. `v_top_products`: Ranks products by `SUM(quantity_shipped)` in descending order.
5. `v_late_shipments`: Uses `DATEDIFF(CURDATE(), estimated_delivery)` to identify overdue shipments.

---

## 8. System Architecture

```
[ User Browser ]
       |
       | HTTP Requests (JSON)
       v
[ React Frontend (Vite + Tailwind) ]  <-- Port 3000
       |
       | REST API Calls (Axios Proxy)
       v
[ Express Backend (Node.js) ]          <-- Port 5000
       |
       | Connection Pool (mysql2/promise)
       v
[ MySQL 8.0 Server ]                  <-- Port 3306 (InnoDB Engine)
  ├── logistics_db
  ├── Triggers (trg_deduct_stock)
  ├── Procedures (sp_restock_product)
  └── Views (v_warehouse_utilization, etc.)
```

---

## 9. Step-by-Step Setup Guide

### Prerequisites
- Node.js installed (`node -v`)
- MySQL 8.0 installed and running

### Step 1: Initialize Database in MySQL Workbench
1. Open **MySQL Workbench**.
2. Connect to **Local instance MySQL80**.
3. Open `database/schema.sql` and click the **⚡ Execute** button.
4. Open `database/seed.sql` and click the **⚡ Execute** button.
5. Refresh the Schemas panel; you will see `logistics_db`.

### Step 2: Configure Backend Database Password
Open `backend/.env` and update your password:
```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=logistics_db
DB_PORT=3306
```

### Step 3: Run the Application
Open two command prompt or PowerShell windows:

**Terminal 1 (Backend):**
```powershell
cd C:\Users\Ayush\OneDrive\Attachments\Desktop\DBMS\backend
npm run dev
```

**Terminal 2 (Frontend):**
```powershell
cd C:\Users\Ayush\OneDrive\Attachments\Desktop\DBMS\frontend
npm run dev
```

Visit **`http://localhost:3000`** in your browser!

---

## 10. Top 15 Viva Voce Questions & Answers

### Q1: What is the primary key of `shipment_item`?
> **Answer:** It has a **composite primary key** consisting of `(shipment_id, item_no)`. This uniquely identifies each individual line item within a shipment.

### Q2: Why is `shipment_item` considered a weak entity?
> **Answer:** Because an item row cannot exist without a parent `shipment`. If a shipment record is deleted, its items have no independent existence and are deleted automatically via `ON DELETE CASCADE`.

### Q3: How did you handle the multivalued attribute for carrier contacts?
> **Answer:** Storing multiple contacts in one field violates 1NF. We converted it into a separate table `carrier_contact` having `carrier_id` and `contact` as a composite primary key with a foreign key referencing `carrier(carrier_id)`.

### Q4: How is inventory deducted when an order is shipped? In Node.js or in MySQL?
> **Answer:** In **MySQL**, using a `BEFORE INSERT` trigger named `trg_deduct_stock`. This ensures data integrity at the database layer regardless of which frontend or API writes to the table.

### Q5: What happens if someone tries to order 100 units when only 10 are available?
> **Answer:** The trigger raises a custom database exception using `SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Insufficient stock...'`. The database aborts the transaction and rolls back changes.

### Q6: What is a Database View, and where did you use it?
> **Answer:** A View is a stored virtual table defined by a SQL query. We used views like `v_warehouse_utilization` to compute aggregated metrics (total stock vs capacity percentage) without modifying physical tables.

### Q7: Why did you use `mysql2/promise` with a connection pool instead of a single connection?
> **Answer:** A connection pool maintains reusable connections. It prevents opening and closing TCP handshakes on every request, supports concurrent client requests, and promises enable clean `async/await` syntax.

### Q8: What storage engine did you use in MySQL and why?
> **Answer:** **InnoDB**, because it provides full ACID compliance, foreign key constraints, row-level locking (`FOR UPDATE`), and transaction support (`COMMIT` / `ROLLBACK`).

### Q9: What is the difference between a Trigger and a Stored Procedure?
> **Answer:** A **Trigger** executes automatically in response to a specific database event (`INSERT`, `UPDATE`, `DELETE`). A **Stored Procedure** must be explicitly invoked by an application or user using `CALL procedure_name(...)`.

### Q10: How did you handle cancellation of shipments?
> **Answer:** We created an `AFTER UPDATE` trigger `trg_restore_stock_on_cancel`. When `status` changes to `'Cancelled'`, it automatically returns all quantities of the shipment's items back to the warehouse's `inventory_stock`.

### Q11: What is a Surrogate Key versus a Natural Key?
> **Answer:** A natural key is an attribute with real-world uniqueness (like `sku` or `tracking_no`). A surrogate key is an artificial identifier generated by the system (like `warehouse_id INT AUTO_INCREMENT`) to improve join performance and indexing.

### Q12: Why are indexes added to `tracking_no` and `status`?
> **Answer:** Shipments are frequently searched by tracking number and filtered by status. B-Tree indexes on `shipment(tracking_no)` and `shipment(status)` reduce query search time from $O(N)$ full table scans to $O(\log N)$.

### Q13: Can you explain ACID properties in this project?
> **Answer:**
> - **Atomicity:** Creating a shipment and inserting its items are wrapped in a single transaction; if one fails, all rollback.
> - **Consistency:** Triggers reject invalid stock reductions, keeping counts accurate.
> - **Isolation:** `SELECT ... FOR UPDATE` locks stock rows during checkout to prevent race conditions.
> - **Durability:** Committed transactions are permanently saved in InnoDB transaction redo logs on disk.

### Q14: How does your UI prevent SQL Injection?
> **Answer:** All backend queries use **parameterized queries** with placeholder markers (`?`). Input parameters are sent separately from the SQL statement to the database driver, preventing malicious SQL code injection.

### Q15: How do you show the ER diagram to the examiner in MySQL Workbench?
> **Answer:** In MySQL Workbench, go to **Database $\to$ Reverse Engineer**, select `logistics_db`, and Workbench automatically renders the visual schema with tables, relationships, and foreign keys.

---

## 11. Live Demo Script for the Examiner

When the examiner says *"Show me your project"*, follow this 3-minute sequence:

1. **Show the Dashboard:**
   - Point out the KPI cards (Warehouses, Stock, Dispatches, Low-Stock Warnings).
   - Show the Bar Chart comparing **Warehouse Capacity vs Occupied Stock**.
2. **Demonstrate the Trigger in Action (Stock Deduction):**
   - Go to **Inventory Stocks**. Point to a product (e.g., *Ergonomic Barcode Scanner* in Mumbai: 120 units).
   - Go to **New Shipment**. Select *Apex Western Hub (Mumbai)*.
   - Add 10 units of the scanner and click **Dispatch Shipment**.
   - Return to **Inventory Stocks**; show that stock dropped to **110 units** automatically!
3. **Demonstrate Constraint Violation (Examiner favorite!):**
   - Go to **New Shipment**. Try ordering **999 units** of a product that only has 10 units left.
   - Click **Dispatch Shipment**.
   - Show the red database error banner: *"Insufficient stock for product in source warehouse."*
   - Mention: *"Sir/Ma'am, this error came directly from our SQL Trigger `trg_deduct_stock` using `SIGNAL SQLSTATE '45000'`."*
4. **Demonstrate Stock Restoration on Cancellation:**
   - Go to **Shipments**. Click **Cancel Shipment** on any active order.
   - Show the message confirming that `trg_restore_stock_on_cancel` executed and returned the stock.
5. **Show Stored Procedure Restocking:**
   - Go to **Inventory Stocks**. Click **Restock** on a low-stock item.
   - Restock 50 units. Explain that this executes `CALL sp_restock_product(...)`.
6. **Show SQL Reports & Views:**
   - Go to **Reports & Analytics**. Show the tabs powered by views (`v_warehouse_utilization`, `v_carrier_performance`, `v_top_products`).
7. **Show MySQL Workbench:**
   - Open Workbench and show `Reverse Engineer` to display the relational schema diagram.

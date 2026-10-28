# Warehouse & Logistics Management System (DBMS Project)

A complete, full-stack, enterprise-grade **Warehouse & Logistics Management System** built with **MySQL 8.0**, **Node.js (Express)**, and **React 19 (Vite + Tailwind CSS)**.

---

## 📁 Project Directory Structure

```
DBMS/
├── database/
│   ├── schema.sql           # Complete schema: DDL, Triggers, Stored Procedures, Views, Indexes
│   ├── seed.sql             # Realistic demo dataset (5 hubs, 20 products, 5 carriers, dispatches)
│   └── setup_all.sql        # Single master script to run everything in MySQL Workbench / CLI
├── backend/
│   ├── config/
│   │   └── db.js            # MySQL connection pool with automatic error handling
│   ├── routes/
│   │   ├── warehouses.js    # Hub CRUD & capacity utilization tracking
│   │   ├── products.js      # Products catalog & category filtering
│   │   ├── inventory.js     # Stock management & stored procedure restocking
│   │   ├── carriers.js      # Carrier fleets & multivalued contact hotlines
│   │   ├── shipments.js     # Transactional dispatch creation & trigger checks
│   │   ├── tracking.js      # Live milestone tracking API
│   │   └── reports.js       # Views, GROUP BY, and analytical aggregations
│   ├── scripts/
│   │   └── setup_db.js      # Automated database initialization script
│   ├── server.js            # Express application entrypoint
│   ├── .env                 # Database credentials & server port
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/client.js    # Axios client with proxy & error handling
│   │   ├── components/      # Sidebar, Header, StatCard, Badge, Modal
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx        # Logistics command KPIs & Recharts graphs
│   │   │   ├── Warehouses.jsx       # Facility hubs & capacity progress bars
│   │   │   ├── Products.jsx         # Product catalog with search & categories
│   │   │   ├── Inventory.jsx        # Stock monitors & stored procedure restocking
│   │   │   ├── Carriers.jsx         # Multivalued contact support & fleets
│   │   │   ├── Shipments.jsx        # Dispatch status updates & weak entity manifests
│   │   │   ├── CreateShipment.jsx   # Live stock validation & trigger test form
│   │   │   ├── Tracking.jsx         # Public tracking portal with delivery timeline
│   │   │   └── Reports.jsx          # Database intelligence & SQL views
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── vite.config.js       # Vite config with Tailwind CSS & API proxy
│   └── package.json
├── package.json             # Root scripts for easy multi-service startup
└── README.md
```

---

## 🛠️ Step 1: Database Setup in MySQL Workbench

### Option A: Using MySQL Workbench (Recommended)

1. Open **MySQL Workbench**.
2. Click on your local instance connection (e.g., **Local instance MySQL80**, port `3306`, user `root`).
3. In the top menu bar, click **File → Open SQL Script...**
4. Navigate to:
   ```
   C:\Users\Ayush\OneDrive\Attachments\Desktop\DBMS\database\schema.sql
   ```
5. Click the **Execute (Lightning Bolt ⚡)** icon to run the script.
6. Next, open and execute:
   ```
   C:\Users\Ayush\OneDrive\Attachments\Desktop\DBMS\database\seed.sql
   ```
7. In the Schemas panel on the left, right-click and choose **Refresh All**. You will now see `logistics_db` with all tables, views, stored procedures, and triggers!

#### Reverse Engineer ER Diagram in MySQL Workbench:
- In Workbench, go to **Database → Reverse Engineer...**
- Follow the wizard and select `logistics_db`.
- Workbench will automatically draw the full relational schema diagram with primary and foreign keys!

---

### Option B: Automatic Script Execution

You can also run the database setup directly from the terminal:

1. Open `backend/.env` and ensure `DB_PASSWORD` matches your MySQL root password:
   ```env
   PORT=5000
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=logistics_db
   DB_PORT=3306
   ```

2. Run the automated setup runner:
   ```bash
   node backend/scripts/setup_db.js
   ```

---

## 🚀 Step 2: Running the Application

### 1. Start the Backend API (Port 5000)

```bash
cd C:\Users\Ayush\OneDrive\Attachments\Desktop\DBMS\backend
npm run dev
```
You should see:
```
====================================================
 Logistics Management Backend running on port 5000
 http://localhost:5000/api/health
====================================================
[DB] Successfully connected to MySQL database: logistics_db
```

### 2. Start the Frontend (Port 3000)

Open a second terminal window and run:

```bash
cd C:\Users\Ayush\OneDrive\Attachments\Desktop\DBMS\frontend
npm run dev
```

Open your browser and navigate to:
```
http://localhost:3000
```

---

## 🎓 DBMS Evaluation & Viva Demonstration Guide

Here is a step-by-step demonstration walkthrough for practical exams and viva presentations:

### 1. ER to Relational Mapping & Normalization (3NF)
- **Composite Attribute:** The `location` attribute on Warehouse was flattened into `state`, `city`, and `locality`.
- **Multivalued Attribute:** Carrier support contacts were decomposed into a dedicated `carrier_contact (carrier_id, contact, contact_type)` relation with a composite primary key.
- **Weak Entity:** `shipment_item` represents the weak entity manifest that depends on `shipment` with `ON DELETE CASCADE`.
- **3NF Proof:** All non-key attributes are fully functionally dependent only on the primary keys without transitive dependencies ($X \to Y$ holds with $X$ as superkey).

### 2. Demonstration: Automatic Inventory Deduction Trigger (`trg_deduct_stock`)
1. In the app, navigate to **Inventory Stocks**. Note the stock for a product (e.g., *Ergonomic Industrial Barcode Scanner* in Mumbai Hub: 120 units).
2. Go to **New Shipment**.
3. Choose **Apex Western Logistics Hub (Mumbai)**.
4. Add 10 units of *Ergonomic Industrial Barcode Scanner*.
5. Click **Dispatch Shipment**.
6. Return to **Inventory Stocks**; observe that the stock has dropped from 120 to 110 automatically via the database trigger.

### 3. Demonstration: Trigger Constraint Blocking Over-Shipment (`SIGNAL SQLSTATE '45000'`)
1. Go to **New Shipment**.
2. Select an item that has only 8 units left.
3. Try ordering 50 units.
4. Click **Dispatch Shipment**.
5. Observe the error banner: `"Insufficient stock for product in source warehouse."`
6. Explain to the examiner that this validation occurred at the **database level inside the MySQL engine**, triggering an automatic rollback of the transaction.

### 4. Demonstration: Stock Restoration on Cancellation (`trg_restore_stock_on_cancel`)
1. Go to **Shipments**.
2. Locate any active shipment (e.g. status *Pending* or *In Transit*).
3. Click the **Cancel Shipment** button.
4. Observe the message confirming that the `trg_restore_stock_on_cancel` trigger has executed and returned all item quantities back to the source warehouse.

### 5. Demonstration: Stored Procedure (`sp_restock_product`)
1. Go to **Inventory Stocks**.
2. Click **Restock** on any low-stock product.
3. Enter 100 units and click **Execute Restock**.
4. The system invokes `CALL sp_restock_product(warehouse_id, product_id, quantity, date)`.

### 6. Demonstration: Public Tracking Portal
1. Go to **Live Tracking**.
2. Click any test tracking number chip (e.g. `TRK-2026-MUM-1001`).
3. View the milestone progress tracker, carrier support contact lines, and cargo manifest.

### 7. Demonstration: SQL Views and Reports
1. Go to **Reports & Analytics**.
2. Show the examiner the 5 live reports:
   - `v_warehouse_utilization` (Demonstrating `GROUP BY` and capacity percentage math)
   - `v_carrier_performance` (Demonstrating multi-table `JOIN` and status counts)
   - `v_top_products` (Demonstrating `SUM(quantity_shipped)` ranking)
   - `v_late_shipments` (Demonstrating `DATEDIFF()` and `CURDATE()` filtering)
   - `v_low_stock` (Demonstrating threshold alerts)

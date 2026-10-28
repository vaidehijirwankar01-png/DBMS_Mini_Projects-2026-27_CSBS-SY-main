# 🛒 Online Shopping Management Database System (DBMS Project)

A complete, fully functional prototype implementation based on an Entity-Relationship (ER) model and Relational Schema for an Online Shopping Management System.

---

## 📁 Project Directory Structure

```
C:\Users\ruble\OneDrive\Desktop\dbms project/
├── schema.sql           # Complete MySQL database creation script with tables, constraints, views, and seed data
├── package.json         # Node.js dependencies (Express, MySQL2, CORS, Bcryptjs, Dotenv)
├── .env                 # Database credentials configuration (Host, User, Password, Database, Port)
├── .env.example         # Template for environment variables
├── db.js                # MySQL2 connection pool setup with error diagnostics
├── server.js            # Express REST API backend with full ACID transaction routing
├── README.md            # Comprehensive documentation & DBMS Viva guide
└── public/              # Modern Vanilla Frontend (No frameworks, pure HTML/CSS/JS + Chart.js)
    ├── index.html       # Product catalog, live search, categories, cart & checkout
    ├── orders.html      # Order history joined with payment and shipment info
    ├── dashboard.html   # Real-time analytics dashboard with Chart.js charts
    ├── login.html       # Customer login, registration & session switcher
    ├── app.js           # Frontend client-side business logic & API fetch calls
    └── style.css        # Clean, modern, responsive styling
```

---

## 🚀 Quick Start Guide

### Step 1: Execute the Database Script in MySQL Workbench
1. Open **MySQL Workbench**.
2. Connect to your local MySQL instance (usually `root` on port `3306`).
3. Click **File** ➔ **Open SQL Script...** (or press `Ctrl + Shift + O`).
4. Select `schema.sql` from `C:\Users\ruble\OneDrive\Desktop\dbms project\schema.sql`.
5. Click the **Execute (⚡ Lightning Bolt)** icon on the toolbar.
6. In the left *Schemas* panel, click the refresh button to see `shopping_db` with all 9 tables and views created and populated!

---

### Step 2: Configure Your MySQL Password
Open the `.env` file located in `C:\Users\ruble\OneDrive\Desktop\dbms project\.env`:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=YOUR_MYSQL_WORKBENCH_PASSWORD
DB_NAME=shopping_db
DB_PORT=3306
PORT=3000
```
> **Note:** Replace `YOUR_MYSQL_WORKBENCH_PASSWORD` with the password you use when logging into MySQL Workbench. If you don't have a password set, leave it empty: `DB_PASSWORD=`.

---

### Step 3: Run the Server
Dependencies are already installed in `node_modules`. To start the backend:

1. Open PowerShell or Command Prompt.
2. Navigate to the project folder:
   ```powershell
   cd "C:\Users\ruble\OneDrive\Desktop\dbms project"
   ```
3. Start the application:
   ```powershell
   node server.js
   ```
   *(Or run `npm start`)*

4. You should see:
   ```
   🚀 Online Shopping Management API is running!
   📡 URL: http://localhost:3000
   ✅ Connected successfully to MySQL database: shopping_db
   ```

---

### Step 4: Open and Explore the Web App
Open your web browser and navigate to:
- **Shopping Store & Checkout:** [http://localhost:3000](http://localhost:3000)
- **Order History & Tracking:** [http://localhost:3000/orders.html](http://localhost:3000/orders.html)
- **DBMS Analytics Dashboard:** [http://localhost:3000/dashboard.html](http://localhost:3000/dashboard.html)
- **User Account Switcher:** [http://localhost:3000/login.html](http://localhost:3000/login.html)

---

## 💡 DBMS Concepts & Viva Talking Points

### 1. Relational Schema & 3rd Normal Form (3NF)
- **No Transitive Dependencies:** Customer details are in `CUSTOMER`, shipping addresses are segregated in `ADDRESS`.
- **Atomic Attributes:** All fields contain indivisible values.
- **Normalization:** Avoids update, insertion, and deletion anomalies.

### 2. Resolving Many-to-Many Relationships
- An order can contain multiple products, and a product can appear in multiple orders.
- `ORDER_ITEM` serves as the **associative / junction table** with composite primary key `(order_id, product_id)`.

### 3. Historical Price Integrity
- `ORDER_ITEM` explicitly stores `unit_price`.
- **Reason:** If a store changes a product's price in the `PRODUCT` table next month, historical records of past orders must retain the exact price charged at the moment of checkout.

### 4. Enforcing 0..1 Cardinality (1-to-1)
- In the ER diagram, an order has at most 1 payment and at most 1 shipment.
- Enforced in MySQL using `UNIQUE` constraints on `PAYMENT.order_id` and `SHIPMENT.order_id`.

### 5. ACID Transaction Demo (`POST /api/orders`)
The order checkout process touches 5 tables inside a single atomic database transaction:
1. **Concurrency Lock:** `SELECT ... FROM PRODUCT ... FOR UPDATE` locks selected rows to prevent race conditions (two customers buying the same last item at the exact same millisecond).
2. **Stock Verification:** Confirms `stock_qty >= quantity`.
3. **Insert Order:** Creates record in `ORDERS`.
4. **Insert Items & Deduct Stock:** Inserts rows into `ORDER_ITEM` and decreases `stock_qty` in `PRODUCT`.
5. **Insert Payment:** Records payment in `PAYMENT`.
6. **Insert Shipment:** Generates shipment record with carrier and tracking number in `SHIPMENT`.
7. **Commit / Rollback:** If any step fails (e.g., negative stock), `conn.rollback()` restores all 5 tables to their exact prior state.

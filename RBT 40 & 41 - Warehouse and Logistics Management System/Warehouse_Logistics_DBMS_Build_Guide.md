# Warehouse & Logistics Management System: Phase-wise Build Guide

## What your ER diagram contains

| Entity | Attributes |
|---|---|
| **Warehouse** | warehouse_ID (PK), warehouse_name, storage_capacity, location (composite: state, city, locality) |
| **Inventory stocks** | StockId (PK), warehouse_ID, Product_id, Quantity_available, Last_restock_date |
| **Product** | product ID (PK), product name, price, category, seller |
| **Carrier** | Carrier_id (PK), company_name, Transport_type, Support_contact (multivalued) |
| **Shipment** | Shipment id (PK), Carrier_id, Source_warehouse_id, Estimated_delivery |
| **Shipment_item** | Shipment_item_id (PK), Shipment_tracking_no, Product_id, Quantity_shipped |

**Relationships:**

- Warehouse 1 → N Inventory stocks (*keeps*)
- Inventory stocks N → 1 Product (*tracking*)
- Warehouse 1 → N Shipment (*dispatch*)
- Carrier 1 → N Shipment (*transports*)
- Shipment 1 → N Shipment_item (*contains*, the double diamond)
- Shipment_item N → 1 Product (*included in*)

### Things to fix before you build

Your examiner may notice these:

1. Shipment's key is labelled `Shipment_item_id`. It should be `Shipment_id`, and the shipment_item table has its own item key.
2. `Shipment_tracking_no` sits on Shipment_item. It belongs on **Shipment**, since one shipment has one tracking number.
3. The double border and double diamond are on Shipment, but the weak entity is really **Shipment_item**, because it depends on Shipment.
4. Add a `status` column to Shipment (Pending, In Transit, Delivered, Cancelled). Without it, "tracking" has little to show.

---

## Recommended stack

- **Database:** MySQL (or PostgreSQL)
- **Backend:** Node.js + Express with `mysql2`. Flask is a fine alternative if you prefer Python.
- **Frontend:** React (Vite) + Tailwind, with Axios for API calls.

---

## Phase 1: Finalize design and map ER to relational schema (Day 1-2)

Mapping rules to apply:

- **Composite attribute** (location): flatten it into `state`, `city`, `locality` columns.
- **Multivalued attribute** (Support_contact): make a separate `carrier_contact` table.
- **1:N relationships:** put the FK on the "N" side.
- **Weak entity:** the key of Shipment_item is (shipment_id, item_no), or a surrogate ID plus an FK with `ON DELETE CASCADE`.

Resulting tables: `warehouse`, `product`, `inventory_stock`, `carrier`, `carrier_contact`, `shipment`, `shipment_item`.

Also check normalization (3NF) and write down your functional dependencies, because the project report will ask for them.

---

## Phase 2: Create the database (Day 2-3)

```sql
CREATE DATABASE logistics_db;
USE logistics_db;

CREATE TABLE warehouse (
  warehouse_id     INT AUTO_INCREMENT PRIMARY KEY,
  warehouse_name   VARCHAR(100) NOT NULL,
  state            VARCHAR(50)  NOT NULL,
  city             VARCHAR(50)  NOT NULL,
  locality         VARCHAR(80),
  storage_capacity INT NOT NULL CHECK (storage_capacity > 0)
);

CREATE TABLE product (
  product_id   INT AUTO_INCREMENT PRIMARY KEY,
  product_name VARCHAR(120) NOT NULL,
  category     VARCHAR(60),
  seller       VARCHAR(100),
  price        DECIMAL(10,2) NOT NULL CHECK (price >= 0)
);

CREATE TABLE inventory_stock (
  stock_id           INT AUTO_INCREMENT PRIMARY KEY,
  warehouse_id       INT NOT NULL,
  product_id         INT NOT NULL,
  quantity_available INT NOT NULL DEFAULT 0 CHECK (quantity_available >= 0),
  last_restock_date  DATE,
  UNIQUE (warehouse_id, product_id),
  FOREIGN KEY (warehouse_id) REFERENCES warehouse(warehouse_id) ON DELETE CASCADE,
  FOREIGN KEY (product_id)   REFERENCES product(product_id)
);

CREATE TABLE carrier (
  carrier_id     INT AUTO_INCREMENT PRIMARY KEY,
  company_name   VARCHAR(100) NOT NULL,
  transport_type ENUM('Road','Rail','Air','Sea') NOT NULL
);

CREATE TABLE carrier_contact (         -- multivalued attribute
  carrier_id INT NOT NULL,
  contact    VARCHAR(60) NOT NULL,
  PRIMARY KEY (carrier_id, contact),
  FOREIGN KEY (carrier_id) REFERENCES carrier(carrier_id) ON DELETE CASCADE
);

CREATE TABLE shipment (
  shipment_id         INT AUTO_INCREMENT PRIMARY KEY,
  tracking_no         VARCHAR(30) NOT NULL UNIQUE,
  carrier_id          INT NOT NULL,
  source_warehouse_id INT NOT NULL,
  estimated_delivery  DATE,
  status ENUM('Pending','In Transit','Delivered','Cancelled') DEFAULT 'Pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (carrier_id)          REFERENCES carrier(carrier_id),
  FOREIGN KEY (source_warehouse_id) REFERENCES warehouse(warehouse_id)
);

CREATE TABLE shipment_item (           -- weak entity
  shipment_id      INT NOT NULL,
  item_no          INT NOT NULL,
  product_id       INT NOT NULL,
  quantity_shipped INT NOT NULL CHECK (quantity_shipped > 0),
  PRIMARY KEY (shipment_id, item_no),
  FOREIGN KEY (shipment_id) REFERENCES shipment(shipment_id) ON DELETE CASCADE,
  FOREIGN KEY (product_id)  REFERENCES product(product_id)
);
```

Then insert **realistic sample data**: about 4-5 warehouses, 20 products, 5 carriers and 30+ shipments. Good demo data makes the project look much stronger.

---

## Phase 3: Database logic (Day 3-5)

This is where a DBMS project earns its marks. Build these in SQL, not in application code:

1. **Trigger:** on `shipment_item` insert, deduct stock and block the insert if stock is insufficient.

   ```sql
   DELIMITER //
   CREATE TRIGGER trg_deduct_stock BEFORE INSERT ON shipment_item
   FOR EACH ROW
   BEGIN
     DECLARE avail INT;
     SELECT quantity_available INTO avail FROM inventory_stock
      WHERE warehouse_id = (SELECT source_warehouse_id FROM shipment WHERE shipment_id = NEW.shipment_id)
        AND product_id = NEW.product_id FOR UPDATE;
     IF avail IS NULL OR avail < NEW.quantity_shipped THEN
       SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Insufficient stock';
     END IF;
     UPDATE inventory_stock SET quantity_available = quantity_available - NEW.quantity_shipped
      WHERE warehouse_id = (SELECT source_warehouse_id FROM shipment WHERE shipment_id = NEW.shipment_id)
        AND product_id = NEW.product_id;
   END//
   DELIMITER ;
   ```

2. **Trigger:** restore stock when a shipment is set to `Cancelled`.
3. **Stored procedure** `create_shipment(...)`: wraps the shipment and its items in a **transaction** with rollback on error.
4. **Views:** `v_low_stock` (quantity below a threshold), `v_shipment_details` (shipment joined with carrier, warehouse and items), `v_warehouse_utilization`.
5. **Indexes** on `shipment(status)`, `shipment(tracking_no)` and `inventory_stock(product_id)`.
6. **Report queries** to demonstrate joins, GROUP BY, HAVING and subqueries:
   - Total stock per warehouse vs. capacity
   - Shipments per carrier
   - Top 5 shipped products
   - Late shipments (estimated delivery passed, not delivered)

---

## Phase 4: Backend API (Day 5-8)

**Setup:**

```
backend/
  server.js
  db.js              (mysql2 connection pool)
  routes/            (warehouses, products, inventory, carriers, shipments, reports)
  controllers/
  .env
```

```bash
npm init -y
npm i express mysql2 cors dotenv
```

**Endpoints:**

| Resource | Endpoints |
|---|---|
| Warehouses | `GET/POST /api/warehouses`, `PUT/DELETE /api/warehouses/:id` |
| Products | `GET/POST /api/products`, `PUT/DELETE /api/products/:id` |
| Inventory | `GET /api/inventory?warehouse=`, `POST /api/inventory` (add/restock), `PUT /api/inventory/:id` |
| Carriers | `GET/POST /api/carriers` (including contacts), `PUT/DELETE` |
| Shipments | `GET /api/shipments`, `GET /api/shipments/:id` (with items), `POST /api/shipments` (calls the procedure), `PATCH /api/shipments/:id/status` |
| Tracking | `GET /api/track/:trackingNo` |
| Reports | `GET /api/reports/low-stock`, `/utilization`, `/carrier-performance`, `/top-products` |

Key practices:

- Use **parameterized queries** (`?` placeholders) to prevent SQL injection.
- Return proper status codes and catch the trigger's "Insufficient stock" error, then send it to the frontend as a readable message.
- Test every endpoint in Postman or Thunder Client before starting the frontend.

---

## Phase 5: Frontend (Day 8-12)

**Setup:**

```bash
npm create vite@latest frontend -- --template react
npm i axios react-router-dom recharts
```

**Pages:**

1. **Dashboard:** cards for total warehouses, products and active shipments, a low-stock alert list, and a chart of shipments by status or stock per warehouse.
2. **Warehouses:** table plus add/edit form, showing a utilization bar (stock vs. capacity).
3. **Products:** searchable, filterable (category) table with CRUD.
4. **Inventory:** filter by warehouse, restock button, and highlighting of low stock.
5. **Carriers:** list with add/edit and multiple contact numbers.
6. **Create Shipment:** the key form. Choose a source warehouse, choose a carrier, then add multiple product rows with quantities. Available stock should show next to each product.
7. **Shipments:** list with status filter and a detail view showing items. Updating status is done here.
8. **Track Shipment:** enter a tracking number and see status, carrier, source and ETA.
9. **Reports:** the report queries from Phase 3 as tables or charts.

Structure the code as `pages/`, `components/` (Table, Modal, Form, StatCard), and `api/` (an Axios wrapper).

---

## Phase 6: Integration, polish and testing (Day 12-14)

- Add basic **login with roles** (Admin / Warehouse Manager), using a `users` table, bcrypt and JWT. This is optional but impressive.
- Test edge cases: shipping more than the available stock, deleting a warehouse that has shipments, and duplicate tracking numbers.
- Add input validation on both frontend and backend.
- Add loading states and error toasts.

---

## Phase 7: Documentation and demo (Day 14-15)

Prepare:

- The corrected ER diagram
- The relational schema diagram (MySQL Workbench can auto-generate it: Database → Reverse Engineer)
- The normalization proof
- The SQL script, with schema, data, triggers, procedures and views
- Screenshots
- A demo script. A good one goes: create a shipment, watch stock drop, cancel it, watch stock return, then show the trigger blocking an over-shipment.

---

## Suggested order of work

Schema → seed data → triggers and procedures → API for warehouses and products → inventory and shipments → frontend for each module in the same order → reports → polish.

Build one module end-to-end (database, API, UI) before moving to the next. That way you always have something working to demo.

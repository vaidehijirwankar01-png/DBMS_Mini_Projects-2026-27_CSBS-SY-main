-- =====================================================================
-- Warehouse & Logistics Management System - Database Schema
-- Database: logistics_db
-- =====================================================================

CREATE DATABASE IF NOT EXISTS logistics_db;
USE logistics_db;

-- ---------------------------------------------------------------------
-- 1. DROP EXISTING OBJECTS (FOR CLEAN RE-RUN)
-- ---------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_deduct_stock;
DROP TRIGGER IF EXISTS trg_restore_stock_on_cancel;
DROP TRIGGER IF EXISTS trg_check_capacity_insert;
DROP TRIGGER IF EXISTS trg_check_capacity_update;

DROP PROCEDURE IF EXISTS sp_restock_product;
DROP PROCEDURE IF EXISTS sp_update_shipment_status;

DROP VIEW IF EXISTS v_low_stock;
DROP VIEW IF EXISTS v_shipment_details;
DROP VIEW IF EXISTS v_warehouse_utilization;
DROP VIEW IF EXISTS v_carrier_performance;
DROP VIEW IF EXISTS v_top_products;
DROP VIEW IF EXISTS v_late_shipments;

DROP TABLE IF EXISTS shipment_item;
DROP TABLE IF EXISTS shipment;
DROP TABLE IF EXISTS carrier_contact;
DROP TABLE IF EXISTS carrier;
DROP TABLE IF EXISTS inventory_stock;
DROP TABLE IF EXISTS product;
DROP TABLE IF EXISTS warehouse;

-- ---------------------------------------------------------------------
-- 2. CREATE TABLES
-- ---------------------------------------------------------------------

-- Warehouse Table (Composite attribute 'location' flattened into state, city, locality)
CREATE TABLE warehouse (
    warehouse_id     INT AUTO_INCREMENT PRIMARY KEY,
    warehouse_name   VARCHAR(100) NOT NULL,
    state            VARCHAR(50)  NOT NULL,
    city             VARCHAR(50)  NOT NULL,
    locality         VARCHAR(100),
    storage_capacity INT NOT NULL CHECK (storage_capacity > 0),
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Product Table
CREATE TABLE product (
    product_id   INT AUTO_INCREMENT PRIMARY KEY,
    product_name VARCHAR(120) NOT NULL,
    category     VARCHAR(60)  NOT NULL,
    seller       VARCHAR(100),
    price        DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    sku          VARCHAR(50) UNIQUE,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Inventory Stock Table (Keeps track of product counts in warehouses)
CREATE TABLE inventory_stock (
    stock_id           INT AUTO_INCREMENT PRIMARY KEY,
    warehouse_id       INT NOT NULL,
    product_id         INT NOT NULL,
    quantity_available INT NOT NULL DEFAULT 0 CHECK (quantity_available >= 0),
    min_threshold      INT NOT NULL DEFAULT 10,
    last_restock_date  DATE,
    UNIQUE KEY uq_warehouse_product (warehouse_id, product_id),
    FOREIGN KEY (warehouse_id) REFERENCES warehouse(warehouse_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id)   REFERENCES product(product_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Carrier Table
CREATE TABLE carrier (
    carrier_id     INT AUTO_INCREMENT PRIMARY KEY,
    company_name   VARCHAR(100) NOT NULL,
    transport_type ENUM('Road', 'Rail', 'Air', 'Sea') NOT NULL,
    rating         DECIMAL(2,1) DEFAULT 4.5,
    is_active      BOOLEAN DEFAULT TRUE,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Carrier Contact Table (Multivalued attribute support)
CREATE TABLE carrier_contact (
    carrier_id   INT NOT NULL,
    contact      VARCHAR(60) NOT NULL,
    contact_type VARCHAR(30) DEFAULT 'Phone',
    PRIMARY KEY (carrier_id, contact),
    FOREIGN KEY (carrier_id) REFERENCES carrier(carrier_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Shipment Table (Corrected with tracking_no, status, source_warehouse_id)
CREATE TABLE shipment (
    shipment_id          INT AUTO_INCREMENT PRIMARY KEY,
    tracking_no          VARCHAR(40) NOT NULL UNIQUE,
    carrier_id           INT NOT NULL,
    source_warehouse_id  INT NOT NULL,
    destination_address  VARCHAR(255) NOT NULL,
    estimated_delivery   DATE NOT NULL,
    status               ENUM('Pending', 'In Transit', 'Delivered', 'Cancelled') NOT NULL DEFAULT 'Pending',
    created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (carrier_id)          REFERENCES carrier(carrier_id),
    FOREIGN KEY (source_warehouse_id) REFERENCES warehouse(warehouse_id)
) ENGINE=InnoDB;

-- Shipment Item Table (Weak entity depending on shipment)
CREATE TABLE shipment_item (
    shipment_id      INT NOT NULL,
    item_no          INT NOT NULL,
    product_id       INT NOT NULL,
    quantity_shipped INT NOT NULL CHECK (quantity_shipped > 0),
    PRIMARY KEY (shipment_id, item_no),
    FOREIGN KEY (shipment_id) REFERENCES shipment(shipment_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id)  REFERENCES product(product_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 3. INDEXES FOR PERFORMANCE OPTIMIZATION
-- ---------------------------------------------------------------------
CREATE INDEX idx_shipment_status ON shipment(status);
CREATE INDEX idx_shipment_tracking ON shipment(tracking_no);
CREATE INDEX idx_inventory_prod ON inventory_stock(product_id);
CREATE INDEX idx_inventory_wh ON inventory_stock(warehouse_id);
CREATE INDEX idx_product_category ON product(category);

-- ---------------------------------------------------------------------
-- 4. TRIGGERS
-- ---------------------------------------------------------------------

DELIMITER //

-- Trigger 1: Deduct stock automatically and reject if stock is insufficient
CREATE TRIGGER trg_deduct_stock
BEFORE INSERT ON shipment_item
FOR EACH ROW
BEGIN
    DECLARE v_warehouse_id INT;
    DECLARE v_avail INT;
    DECLARE v_product_name VARCHAR(120);

    -- Find the source warehouse for this shipment
    SELECT source_warehouse_id INTO v_warehouse_id
    FROM shipment
    WHERE shipment_id = NEW.shipment_id;

    -- Lock and check available inventory
    SELECT quantity_available INTO v_avail
    FROM inventory_stock
    WHERE warehouse_id = v_warehouse_id
      AND product_id = NEW.product_id
    FOR UPDATE;

    SELECT product_name INTO v_product_name
    FROM product
    WHERE product_id = NEW.product_id;

    -- Validation
    IF v_avail IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Item not stocked in source warehouse.';
    ELSEIF v_avail < NEW.quantity_shipped THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Insufficient stock for product in source warehouse.';
    END IF;

    -- Deduct stock
    UPDATE inventory_stock
    SET quantity_available = quantity_available - NEW.quantity_shipped
    WHERE warehouse_id = v_warehouse_id
      AND product_id = NEW.product_id;
END //

-- Trigger 2: Restore stock when shipment is Cancelled
CREATE TRIGGER trg_restore_stock_on_cancel
AFTER UPDATE ON shipment
FOR EACH ROW
BEGIN
    IF NEW.status = 'Cancelled' AND OLD.status != 'Cancelled' THEN
        -- Loop through shipment items and return quantities to inventory
        UPDATE inventory_stock inv
        JOIN shipment_item si ON inv.product_id = si.product_id
        SET inv.quantity_available = inv.quantity_available + si.quantity_shipped
        WHERE si.shipment_id = NEW.shipment_id
          AND inv.warehouse_id = NEW.source_warehouse_id;
    END IF;
END //

-- Trigger 3: Prevent warehouse storage overflow on insert
CREATE TRIGGER trg_check_capacity_insert
BEFORE INSERT ON inventory_stock
FOR EACH ROW
BEGIN
    DECLARE v_total_stock INT DEFAULT 0;
    DECLARE v_capacity INT DEFAULT 0;

    SELECT storage_capacity INTO v_capacity
    FROM warehouse
    WHERE warehouse_id = NEW.warehouse_id;

    SELECT COALESCE(SUM(quantity_available), 0) INTO v_total_stock
    FROM inventory_stock
    WHERE warehouse_id = NEW.warehouse_id;

    IF (v_total_stock + NEW.quantity_available) > v_capacity THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Operation rejected: Exceeds warehouse storage capacity.';
    END IF;
END //

-- Trigger 4: Prevent warehouse storage overflow on update
CREATE TRIGGER trg_check_capacity_update
BEFORE UPDATE ON inventory_stock
FOR EACH ROW
BEGIN
    DECLARE v_other_stock INT DEFAULT 0;
    DECLARE v_capacity INT DEFAULT 0;

    SELECT storage_capacity INTO v_capacity
    FROM warehouse
    WHERE warehouse_id = NEW.warehouse_id;

    SELECT COALESCE(SUM(quantity_available), 0) INTO v_other_stock
    FROM inventory_stock
    WHERE warehouse_id = NEW.warehouse_id
      AND stock_id != NEW.stock_id;

    IF (v_other_stock + NEW.quantity_available) > v_capacity THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Operation rejected: Exceeds warehouse storage capacity.';
    END IF;
END //

DELIMITER ;

-- ---------------------------------------------------------------------
-- 5. STORED PROCEDURES
-- ---------------------------------------------------------------------

DELIMITER //

-- Procedure to safely restock an inventory product
CREATE PROCEDURE sp_restock_product(
    IN p_warehouse_id INT,
    IN p_product_id INT,
    IN p_quantity INT,
    IN p_restock_date DATE
)
BEGIN
    DECLARE v_exists INT;

    IF p_quantity <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Restock quantity must be greater than zero.';
    END IF;

    SELECT COUNT(*) INTO v_exists
    FROM inventory_stock
    WHERE warehouse_id = p_warehouse_id AND product_id = p_product_id;

    IF v_exists > 0 THEN
        UPDATE inventory_stock
        SET quantity_available = quantity_available + p_quantity,
            last_restock_date = COALESCE(p_restock_date, CURDATE())
        WHERE warehouse_id = p_warehouse_id AND product_id = p_product_id;
    ELSE
        INSERT INTO inventory_stock (warehouse_id, product_id, quantity_available, last_restock_date)
        VALUES (p_warehouse_id, p_product_id, p_quantity, COALESCE(p_restock_date, CURDATE()));
    END IF;
END //

-- Procedure to update shipment status
CREATE PROCEDURE sp_update_shipment_status(
    IN p_shipment_id INT,
    IN p_new_status VARCHAR(20)
)
BEGIN
    UPDATE shipment
    SET status = p_new_status
    WHERE shipment_id = p_shipment_id;
END //

DELIMITER ;

-- ---------------------------------------------------------------------
-- 6. VIEWS FOR REPORTS & DASHBOARDS
-- ---------------------------------------------------------------------

-- View: Low Stock Alerts
CREATE VIEW v_low_stock AS
SELECT 
    i.stock_id,
    w.warehouse_id,
    w.warehouse_name,
    p.product_id,
    p.product_name,
    p.category,
    i.quantity_available,
    i.min_threshold,
    i.last_restock_date
FROM inventory_stock i
JOIN warehouse w ON i.warehouse_id = w.warehouse_id
JOIN product p ON i.product_id = p.product_id
WHERE i.quantity_available <= i.min_threshold;

-- View: Detailed Shipment Information
CREATE VIEW v_shipment_details AS
SELECT 
    s.shipment_id,
    s.tracking_no,
    s.status,
    s.destination_address,
    s.estimated_delivery,
    s.created_at,
    w.warehouse_id,
    w.warehouse_name AS source_warehouse_name,
    CONCAT(w.locality, ', ', w.city, ', ', w.state) AS warehouse_full_address,
    c.carrier_id,
    c.company_name AS carrier_name,
    c.transport_type,
    COALESCE(COUNT(si.item_no), 0) AS total_distinct_items,
    COALESCE(SUM(si.quantity_shipped), 0) AS total_units_shipped
FROM shipment s
JOIN warehouse w ON s.source_warehouse_id = w.warehouse_id
JOIN carrier c ON s.carrier_id = c.carrier_id
LEFT JOIN shipment_item si ON s.shipment_id = si.shipment_id
GROUP BY s.shipment_id, w.warehouse_id, c.carrier_id;

-- View: Warehouse Capacity Utilization
CREATE VIEW v_warehouse_utilization AS
SELECT 
    w.warehouse_id,
    w.warehouse_name,
    w.city,
    w.state,
    w.storage_capacity,
    COALESCE(SUM(i.quantity_available), 0) AS current_stock_units,
    ROUND((COALESCE(SUM(i.quantity_available), 0) / w.storage_capacity) * 100, 2) AS utilization_percentage
FROM warehouse w
LEFT JOIN inventory_stock i ON w.warehouse_id = i.warehouse_id
GROUP BY w.warehouse_id;

-- View: Carrier Performance Summary
CREATE VIEW v_carrier_performance AS
SELECT 
    c.carrier_id,
    c.company_name,
    c.transport_type,
    c.rating,
    COUNT(s.shipment_id) AS total_shipments,
    SUM(CASE WHEN s.status = 'Delivered' THEN 1 ELSE 0 END) AS delivered_count,
    SUM(CASE WHEN s.status = 'In Transit' THEN 1 ELSE 0 END) AS in_transit_count,
    SUM(CASE WHEN s.status = 'Pending' THEN 1 ELSE 0 END) AS pending_count,
    SUM(CASE WHEN s.status = 'Cancelled' THEN 1 ELSE 0 END) AS cancelled_count
FROM carrier c
LEFT JOIN shipment s ON c.carrier_id = s.carrier_id
GROUP BY c.carrier_id;

-- View: Top Shipped Products
CREATE VIEW v_top_products AS
SELECT 
    p.product_id,
    p.product_name,
    p.category,
    p.price,
    COALESCE(SUM(si.quantity_shipped), 0) AS total_quantity_shipped,
    COUNT(DISTINCT si.shipment_id) AS shipment_appearances
FROM product p
LEFT JOIN shipment_item si ON p.product_id = si.product_id
GROUP BY p.product_id
ORDER BY total_quantity_shipped DESC;

-- View: Late Shipments
CREATE VIEW v_late_shipments AS
SELECT 
    s.shipment_id,
    s.tracking_no,
    s.destination_address,
    s.estimated_delivery,
    s.status,
    DATEDIFF(CURDATE(), s.estimated_delivery) AS days_overdue,
    w.warehouse_name AS source_warehouse,
    c.company_name AS carrier_name
FROM shipment s
JOIN warehouse w ON s.source_warehouse_id = w.warehouse_id
JOIN carrier c ON s.carrier_id = c.carrier_id
WHERE s.estimated_delivery < CURDATE()
  AND s.status NOT IN ('Delivered', 'Cancelled');

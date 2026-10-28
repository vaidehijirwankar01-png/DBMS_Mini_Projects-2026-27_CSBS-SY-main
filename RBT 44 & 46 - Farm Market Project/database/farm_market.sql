-- =====================================================================
--  Farmer to Consumer Local Marketplace  -  database/farm_market.sql
--  Run in MySQL Workbench (or: mysql -u root -p < farm_market.sql)
-- =====================================================================

DROP DATABASE IF EXISTS farm_market;
CREATE DATABASE farm_market;
USE farm_market;

-- ---------------------------------------------------------------------
-- TABLES (from the ER diagram)
-- ---------------------------------------------------------------------

CREATE TABLE Farmer (
    farmer_id  INT AUTO_INCREMENT PRIMARY KEY,
    name       VARCHAR(100) NOT NULL,
    address    VARCHAR(255) NOT NULL,
    password   VARCHAR(100) NOT NULL
);

-- Phone Number is a multivalued attribute -> separate table
CREATE TABLE Farmer_Phone (
    farmer_id     INT         NOT NULL,
    phone_number  VARCHAR(15) NOT NULL,
    PRIMARY KEY (farmer_id, phone_number),
    FOREIGN KEY (farmer_id) REFERENCES Farmer(farmer_id) ON DELETE CASCADE
);

CREATE TABLE Consumer (
    consumer_id  INT AUTO_INCREMENT PRIMARY KEY,
    name         VARCHAR(100) NOT NULL,
    address      VARCHAR(255) NOT NULL,
    password     VARCHAR(100) NOT NULL
);

CREATE TABLE Consumer_Phone (
    consumer_id   INT         NOT NULL,
    phone_number  VARCHAR(15) NOT NULL,
    PRIMARY KEY (consumer_id, phone_number),
    FOREIGN KEY (consumer_id) REFERENCES Consumer(consumer_id) ON DELETE CASCADE
);

-- Farmer 1 --- N Products (List).  price is per unit (kg or g).
-- total_price is the derived (dotted) attribute = price * quantity
CREATE TABLE Products (
    product_id   INT AUTO_INCREMENT PRIMARY KEY,
    farmer_id    INT           NOT NULL,
    name         VARCHAR(100)  NOT NULL,
    category     VARCHAR(50)   NOT NULL,
    unit         ENUM('kg','g') NOT NULL DEFAULT 'kg',
    price        DECIMAL(10,2) NOT NULL CHECK (price > 0),
    quantity     DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    total_price  DECIMAL(12,2) GENERATED ALWAYS AS (price * quantity) STORED,
    FOREIGN KEY (farmer_id) REFERENCES Farmer(farmer_id) ON DELETE CASCADE
);

-- Consumer 1 --- N Order (Place).  total_price is derived (kept by triggers)
CREATE TABLE Orders (
    order_id          INT AUTO_INCREMENT PRIMARY KEY,
    consumer_id       INT           NOT NULL,
    order_date        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    delivery_address  VARCHAR(255)  NOT NULL,
    total_price       DECIMAL(12,2) NOT NULL DEFAULT 0,
    status            ENUM('Placed','Paid','Shipped','Delivered','Cancelled') NOT NULL DEFAULT 'Placed',
    FOREIGN KEY (consumer_id) REFERENCES Consumer(consumer_id) ON DELETE CASCADE
);

-- Weak entity: identified by (order_id, line_no).  Products 1 --- N Order_Details
CREATE TABLE Order_Details (
    order_id    INT           NOT NULL,
    line_no     INT           NOT NULL,
    product_id  INT           NOT NULL,
    quantity    DECIMAL(10,2) NOT NULL CHECK (quantity > 0),
    price       DECIMAL(10,2) NOT NULL DEFAULT 0,
    subtotal    DECIMAL(12,2) NOT NULL DEFAULT 0,
    PRIMARY KEY (order_id, line_no),
    FOREIGN KEY (order_id)   REFERENCES Orders(order_id)     ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES Products(product_id)
);

-- Order 1 --- 1 Payment (Through)
CREATE TABLE Payment (
    payment_id      INT AUTO_INCREMENT PRIMARY KEY,
    order_id        INT           NOT NULL UNIQUE,
    amount          DECIMAL(12,2) NOT NULL DEFAULT 0,
    payment_method  ENUM('UPI','Card','NetBanking','Cash on Delivery') NOT NULL,
    transaction_id  VARCHAR(50)   NOT NULL UNIQUE,
    FOREIGN KEY (order_id) REFERENCES Orders(order_id) ON DELETE CASCADE
);

-- Payment 1 --- N Delivery (Relationship).  Order_Id is derived via Payment
CREATE TABLE Delivery (
    delivery_id       INT AUTO_INCREMENT PRIMARY KEY,
    payment_id        INT          NOT NULL,
    delivery_date     DATE,
    tracking_id       VARCHAR(50)  NOT NULL UNIQUE,
    delivery_partner  VARCHAR(100) NOT NULL,
    FOREIGN KEY (payment_id) REFERENCES Payment(payment_id) ON DELETE CASCADE
);

-- Filled automatically by a trigger when a product is deleted
CREATE TABLE Product_Audit (
    audit_id    INT AUTO_INCREMENT PRIMARY KEY,
    product_id  INT,
    name        VARCHAR(100),
    farmer_id   INT,
    deleted_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------
-- TRIGGERS
-- ---------------------------------------------------------------------
DELIMITER $$

-- 1. Before a line is added: check stock, copy the current price, compute subtotal
CREATE TRIGGER trg_od_before_insert
BEFORE INSERT ON Order_Details
FOR EACH ROW
BEGIN
    DECLARE v_price DECIMAL(10,2);
    DECLARE v_stock DECIMAL(10,2);

    SELECT price, quantity INTO v_price, v_stock
    FROM Products WHERE product_id = NEW.product_id;

    IF v_price IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Product does not exist';
    END IF;
    IF NEW.quantity > v_stock THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Not enough stock available for a product';
    END IF;

    SET NEW.price    = v_price;
    SET NEW.subtotal = v_price * NEW.quantity;
END$$

-- 2. After a line is added: reduce stock and update the order total
CREATE TRIGGER trg_od_after_insert
AFTER INSERT ON Order_Details
FOR EACH ROW
BEGIN
    UPDATE Products SET quantity = quantity - NEW.quantity
    WHERE product_id = NEW.product_id;

    UPDATE Orders SET total_price = total_price + NEW.subtotal
    WHERE order_id = NEW.order_id;
END$$

-- 3. Cancelling an order: only unpaid orders, and the stock is returned
CREATE TRIGGER trg_orders_before_update
BEFORE UPDATE ON Orders
FOR EACH ROW
BEGIN
    IF NEW.status = 'Cancelled' AND OLD.status <> 'Cancelled' THEN
        IF OLD.status <> 'Placed' THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Only unpaid (Placed) orders can be cancelled';
        END IF;
        UPDATE Products p
        JOIN Order_Details d ON d.product_id = p.product_id
        SET p.quantity = p.quantity + d.quantity
        WHERE d.order_id = OLD.order_id;
    END IF;
END$$

-- 4. Before payment: order must be unpaid; amount is taken from the order
CREATE TRIGGER trg_payment_before_insert
BEFORE INSERT ON Payment
FOR EACH ROW
BEGIN
    DECLARE v_total  DECIMAL(12,2);
    DECLARE v_status VARCHAR(20);

    SELECT total_price, status INTO v_total, v_status
    FROM Orders WHERE order_id = NEW.order_id;

    IF v_status <> 'Placed' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'This order cannot be paid (already paid or cancelled)';
    END IF;
    SET NEW.amount = v_total;
END$$

-- 5. After payment: mark the order as Paid
CREATE TRIGGER trg_payment_after_insert
AFTER INSERT ON Payment
FOR EACH ROW
BEGIN
    UPDATE Orders SET status = 'Paid' WHERE order_id = NEW.order_id;
END$$

-- 6. After a delivery is created: mark the order as Shipped
CREATE TRIGGER trg_delivery_after_insert
AFTER INSERT ON Delivery
FOR EACH ROW
BEGIN
    UPDATE Orders o
    JOIN Payment p ON p.order_id = o.order_id
    SET o.status = 'Shipped'
    WHERE p.payment_id = NEW.payment_id AND o.status = 'Paid';
END$$

-- 7. Keep a log of removed products
CREATE TRIGGER trg_products_after_delete
AFTER DELETE ON Products
FOR EACH ROW
BEGIN
    INSERT INTO Product_Audit (product_id, name, farmer_id)
    VALUES (OLD.product_id, OLD.name, OLD.farmer_id);
END$$

-- ---------------------------------------------------------------------
-- STORED PROCEDURES USING CURSORS
-- ---------------------------------------------------------------------

-- Cursor over one farmer's products -> quantity sold and revenue of each
CREATE PROCEDURE sp_farmer_sales_report(IN p_farmer_id INT)
BEGIN
    DECLARE done     INT DEFAULT 0;
    DECLARE v_id     INT;
    DECLARE v_name   VARCHAR(100);
    DECLARE v_unit   VARCHAR(5);
    DECLARE v_sold   DECIMAL(12,2);
    DECLARE v_rev    DECIMAL(12,2);
    DECLARE cur CURSOR FOR
        SELECT product_id, name, unit FROM Products WHERE farmer_id = p_farmer_id;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;

    DROP TEMPORARY TABLE IF EXISTS tmp_report;
    CREATE TEMPORARY TABLE tmp_report (
        product_id INT, product_name VARCHAR(100), unit VARCHAR(5),
        qty_sold DECIMAL(12,2), revenue DECIMAL(12,2)
    );

    OPEN cur;
    read_loop: LOOP
        FETCH cur INTO v_id, v_name, v_unit;
        IF done = 1 THEN LEAVE read_loop; END IF;

        SELECT IFNULL(SUM(d.quantity), 0), IFNULL(SUM(d.subtotal), 0)
        INTO v_sold, v_rev
        FROM Order_Details d
        JOIN Orders o ON o.order_id = d.order_id
        WHERE d.product_id = v_id AND o.status <> 'Cancelled';

        INSERT INTO tmp_report VALUES (v_id, v_name, v_unit, v_sold, v_rev);
    END LOOP;
    CLOSE cur;

    SELECT * FROM tmp_report ORDER BY revenue DESC;
    DROP TEMPORARY TABLE tmp_report;
END$$

-- Cursor over all farmers -> number of products and total revenue (admin)
CREATE PROCEDURE sp_admin_farmer_summary()
BEGIN
    DECLARE done      INT DEFAULT 0;
    DECLARE v_id      INT;
    DECLARE v_name    VARCHAR(100);
    DECLARE v_count   INT;
    DECLARE v_rev     DECIMAL(12,2);
    DECLARE cur CURSOR FOR SELECT farmer_id, name FROM Farmer;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;

    DROP TEMPORARY TABLE IF EXISTS tmp_summary;
    CREATE TEMPORARY TABLE tmp_summary (
        farmer_id INT, farmer_name VARCHAR(100),
        products_listed INT, revenue DECIMAL(12,2)
    );

    OPEN cur;
    read_loop: LOOP
        FETCH cur INTO v_id, v_name;
        IF done = 1 THEN LEAVE read_loop; END IF;

        SELECT COUNT(*) INTO v_count FROM Products WHERE farmer_id = v_id;

        SELECT IFNULL(SUM(d.subtotal), 0) INTO v_rev
        FROM Order_Details d
        JOIN Products p ON p.product_id = d.product_id
        JOIN Orders o   ON o.order_id   = d.order_id
        WHERE p.farmer_id = v_id AND o.status <> 'Cancelled';

        INSERT INTO tmp_summary VALUES (v_id, v_name, v_count, v_rev);
    END LOOP;
    CLOSE cur;

    SELECT * FROM tmp_summary ORDER BY revenue DESC;
    DROP TEMPORARY TABLE tmp_summary;
END$$

DELIMITER ;

-- ---------------------------------------------------------------------
-- SAMPLE DATA  (login passwords are plain text - fine for a mini project)
-- ---------------------------------------------------------------------
INSERT INTO Farmer (name, address, password) VALUES
 ('Ramesh Patil', 'Village Mulshi, Pune',   'farmer123'),
 ('Sunita Jadhav', 'Village Bhor, Pune',    'farmer123');
INSERT INTO Farmer_Phone VALUES (1,'9876543210'), (1,'9876500001'), (2,'9123456780');

INSERT INTO Consumer (name, address, password) VALUES
 ('Pratham', 'Shivajinagar, Pune', 'user123'),
 ('Aditi Kulkarni', 'Kothrud, Pune', 'user123');
INSERT INTO Consumer_Phone VALUES (1,'9000011111'), (2,'9000022222');

INSERT INTO Products (farmer_id, name, category, unit, price, quantity) VALUES
 (1, 'Tomato',   'Vegetable', 'kg', 30.00, 100),
 (1, 'Onion',    'Vegetable', 'kg', 25.00, 150),
 (1, 'Wheat',    'Grain',     'kg', 28.00, 500),
 (2, 'Mango',    'Fruit',     'kg', 120.00, 60),
 (2, 'Turmeric Powder', 'Spice', 'g', 0.40, 5000),
 (2, 'Spinach',  'Vegetable', 'kg', 20.00, 40);
USE farm_market;
DESCRIBE Products;
SHOW TRIGGERS;
SHOW PROCEDURE STATUS WHERE Db = 'farm_market';

SELECT * FROM Farmer;
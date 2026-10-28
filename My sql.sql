-- =====================================================================
--  PHARMACY MANAGEMENT SYSTEM  |  ALL MYSQL CODE IN ONE FILE
--  Database : pharmacy_db      Tables : medicine, customer, sales
--
--  HOW TO USE (MySQL Workbench)
--    1. Open Workbench and double-click your PharmacyDB connection.
--    2. File > Open SQL Script, choose this file.
--    3. Press Ctrl + Shift + Enter to run everything, or select one
--       statement and press Ctrl + Enter to run just that statement.
--
--  PART 1  creates the database and tables          (run first)
--  PART 2  inserts sample data                      (run ONCE only)
--  PART 3  SQL statements used inside the Python app (reference)
--  PART 4  queries for the report and for testing   (SELECT only)
--  PART 5  clean-up / reset                         (optional)
-- =====================================================================


-- =====================================================================
--  PART 1 : DATABASE AND TABLES
--  (The Python program runs the same statements automatically.)
-- =====================================================================
CREATE DATABASE IF NOT EXISTS pharmacy_db;
USE pharmacy_db;

CREATE TABLE IF NOT EXISTS medicine(
    id        INT AUTO_INCREMENT PRIMARY KEY,
    name      VARCHAR(100)  NOT NULL,
    company   VARCHAR(100),
    type      VARCHAR(50),
    price     DECIMAL(10,2) NOT NULL,
    quantity  INT           NOT NULL,
    expiry    DATE NULL
);

CREATE TABLE IF NOT EXISTS customer(
    id        INT AUTO_INCREMENT PRIMARY KEY,
    name      VARCHAR(100)  NOT NULL,
    phone     VARCHAR(15),
    address   VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS sales(
    id          INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT,
    medicine_id INT,
    quantity    INT,
    total       DECIMAL(10,2),
    sale_date   DATETIME,
    FOREIGN KEY (customer_id) REFERENCES customer(id),
    FOREIGN KEY (medicine_id) REFERENCES medicine(id)
);

SHOW TABLES;
DESCRIBE medicine;
DESCRIBE customer;
DESCRIBE sales;


-- =====================================================================
--  PART 2 : SAMPLE DATA   (run ONCE, otherwise records are duplicated)
-- =====================================================================
INSERT INTO medicine (name, company, type, price, quantity, expiry) VALUES
('Paracetamol 500mg', 'Cipla',      'Tablet',   20.00, 100, '2030-12-31'),
('Amoxicillin 250mg', 'Sun Pharma', 'Capsule',  85.00,  50, '2029-06-30'),
('Cetirizine 10mg',   'Dr Reddys',  'Tablet',   35.00,  75, '2029-09-30'),
('Ibuprofen 400mg',   'Abbott',     'Tablet',   45.00,  60, '2030-01-31'),
('Cough Syrup',       'Dabur',      'Syrup',   120.00,   8, '2028-03-15'),
('Vitamin C 500mg',   'Zydus',      'Tablet',   15.00,   5, '2029-08-31'),
('Old Test Medicine', 'Test Co',    'Tablet',   10.00,  20, '2020-01-01');

INSERT INTO customer (name, phone, address) VALUES
('Ravi Kumar',    '9876543210', 'Pimpri, Pune'),
('Sneha Patil',   '9123456780', 'Chinchwad, Pune'),
('Amit Deshmukh', '9988776655', 'Akurdi, Pune');

SELECT * FROM medicine;
SELECT * FROM customer;


-- =====================================================================
--  PART 3 : SQL USED BY THE PYTHON APPLICATION  (reference, commented)
--  The app uses %s placeholders; sample values are shown here instead.
--  Remove the leading "-- " from a line only if you want to run it.
-- =====================================================================

-- ---- Medicines tab ----------------------------------------------------
-- Add:
-- INSERT INTO medicine(name,company,type,price,quantity,expiry)
--        VALUES('Azithromycin 500mg','Cipla','Tablet',95.00,40,'2029-12-31');
-- Update (row with id = 1):
-- UPDATE medicine SET name='Paracetamol 500mg', company='Cipla', type='Tablet',
--        price=22.00, quantity=100, expiry='2030-12-31' WHERE id=1;
-- Delete (fails with error 1451 if the medicine is already used in sales):
-- DELETE FROM medicine WHERE id=7;
-- Search box:
-- SELECT * FROM medicine
--  WHERE name LIKE '%para%' OR company LIKE '%para%' OR type LIKE '%para%'
--  ORDER BY id;

-- ---- Customers tab ----------------------------------------------------
-- Add:
-- INSERT INTO customer(name,phone,address) VALUES('Neha Joshi','9000011111','Kothrud, Pune');
-- Update:
-- UPDATE customer SET name='Ravi Kumar', phone='9876543210', address='Pimpri, Pune' WHERE id=1;
-- Delete (fails if the customer has sales records):
-- DELETE FROM customer WHERE id=3;

-- ---- Billing / Sales tab (what the Sell button does) ----------------
-- 1) Read price, stock and expiry of the chosen medicine:
-- SELECT price, quantity, expiry FROM medicine WHERE id=1;
-- 2) If not expired and quantity <= stock, reduce the stock:
-- UPDATE medicine SET quantity = quantity - 2 WHERE id=1;
-- 3) Record the bill (total = price x quantity):
-- INSERT INTO sales(customer_id,medicine_id,quantity,total,sale_date)
--        VALUES(1, 1, 2, 40.00, NOW());
-- Sales history shown in the table (JOIN):
-- SELECT s.id, c.name, m.name, s.quantity, s.total, s.sale_date
--   FROM sales s
--   LEFT JOIN customer c ON c.id = s.customer_id
--   LEFT JOIN medicine m ON m.id = s.medicine_id
--  ORDER BY s.id DESC;
-- Grand total shown above the table:
-- SELECT IFNULL(SUM(total),0) FROM sales;


-- =====================================================================
--  PART 4 : QUERIES FOR THE REPORT AND FOR TESTING  (read-only)
--  Run these AFTER you have made some sales in the application.
-- =====================================================================

-- 4.1  Tables in the database
USE pharmacy_db;
SHOW TABLES;

-- 4.2  Low-stock medicines (10 units or less)
SELECT id, name, company, type, price, quantity, expiry
FROM medicine
WHERE quantity <= 10;

-- 4.3  Sales history with customer and medicine names (JOIN)
SELECT s.id, c.name AS customer, m.name AS medicine,
       s.quantity, s.total, s.sale_date
FROM sales s
JOIN customer c ON c.id = s.customer_id
JOIN medicine m ON m.id = s.medicine_id
ORDER BY s.id DESC;

-- 4.4  Total amount spent by each customer (GROUP BY)
SELECT c.name, SUM(s.total) AS total_spent
FROM sales s
JOIN customer c ON c.id = s.customer_id
GROUP BY c.name;

-- 4.5  Expired medicines
SELECT id, name, expiry
FROM medicine
WHERE expiry < CURDATE();

-- 4.6  Medicines expiring within the next 30 days
SELECT id, name, expiry
FROM medicine
WHERE expiry BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY);

-- 4.7  Units sold of each medicine, best seller first
SELECT m.name, SUM(s.quantity) AS units_sold
FROM sales s
JOIN medicine m ON m.id = s.medicine_id
GROUP BY m.name
ORDER BY units_sold DESC;

-- 4.8  Total sales amount
SELECT IFNULL(SUM(total), 0) AS total_sales FROM sales;

-- 4.9  Value of the stock currently in the pharmacy
SELECT SUM(price * quantity) AS stock_value FROM medicine;

-- 4.10 Search a medicine by name, company or type
SELECT * FROM medicine
WHERE name LIKE '%para%' OR company LIKE '%para%' OR type LIKE '%para%';


-- =====================================================================
--  PART 5 : CLEAN-UP / RESET   (optional, deletes data - use carefully)
--  Remove the leading "-- " only if you really want to run a line.
-- =====================================================================
-- Delete only the records but keep the tables (child table first):
-- DELETE FROM sales;
-- DELETE FROM customer;
-- DELETE FROM medicine;

-- Delete the whole database (the Python program will recreate it empty):
-- DROP DATABASE pharmacy_db;






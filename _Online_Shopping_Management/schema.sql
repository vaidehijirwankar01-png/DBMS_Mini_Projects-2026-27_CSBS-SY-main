-- ==========================================================
-- ONLINE SHOPPING MANAGEMENT DATABASE SYSTEM (DBMS PROJECT)
-- Database: shopping_db
-- ==========================================================

CREATE DATABASE IF NOT EXISTS shopping_db;
USE shopping_db;

-- ----------------------------------------------------------
-- 1. TABLE: CUSTOMER
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS CUSTOMER (
  customer_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  phone VARCHAR(15),
  password_hash VARCHAR(255) NOT NULL,
  registered_on DATE DEFAULT (CURDATE())
);

-- ----------------------------------------------------------
-- 2. TABLE: ADDRESS
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS ADDRESS (
  address_id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  street VARCHAR(150),
  city VARCHAR(50),
  state VARCHAR(50),
  pincode VARCHAR(10),
  FOREIGN KEY (customer_id) REFERENCES CUSTOMER(customer_id) ON DELETE CASCADE
);

-- ----------------------------------------------------------
-- 3. TABLE: CATEGORY
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS CATEGORY (
  category_id INT AUTO_INCREMENT PRIMARY KEY,
  category_name VARCHAR(50) NOT NULL UNIQUE,
  description VARCHAR(255)
);

-- ----------------------------------------------------------
-- 4. TABLE: PRODUCT
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS PRODUCT (
  product_id INT AUTO_INCREMENT PRIMARY KEY,
  category_id INT NOT NULL,
  product_name VARCHAR(100) NOT NULL,
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  stock_qty INT NOT NULL DEFAULT 0 CHECK (stock_qty >= 0),
  description VARCHAR(255),
  FOREIGN KEY (category_id) REFERENCES CATEGORY(category_id)
);

-- ----------------------------------------------------------
-- 5. TABLE: ORDERS
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS ORDERS (
  order_id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  order_date DATE NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'Placed',
  FOREIGN KEY (customer_id) REFERENCES CUSTOMER(customer_id)
);

-- ----------------------------------------------------------
-- 6. TABLE: ORDER_ITEM (Resolves M:N relationship)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS ORDER_ITEM (
  order_id INT,
  product_id INT,
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (order_id, product_id),
  FOREIGN KEY (order_id) REFERENCES ORDERS(order_id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES PRODUCT(product_id)
);

-- ----------------------------------------------------------
-- 7. TABLE: PAYMENT (1:1 with ORDERS)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS PAYMENT (
  payment_id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL UNIQUE,
  method VARCHAR(20),
  amount DECIMAL(10,2),
  paid_on DATE,
  status VARCHAR(20),
  FOREIGN KEY (order_id) REFERENCES ORDERS(order_id) ON DELETE CASCADE
);

-- ----------------------------------------------------------
-- 8. TABLE: SHIPMENT (1:1 with ORDERS)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS SHIPMENT (
  shipment_id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL UNIQUE,
  address_id INT NOT NULL,
  carrier VARCHAR(50),
  tracking_no VARCHAR(50),
  delivery_status VARCHAR(20),
  FOREIGN KEY (order_id) REFERENCES ORDERS(order_id) ON DELETE CASCADE,
  FOREIGN KEY (address_id) REFERENCES ADDRESS(address_id)
);

-- ----------------------------------------------------------
-- 9. TABLE: REVIEW
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS REVIEW (
  review_id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  product_id INT NOT NULL,
  rating INT CHECK (rating BETWEEN 1 AND 5),
  comment VARCHAR(255),
  FOREIGN KEY (customer_id) REFERENCES CUSTOMER(customer_id),
  FOREIGN KEY (product_id) REFERENCES PRODUCT(product_id)
);

-- ==========================================================
-- VIEWS FOR DBMS VIVA / REPORTS
-- ==========================================================

-- View 1: Complete Order Summary joining 5 tables
CREATE OR REPLACE VIEW v_order_summary AS
SELECT 
  o.order_id,
  c.name AS customer_name,
  c.email,
  o.order_date,
  o.total_amount,
  o.status AS order_status,
  p.method AS payment_method,
  p.status AS payment_status,
  s.carrier,
  s.tracking_no,
  s.delivery_status,
  CONCAT(a.street, ', ', a.city, ', ', a.state, ' - ', a.pincode) AS delivery_address
FROM ORDERS o
JOIN CUSTOMER c ON o.customer_id = c.customer_id
LEFT JOIN PAYMENT p ON o.order_id = p.order_id
LEFT JOIN SHIPMENT s ON o.order_id = s.order_id
LEFT JOIN ADDRESS a ON s.address_id = a.address_id;

-- View 2: Product Sales & Stock Analytics View
CREATE OR REPLACE VIEW v_product_analytics AS
SELECT 
  p.product_id,
  p.product_name,
  c.category_name,
  p.price,
  p.stock_qty,
  IFNULL(SUM(oi.quantity), 0) AS total_units_sold,
  IFNULL(SUM(oi.quantity * oi.unit_price), 0) AS total_revenue_generated
FROM PRODUCT p
JOIN CATEGORY c ON p.category_id = c.category_id
LEFT JOIN ORDER_ITEM oi ON p.product_id = oi.product_id
GROUP BY p.product_id, p.product_name, c.category_name, p.price, p.stock_qty;

-- ==========================================================
-- SEED SAMPLE DATA
-- ==========================================================

-- Categories
INSERT IGNORE INTO CATEGORY (category_id, category_name, description) VALUES 
(1, 'Electronics', 'Gadgets, accessories, and audio devices'),
(2, 'Books', 'Computer science, fiction, and academic literature'),
(3, 'Clothing', 'Men, women apparel and seasonal wear'),
(4, 'Home & Kitchen', 'Home appliances and kitchen utilities');

-- Products
INSERT IGNORE INTO PRODUCT (product_id, category_id, product_name, price, stock_qty, description) VALUES
(1, 1, 'Wireless Optical Mouse', 599.00, 48, 'Ergonomic 2.4GHz USB wireless optical mouse'),
(2, 1, 'Bluetooth Stereo Speaker', 1499.00, 28, 'Portable IPX7 waterproof speaker with rich bass'),
(3, 1, 'Mechanical Gaming Keyboard', 2999.00, 15, 'RGB backlit tactile mechanical switches'),
(4, 2, 'DBMS Concepts (Silberschatz)', 650.00, 95, 'Standard university textbook for Database Management'),
(5, 2, 'Clean Code by Robert Martin', 850.00, 40, 'A handbook of agile software craftsmanship'),
(6, 3, 'Pure Cotton T-Shirt', 399.00, 76, '100% breathable organic combed cotton casual tee'),
(7, 3, 'Slim Fit Denim Jeans', 1299.00, 5, 'Durable stretchable classic dark blue denim'),
(8, 4, 'Stainless Steel Water Bottle', 499.00, 60, '1 Litre insulated double-wall thermos flask');

-- Default Demo Customers
INSERT IGNORE INTO CUSTOMER (customer_id, name, email, phone, password_hash) VALUES 
(1, 'Test User', 'test@mail.com', '9999999999', 'x'),
(2, 'Priya Sharma', 'priya@mail.com', '9888877777', 'x'),
(3, 'Rahul Verma', 'rahul@mail.com', '9777766666', 'x');

-- Customer Addresses
INSERT IGNORE INTO ADDRESS (address_id, customer_id, street, city, state, pincode) VALUES 
(1, 1, 'MG Road, Camp', 'Pune', 'Maharashtra', '411001'),
(2, 2, 'Brigade Road', 'Bengaluru', 'Karnataka', '560025'),
(3, 3, 'Connaught Place', 'New Delhi', 'Delhi', '110001');

-- Sample Initial Orders & Transactions (for instant dashboard analytics)
INSERT IGNORE INTO ORDERS (order_id, customer_id, order_date, total_amount, status) VALUES
(1, 1, CURDATE() - INTERVAL 2 DAY, 2098.00, 'Delivered'),
(2, 2, CURDATE() - INTERVAL 1 DAY, 1500.00, 'Shipped'),
(3, 3, CURDATE(), 650.00, 'Placed');

-- Order Items
INSERT IGNORE INTO ORDER_ITEM (order_id, product_id, quantity, unit_price) VALUES
(1, 1, 1, 599.00),
(1, 2, 1, 1499.00),
(2, 4, 1, 650.00),
(2, 5, 1, 850.00),
(3, 4, 1, 650.00);

-- Payments
INSERT IGNORE INTO PAYMENT (payment_id, order_id, method, amount, paid_on, status) VALUES
(1, 1, 'UPI', 2098.00, CURDATE() - INTERVAL 2 DAY, 'Paid'),
(2, 2, 'Card', 1500.00, CURDATE() - INTERVAL 1 DAY, 'Paid'),
(3, 3, 'UPI', 650.00, CURDATE(), 'Paid');

-- Shipments
INSERT IGNORE INTO SHIPMENT (shipment_id, order_id, address_id, carrier, tracking_no, delivery_status) VALUES
(1, 1, 1, 'BlueDart', 'TRK90218491', 'Delivered'),
(2, 2, 2, 'Delhivery', 'TRK38291048', 'In Transit'),
(3, 3, 3, 'FedEx', 'TRK58392019', 'Processing');

-- Reviews
INSERT IGNORE INTO REVIEW (review_id, customer_id, product_id, rating, comment) VALUES
(1, 1, 1, 5, 'Smooth tracking and great battery life!'),
(2, 2, 4, 5, 'Best book for college DBMS exams and interviews.');

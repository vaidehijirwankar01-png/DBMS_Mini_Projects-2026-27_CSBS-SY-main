-- =====================================================
-- FOOD DELIVERY SYSTEM - DBMS MINI PROJECT
-- Run this whole file in MySQL Workbench (Ctrl + Shift + Enter)
-- =====================================================

DROP DATABASE IF EXISTS food_delivery_db;
CREATE DATABASE food_delivery_db;
USE food_delivery_db;

-- =====================================================
-- 1. TABLES
-- =====================================================

-- RESTAURANT
CREATE TABLE restaurant (
    restaurant_id    INT PRIMARY KEY AUTO_INCREMENT,
    restaurant_name  VARCHAR(100) NOT NULL,
    address          VARCHAR(255) NOT NULL,
    contact_no       VARCHAR(10)  NOT NULL UNIQUE,
    rating           DECIMAL(2,1) DEFAULT 0.0,
    CHECK (rating BETWEEN 0 AND 5)
);

-- MENU (Restaurant 1 : M Menu)
CREATE TABLE menu (
    menu_id        INT PRIMARY KEY AUTO_INCREMENT,
    restaurant_id  INT NOT NULL,
    food_name      VARCHAR(100) NOT NULL,
    price          DECIMAL(8,2) NOT NULL CHECK (price > 0),
    FOREIGN KEY (restaurant_id) REFERENCES restaurant(restaurant_id)
        ON DELETE CASCADE ON UPDATE CASCADE
);

-- CUSTOMER
CREATE TABLE customer (
    customer_id  INT PRIMARY KEY AUTO_INCREMENT,
    name         VARCHAR(100) NOT NULL,
    mobile_no    VARCHAR(10)  NOT NULL UNIQUE,
    email        VARCHAR(100) UNIQUE,
    address      VARCHAR(255) NOT NULL
);

-- DELIVERY PARTNER
CREATE TABLE delivery_partner (
    delivery_id  INT PRIMARY KEY AUTO_INCREMENT,
    name         VARCHAR(100) NOT NULL,
    mobile_no    VARCHAR(10)  NOT NULL UNIQUE,
    vehicle_no   VARCHAR(15)  NOT NULL UNIQUE,
    rating       DECIMAL(2,1) DEFAULT 0.0,
    CHECK (rating BETWEEN 0 AND 5)
);

-- ORDERS (ORDER is a reserved word, so table is named "orders")
-- Customer 1 : M Orders (places)
-- Delivery Partner 1 : M Orders (delivers)
-- restaurant_id implements the "order from" relationship
CREATE TABLE orders (
    order_id       INT PRIMARY KEY AUTO_INCREMENT,
    customer_id    INT NOT NULL,
    restaurant_id  INT NOT NULL,
    delivery_id    INT NULL,
    order_date     DATETIME DEFAULT CURRENT_TIMESTAMP,
    order_amount   DECIMAL(10,2) DEFAULT 0.00,
    order_status   ENUM('Placed','Preparing','Out for Delivery','Delivered','Cancelled')
                   DEFAULT 'Placed',
    FOREIGN KEY (customer_id)   REFERENCES customer(customer_id),
    FOREIGN KEY (restaurant_id) REFERENCES restaurant(restaurant_id),
    FOREIGN KEY (delivery_id)   REFERENCES delivery_partner(delivery_id)
        ON DELETE SET NULL
);

-- ORDER_ITEMS (Orders M : N Menu -> "contains")
CREATE TABLE order_items (
    order_id  INT NOT NULL,
    menu_id   INT NOT NULL,
    quantity  INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    PRIMARY KEY (order_id, menu_id),
    FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
    FOREIGN KEY (menu_id)  REFERENCES menu(menu_id)
);

-- PAYMENT (Orders 1 : 1 Payment)
CREATE TABLE payment (
    payment_id      INT PRIMARY KEY AUTO_INCREMENT,
    order_id        INT NOT NULL UNIQUE,
    payment_mode    ENUM('UPI','Card','Cash','Net Banking') NOT NULL,
    payment_status  ENUM('Pending','Paid','Failed','Refunded') DEFAULT 'Pending',
    amount          DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE
);

-- =====================================================
-- 2. SAMPLE DATA
-- =====================================================

INSERT INTO restaurant (restaurant_name, address, contact_no, rating) VALUES
('Spice Garden',  'FC Road, Pune',   '9811111111', 4.4),
('Pizza Hub',     'Baner, Pune',     '9822222222', 4.1),
('Biryani House', 'Kothrud, Pune',   '9833333333', 4.6);

INSERT INTO menu (restaurant_id, food_name, price) VALUES
(1, 'Paneer Butter Masala', 220.00),
(1, 'Butter Naan',           40.00),
(2, 'Margherita Pizza',     299.00),
(2, 'Garlic Bread',         129.00),
(3, 'Chicken Biryani',      280.00),
(3, 'Raita',                 50.00);

INSERT INTO customer (name, mobile_no, email, address) VALUES
('Rahul Sharma', '9900000001', 'rahul@gmail.com', 'Shivajinagar, Pune'),
('Sneha Patil',  '9900000002', 'sneha@gmail.com', 'Kothrud, Pune'),
('Amit Joshi',   '9900000003', 'amit@gmail.com',  'Baner, Pune');

INSERT INTO delivery_partner (name, mobile_no, vehicle_no, rating) VALUES
('Suresh Kumar', '9700000001', 'MH12AB1234', 4.5),
('Vikas More',   '9700000002', 'MH14CD5678', 4.2);

INSERT INTO orders (customer_id, restaurant_id, delivery_id, order_status) VALUES
(1, 1, 1, 'Delivered'),
(2, 2, 2, 'Out for Delivery'),
(3, 3, 1, 'Preparing');

INSERT INTO order_items (order_id, menu_id, quantity) VALUES
(1, 1, 2), (1, 2, 4),
(2, 3, 1), (2, 4, 1),
(3, 5, 2), (3, 6, 1);

-- Calculate order_amount automatically from items
UPDATE orders o
SET order_amount = (
    SELECT SUM(oi.quantity * m.price)
    FROM order_items oi
    JOIN menu m ON oi.menu_id = m.menu_id
    WHERE oi.order_id = o.order_id
);

INSERT INTO payment (order_id, payment_mode, payment_status, amount) VALUES
(1, 'UPI',  'Paid',    600.00),
(2, 'Card', 'Paid',    428.00),
(3, 'Cash', 'Pending', 610.00);

-- =====================================================
-- 3. DEMO QUERIES (outputs show in Workbench result tabs)
-- =====================================================

-- All menu items with restaurant name
SELECT r.restaurant_name, m.food_name, m.price
FROM menu m JOIN restaurant r ON m.restaurant_id = r.restaurant_id;

-- Full order details
SELECT o.order_id, c.name AS customer, r.restaurant_name,
       dp.name AS delivery_partner, o.order_amount, o.order_status
FROM orders o
JOIN customer c               ON o.customer_id   = c.customer_id
JOIN restaurant r             ON o.restaurant_id = r.restaurant_id
LEFT JOIN delivery_partner dp ON o.delivery_id   = dp.delivery_id;

-- Bill (items) of order 1
SELECT m.food_name, oi.quantity, m.price, (oi.quantity * m.price) AS total
FROM order_items oi JOIN menu m ON oi.menu_id = m.menu_id
WHERE oi.order_id = 1;

-- Orders placed by customer 1
SELECT * FROM orders WHERE customer_id = 1;

-- Revenue per restaurant
SELECT r.restaurant_name, SUM(o.order_amount) AS total_revenue
FROM orders o JOIN restaurant r ON o.restaurant_id = r.restaurant_id
GROUP BY r.restaurant_name;

-- Pending payments
SELECT payment_id, order_id, amount, payment_mode
FROM payment WHERE payment_status = 'Pending';

-- Deliveries per delivery partner
SELECT dp.name, COUNT(o.order_id) AS total_deliveries
FROM delivery_partner dp LEFT JOIN orders o ON dp.delivery_id = o.delivery_id
GROUP BY dp.name;

-- Update order status
UPDATE orders SET order_status = 'Delivered' WHERE order_id = 2;

-- Top rated restaurants
SELECT restaurant_name, rating FROM restaurant ORDER BY rating DESC;

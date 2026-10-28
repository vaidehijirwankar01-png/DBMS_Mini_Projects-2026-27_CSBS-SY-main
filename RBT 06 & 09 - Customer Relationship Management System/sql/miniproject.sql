-- ============================================
-- MINIPROJECT DATABASE
-- ============================================

DROP DATABASE IF EXISTS miniproject;

CREATE DATABASE miniproject;

USE miniproject;


-- ============================================
-- 1. CUSTOMERS TABLE
-- ============================================

CREATE TABLE Customers (
    customer_id INT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE,
    phone VARCHAR(15),
    address VARCHAR(255),
    city VARCHAR(50)
);


-- ============================================
-- 2. EMPLOYEES TABLE
-- ============================================

CREATE TABLE Employees (
    employee_id INT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE,
    phone VARCHAR(15),
    department VARCHAR(50),
    designation VARCHAR(50),
    joining_date DATE
);


-- ============================================
-- 3. LEADS TABLE
-- ============================================

CREATE TABLE Leads (
    lead_id INT PRIMARY KEY,
    customer_id INT,
    employee_id INT,
    source VARCHAR(30),
    status ENUM(
        'New',
        'Contacted',
        'Qualified',
        'Proposal',
        'Negotiation',
        'Converted',
        'Lost'
    ),
    lead_date DATE,

    FOREIGN KEY (customer_id)
        REFERENCES Customers(customer_id),

    FOREIGN KEY (employee_id)
        REFERENCES Employees(employee_id)
);


-- ============================================
-- 4. PRODUCTS TABLE
-- ============================================

CREATE TABLE Products (
    product_id INT PRIMARY KEY,
    product_name VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    price DECIMAL(10,2),
    stock INT
);


-- ============================================
-- 5. DEALS TABLE
-- ============================================

CREATE TABLE Deals (
    deal_id INT PRIMARY KEY,
    customer_id INT,
    employee_id INT,
    product_id INT,
    deal_amount DECIMAL(10,2),
    stage ENUM(
        'Prospecting',
        'Qualified',
        'Proposal',
        'Negotiation',
        'Closed Won',
        'Closed Lost'
    ),
    deal_date DATE,

    FOREIGN KEY (customer_id)
        REFERENCES Customers(customer_id),

    FOREIGN KEY (employee_id)
        REFERENCES Employees(employee_id),

    FOREIGN KEY (product_id)
        REFERENCES Products(product_id)
);


-- ============================================
-- 6. INTERACTIONS TABLE
-- ============================================

CREATE TABLE Interactions (
    interaction_id INT PRIMARY KEY,
    customer_id INT,
    employee_id INT,
    interaction_type ENUM(
        'Call',
        'Email',
        'Meeting',
        'Message'
    ),
    interaction_date DATE,
    notes VARCHAR(500),

    FOREIGN KEY (customer_id)
        REFERENCES Customers(customer_id),

    FOREIGN KEY (employee_id)
        REFERENCES Employees(employee_id)
);


-- ============================================
-- CHECK ALL TABLES
-- ============================================

SHOW TABLES;
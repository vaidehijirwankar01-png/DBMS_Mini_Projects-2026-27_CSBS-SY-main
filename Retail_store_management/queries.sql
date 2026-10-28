-- ============================================================================
-- DBMS PROJECT: RETAIL STORE MANAGEMENT SYSTEM
-- Database: retail_store
-- DBMS: MySQL
-- File: database/queries.sql
-- Description: Core SQL queries demonstrating fundamental and advanced DBMS
--              operations used throughout the Retail Store Management System.
-- ============================================================================
--
-- SCHEMA OVERVIEW:
-- 1. category   (category_id [PK], category_name)
-- 2. supplier   (supplier_id [PK], supplier_name, phone, email)
-- 3. product    (product_id [PK], product_name, price, quantity, category_id [FK], supplier_id [FK])
-- 4. customer   (customer_id [PK], customer_name, phone, email)
-- 5. employee   (employee_id [PK], employee_name, role, phone)
-- 6. sale       (sale_id [PK], sale_date, customer_id [FK], employee_id [FK], total_amount)
-- 7. sale_item  (sale_item_id [PK], sale_id [FK], product_id [FK], quantity, selling_price)
-- ============================================================================

USE `retail_store`;

-- ============================================================================
-- 1. DISPLAY ALL PRODUCTS
-- Operation: Data Retrieval / Projection & Selection
-- Purpose: Retrieves all product records from the product table including
--          unit price, available stock quantity, and foreign key references.
-- ============================================================================
SELECT 
    product_id,
    product_name,
    price,
    quantity,
    category_id,
    supplier_id
FROM product
ORDER BY product_id ASC;


-- ============================================================================
-- 2. DISPLAY LOW-STOCK PRODUCTS
-- Operation: Filtering using WHERE clause and comparison operator (<)
-- Purpose: Identifies products with inventory quantity below the reorder
--          threshold of 10 units (threshold rule: quantity < 10).
-- ============================================================================
SELECT 
    product_id,
    product_name,
    price,
    quantity
FROM product
WHERE quantity < 10
ORDER BY quantity ASC;


-- ============================================================================
-- 3. DISPLAY PRODUCTS WITH THEIR CATEGORY NAMES USING JOIN
-- Operation: INNER JOIN between product and category tables
-- Purpose: Resolves the foreign key category_id to display the human-readable
--          category name alongside product catalog details.
-- ============================================================================
SELECT 
    p.product_id,
    p.product_name,
    p.price,
    p.quantity,
    c.category_name
FROM product p
INNER JOIN category c ON p.category_id = c.category_id
ORDER BY p.product_id ASC;


-- ============================================================================
-- 4. DISPLAY PRODUCTS WITH SUPPLIER NAMES USING JOIN
-- Operation: INNER JOIN between product and supplier tables
-- Purpose: Resolves the foreign key supplier_id to display the vendor/supplier
--          name and contact phone number supplying each product.
-- ============================================================================
SELECT 
    p.product_id,
    p.product_name,
    p.price,
    p.quantity,
    s.supplier_name,
    s.phone AS supplier_phone
FROM product p
INNER JOIN supplier s ON p.supplier_id = s.supplier_id
ORDER BY p.product_id ASC;


-- ============================================================================
-- 5. CALCULATE TOTAL SALES USING SUM()
-- Operation: Aggregate function SUM() with COALESCE() for null safety
-- Purpose: Computes the aggregate gross sales revenue from all recorded
--          sales transactions in the sale table.
-- ============================================================================
SELECT 
    COUNT(sale_id) AS total_transactions,
    COALESCE(SUM(total_amount), 0.00) AS total_sales_revenue,
    COALESCE(AVG(total_amount), 0.00) AS average_sale_value
FROM sale;


-- ============================================================================
-- 6. COUNT TOTAL CUSTOMERS USING COUNT()
-- Operation: Aggregate function COUNT()
-- Purpose: Counts the total number of registered customers in the database.
-- ============================================================================
SELECT 
    COUNT(*) AS total_customers
FROM customer;


-- ============================================================================
-- 7. COUNT TOTAL EMPLOYEES
-- Operation: Aggregate function COUNT()
-- Purpose: Counts the total number of store staff and employees.
-- ============================================================================
SELECT 
    COUNT(*) AS total_employees
FROM employee;


-- ============================================================================
-- 8. DISPLAY BEST-SELLING PRODUCTS USING GROUP BY AND ORDER BY
-- Operation: INNER JOIN, GROUP BY, Aggregate SUM(), and ORDER BY DESC
-- Purpose: Analyzes sales volume from the sale_item table to rank products
--          by total units sold and total revenue generated.
-- ============================================================================
SELECT 
    p.product_id,
    p.product_name,
    SUM(si.quantity) AS total_units_sold,
    SUM(si.quantity * si.selling_price) AS total_revenue_generated
FROM sale_item si
INNER JOIN product p ON si.product_id = p.product_id
GROUP BY p.product_id, p.product_name
ORDER BY total_units_sold DESC;


-- ============================================================================
-- 9. DISPLAY SALES WITH CUSTOMER AND EMPLOYEE DETAILS USING JOIN
-- Operation: Multiple INNER JOINs across sale, customer, and employee
-- Purpose: Provides a complete audit trail for each sales transaction,
--          showing the buying customer and the billing cashier/employee.
-- ============================================================================
SELECT 
    s.sale_id,
    s.sale_date,
    s.total_amount,
    c.customer_id,
    c.customer_name,
    c.phone AS customer_phone,
    e.employee_id,
    e.employee_name,
    e.role AS employee_role
FROM sale s
INNER JOIN customer c ON s.customer_id = c.customer_id
INNER JOIN employee e ON s.employee_id = e.employee_id
ORDER BY s.sale_date DESC, s.sale_id DESC;


-- ============================================================================
-- 10. DISPLAY SALE ITEMS WITH PRODUCT NAMES AND QUANTITIES
-- Operation: INNER JOIN between sale_item and product
-- Purpose: Breaks down transaction line items to display product names,
--          purchased quantities, unit selling prices, and line totals.
-- ============================================================================
SELECT 
    si.sale_item_id,
    si.sale_id,
    p.product_id,
    p.product_name,
    si.quantity,
    si.selling_price,
    (si.quantity * si.selling_price) AS line_total
FROM sale_item si
INNER JOIN product p ON si.product_id = p.product_id
ORDER BY si.sale_id ASC, si.sale_item_id ASC;


-- ============================================================================
-- 11. DISPLAY PRODUCTS WITH BOTH CATEGORY AND SUPPLIER (MULTI-TABLE JOIN)
-- Operation: Multi-table JOIN connecting product, category, and supplier
-- Purpose: Comprehensive product master catalog view showing both
--          classification and sourcing details.
-- ============================================================================
SELECT 
    p.product_id,
    p.product_name,
    c.category_name,
    s.supplier_name,
    p.price,
    p.quantity,
    (p.price * p.quantity) AS inventory_value
FROM product p
INNER JOIN category c ON p.category_id = c.category_id
INNER JOIN supplier s ON p.supplier_id = s.supplier_id
ORDER BY p.product_id ASC;


-- ============================================================================
-- 12. INVENTORY HEALTH CLASSIFICATION USING CONDITIONAL CASE EXPRESSION
-- Operation: Conditional evaluation using CASE ... WHEN
-- Purpose: Implements store stock monitoring rules:
--          - quantity = 0  -> 'Out of Stock'
--          - quantity < 10 -> 'Low Stock'
--          - quantity >= 10 -> 'In Stock'
-- ============================================================================
SELECT 
    p.product_id,
    p.product_name,
    p.quantity,
    p.price,
    CASE 
        WHEN p.quantity = 0 THEN 'Out of Stock'
        WHEN p.quantity < 10 THEN 'Low Stock'
        ELSE 'In Stock'
    END AS stock_status
FROM product p
ORDER BY p.quantity ASC;


-- ============================================================================
-- 13. CATEGORY-WISE PRODUCT COUNT AND STOCK VALUE (GROUP BY & AGGREGATES)
-- Operation: GROUP BY with COUNT() and SUM() aggregates
-- Purpose: Departmental inventory analysis showing item count and
--          total inventory valuation per category.
-- ============================================================================
SELECT 
    c.category_id,
    c.category_name,
    COUNT(p.product_id) AS total_products,
    COALESCE(SUM(p.quantity), 0) AS total_units_in_stock,
    COALESCE(SUM(p.quantity * p.price), 0.00) AS category_stock_value
FROM category c
LEFT JOIN product p ON c.category_id = p.category_id
GROUP BY c.category_id, c.category_name
ORDER BY total_products DESC;


-- ============================================================================
-- 14. CUSTOMER PURCHASE SUMMARY (GROUP BY & HAVING)
-- Operation: LEFT JOIN, GROUP BY, and aggregate calculation
-- Purpose: Summarizes customer loyalty and purchase history, showing total
--          transactions completed and cumulative expenditure.
-- ============================================================================
SELECT 
    c.customer_id,
    c.customer_name,
    c.phone,
    COUNT(s.sale_id) AS total_purchases,
    COALESCE(SUM(s.total_amount), 0.00) AS total_spent
FROM customer c
LEFT JOIN sale s ON c.customer_id = s.customer_id
GROUP BY c.customer_id, c.customer_name, c.phone
ORDER BY total_spent DESC;


-- ============================================================================
-- 15. EMPLOYEE SALES PERFORMANCE REPORT
-- Operation: LEFT JOIN, GROUP BY with aggregate SUM() and COUNT()
-- Purpose: Tracks sales volume, invoice count, and revenue generated
--          by each employee.
-- ============================================================================
SELECT 
    e.employee_id,
    e.employee_name,
    e.role,
    COUNT(s.sale_id) AS sales_processed,
    COALESCE(SUM(s.total_amount), 0.00) AS total_revenue_handled
FROM employee e
LEFT JOIN sale s ON e.employee_id = s.employee_id
GROUP BY e.employee_id, e.employee_name, e.role
ORDER BY total_revenue_handled DESC;


-- ============================================================================
-- 16. DETAILED INVOICE BREAKDOWN (COMPLETE 5-TABLE RELATIONAL JOIN)
-- Operation: Comprehensive 5-table JOIN (sale, customer, employee, sale_item, product)
-- Purpose: Complete transaction audit showing full receipt breakdown with
--          customer, employee, product details, quantities, and line totals.
-- ============================================================================
SELECT 
    s.sale_id,
    s.sale_date,
    c.customer_name,
    e.employee_name AS billed_by,
    p.product_name,
    si.quantity,
    si.selling_price,
    (si.quantity * si.selling_price) AS line_total,
    s.total_amount AS invoice_grand_total
FROM sale s
INNER JOIN customer c ON s.customer_id = c.customer_id
INNER JOIN employee e ON s.employee_id = e.employee_id
INNER JOIN sale_item si ON s.sale_id = si.sale_id
INNER JOIN product p ON si.product_id = p.product_id
ORDER BY s.sale_id DESC, si.sale_item_id ASC;

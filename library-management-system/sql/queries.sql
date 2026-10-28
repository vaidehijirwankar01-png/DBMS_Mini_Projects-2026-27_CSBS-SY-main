-- =====================================================================
-- DATABASE MANAGEMENT SYSTEM (DBMS) MINI PROJECT
-- Advanced SQL Queries & Relational Algebra Demonstrations
-- =====================================================================

-- ---------------------------------------------------------------------
-- QUERY 1: Multi-Table INNER JOIN (3 Tables)
-- Concept: Inner join across Books, Categories, and Publishers
-- Objective: Retrieve book title, category, publisher, and shelf location
-- ---------------------------------------------------------------------
SELECT 
    b.book_id,
    b.title,
    b.isbn,
    c.category_name,
    p.name AS publisher_name,
    b.shelf_location,
    b.price
FROM books b
INNER JOIN categories c ON b.category_id = c.category_id
INNER JOIN publishers p ON b.publisher_id = p.publisher_id
ORDER BY b.title ASC;

-- ---------------------------------------------------------------------
-- QUERY 2: Many-to-Many Join with Group Aggregation (GROUP BY)
-- Concept: Bridge table traversal (Books -> Book_Authors -> Authors) with GROUP_CONCAT
-- Objective: Display each book with all its co-authors comma-separated
-- ---------------------------------------------------------------------
SELECT 
    b.book_id,
    b.title,
    GROUP_CONCAT(a.first_name || ' ' || a.last_name, ', ') AS authors,
    c.category_name,
    b.available_copies,
    b.total_copies
FROM books b
JOIN categories c ON b.category_id = c.category_id
LEFT JOIN book_authors ba ON b.book_id = ba.book_id
LEFT JOIN authors a ON ba.author_id = a.author_id
GROUP BY b.book_id
ORDER BY b.title;

-- ---------------------------------------------------------------------
-- QUERY 3: Nested Subquery with 'IN'
-- Concept: Independent subquery filtering outer table rows
-- Objective: Find all members who have borrowed books in 'Database Systems' category
-- ---------------------------------------------------------------------
SELECT member_id, first_name, last_name, email, membership_type
FROM members
WHERE member_id IN (
    SELECT l.member_id
    FROM loans l
    JOIN books b ON l.book_id = b.book_id
    JOIN categories c ON b.category_id = c.category_id
    WHERE c.category_name = 'Database Systems'
);

-- ---------------------------------------------------------------------
-- QUERY 4: Subquery with 'NOT EXISTS' (Relational Difference)
-- Concept: Set difference using correlated NOT EXISTS
-- Objective: Find members who have never borrowed any book from the library
-- ---------------------------------------------------------------------
SELECT m.member_id, m.first_name, m.last_name, m.email, m.membership_type
FROM members m
WHERE NOT EXISTS (
    SELECT 1 
    FROM loans l 
    WHERE l.member_id = m.member_id
);

-- ---------------------------------------------------------------------
-- QUERY 5: Correlated Subquery
-- Concept: Inner subquery references column from outer query (b1.category_id)
-- Objective: Find books priced higher than the average price in their respective category
-- ---------------------------------------------------------------------
SELECT 
    b1.book_id,
    b1.title,
    b1.category_id,
    c.category_name,
    b1.price,
    ROUND((SELECT AVG(b2.price) FROM books b2 WHERE b2.category_id = b1.category_id), 2) AS category_avg_price
FROM books b1
JOIN categories c ON b1.category_id = c.category_id
WHERE b1.price > (
    SELECT AVG(b2.price)
    FROM books b2
    WHERE b2.category_id = b1.category_id
)
ORDER BY b1.category_id, b1.price DESC;

-- ---------------------------------------------------------------------
-- QUERY 6: GROUP BY with HAVING Clause
-- Concept: Aggregation with post-aggregation filtering
-- Objective: List categories with 2 or more book titles and an average price > $50
-- ---------------------------------------------------------------------
SELECT 
    c.category_name,
    COUNT(b.book_id) AS total_titles,
    ROUND(AVG(b.price), 2) AS avg_price,
    SUM(b.total_copies) AS total_inventory
FROM categories c
JOIN books b ON c.category_id = b.category_id
GROUP BY c.category_id, c.category_name
HAVING COUNT(b.book_id) >= 2 AND AVG(b.price) > 50.0
ORDER BY avg_price DESC;

-- ---------------------------------------------------------------------
-- QUERY 7: LEFT OUTER JOIN
-- Concept: Preserving all rows from the primary (left) entity
-- Objective: List all members and their currently issued books, including members with 0 loans
-- ---------------------------------------------------------------------
SELECT 
    m.member_id,
    m.first_name || ' ' || m.last_name AS member_name,
    m.membership_type,
    COALESCE(b.title, '--- No Active Loan ---') AS borrowed_book,
    l.issue_date,
    l.due_date,
    COALESCE(l.status, 'None') AS loan_status
FROM members m
LEFT JOIN loans l ON m.member_id = l.member_id AND l.return_date IS NULL
LEFT JOIN books b ON l.book_id = b.book_id
ORDER BY m.member_id;

-- ---------------------------------------------------------------------
-- QUERY 8: Date Arithmetic & Dynamic Fine Computation
-- Concept: Calculating overdue days using Julian Day functions
-- Objective: Identify currently unreturned loans that have crossed due date and compute fine at $5/day
-- ---------------------------------------------------------------------
SELECT 
    l.loan_id,
    m.first_name || ' ' || m.last_name AS member_name,
    m.phone AS contact_number,
    b.title AS book_title,
    l.issue_date,
    l.due_date,
    DATE('now') AS current_date_ref,
    CAST(ROUND(julianday('now') - julianday(l.due_date)) AS INTEGER) AS overdue_days,
    CAST(ROUND(julianday('now') - julianday(l.due_date)) * 5.0 AS DECIMAL(10,2)) AS calculated_fine_amount
FROM loans l
JOIN members m ON l.member_id = m.member_id
JOIN books b ON l.book_id = b.book_id
WHERE l.return_date IS NULL 
  AND DATE('now') > l.due_date
ORDER BY overdue_days DESC;

-- ---------------------------------------------------------------------
-- QUERY 9: Window Function (RANK / ROW_NUMBER)
-- Concept: Analytical window functions partitioning across groups
-- Objective: Rank books within each category by their price
-- ---------------------------------------------------------------------
SELECT 
    b.title,
    c.category_name,
    b.price,
    RANK() OVER (PARTITION BY b.category_id ORDER BY b.price DESC) AS price_rank_in_category
FROM books b
JOIN categories c ON b.category_id = c.category_id
ORDER BY c.category_name, price_rank_in_category;

-- ---------------------------------------------------------------------
-- QUERY 10: Derived Table (Subquery in FROM clause)
-- Concept: Aggregating over an intermediate result set
-- Objective: Calculate overall statistics on member borrowing volume
-- ---------------------------------------------------------------------
SELECT 
    sub.borrowing_category,
    COUNT(*) AS member_count
FROM (
    SELECT 
        m.member_id,
        COUNT(l.loan_id) AS total_borrowed,
        CASE 
            WHEN COUNT(l.loan_id) = 0 THEN 'Never Borrowed'
            WHEN COUNT(l.loan_id) <= 2 THEN 'Occasional Reader (1-2)'
            ELSE 'Frequent Reader (3+)'
        END AS borrowing_category
    FROM members m
    LEFT JOIN loans l ON m.member_id = l.member_id
    GROUP BY m.member_id
) sub
GROUP BY sub.borrowing_category
ORDER BY member_count DESC;

-- ---------------------------------------------------------------------
-- QUERY 11: Popularity Metric (Most Borrowed Books)
-- Concept: Aggregation over historical loan records
-- Objective: Find the top 5 most frequently borrowed books
-- ---------------------------------------------------------------------
SELECT 
    b.book_id,
    b.title,
    c.category_name,
    COUNT(l.loan_id) AS borrow_count
FROM books b
JOIN categories c ON b.category_id = c.category_id
LEFT JOIN loans l ON b.book_id = l.book_id
GROUP BY b.book_id
ORDER BY borrow_count DESC, b.title ASC
LIMIT 5;

-- ---------------------------------------------------------------------
-- QUERY 12: Aggregate Financial Summary
-- Concept: Multi-column conditional aggregation (SUM with CASE)
-- Objective: Summary of total fines assessed, collected, and pending
-- ---------------------------------------------------------------------
SELECT 
    COUNT(fine_id) AS total_fines_issued,
    ROUND(SUM(fine_amount), 2) AS total_amount_assessed,
    ROUND(SUM(CASE WHEN paid_status = 'Paid' THEN fine_amount ELSE 0 END), 2) AS total_amount_collected,
    ROUND(SUM(CASE WHEN paid_status = 'Unpaid' THEN fine_amount ELSE 0 END), 2) AS total_amount_pending
FROM fines;

-- =====================================================================
-- DATABASE MANAGEMENT SYSTEM (DBMS) MINI PROJECT
-- Project: Library Management System (LMS)
-- Dialect: SQLite 3 (Standard SQL-92 / SQL-99 compliant)
-- Features: DDL with Referential Integrity, Check Constraints,
--           Indexes, Views, and Automated Triggers
-- =====================================================================

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------
-- 1. DROP EXISTING TABLES AND VIEWS (Reverse dependency order)
-- ---------------------------------------------------------------------
DROP VIEW IF EXISTS v_category_stats;
DROP VIEW IF EXISTS v_member_fines;
DROP VIEW IF EXISTS v_active_loans;
DROP VIEW IF EXISTS v_book_catalog;

DROP TRIGGER IF EXISTS trg_loan_audit_return;
DROP TRIGGER IF EXISTS trg_loan_audit_insert;
DROP TRIGGER IF EXISTS trg_after_loan_return;
DROP TRIGGER IF EXISTS trg_after_loan_insert;

DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS fines;
DROP TABLE IF EXISTS loans;
DROP TABLE IF EXISTS staff;
DROP TABLE IF EXISTS members;
DROP TABLE IF EXISTS book_authors;
DROP TABLE IF EXISTS books;
DROP TABLE IF EXISTS authors;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS publishers;

-- ---------------------------------------------------------------------
-- 2. DDL: CORE ENTITY TABLES
-- ---------------------------------------------------------------------

-- Publishers Entity
CREATE TABLE publishers (
    publisher_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    address TEXT,
    phone TEXT,
    email TEXT
);

-- Categories Entity
CREATE TABLE categories (
    category_id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_name TEXT NOT NULL UNIQUE,
    description TEXT
);

-- Authors Entity
CREATE TABLE authors (
    author_id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    biography TEXT
);

-- Books Entity (Strong Entity with Foreign Keys to Categories & Publishers)
CREATE TABLE books (
    book_id INTEGER PRIMARY KEY AUTOINCREMENT,
    isbn TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    category_id INTEGER NOT NULL,
    publisher_id INTEGER,
    publication_year INTEGER CHECK(publication_year >= 1000 AND publication_year <= 2100),
    total_copies INTEGER NOT NULL DEFAULT 1 CHECK(total_copies >= 0),
    available_copies INTEGER NOT NULL DEFAULT 1 CHECK(available_copies >= 0 AND available_copies <= total_copies),
    shelf_location TEXT,
    price REAL NOT NULL DEFAULT 0.0 CHECK(price >= 0.0),
    FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE RESTRICT,
    FOREIGN KEY (publisher_id) REFERENCES publishers(publisher_id) ON DELETE SET NULL
);

-- Book_Authors (Many-to-Many Relationship Bridge Entity)
CREATE TABLE book_authors (
    book_id INTEGER NOT NULL,
    author_id INTEGER NOT NULL,
    PRIMARY KEY (book_id, author_id),
    FOREIGN KEY (book_id) REFERENCES books(book_id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES authors(author_id) ON DELETE CASCADE
);

-- Members Entity (Students, Faculty, General Public)
CREATE TABLE members (
    member_id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT NOT NULL,
    membership_type TEXT NOT NULL CHECK(membership_type IN ('Student', 'Faculty', 'General')) DEFAULT 'Student',
    join_date DATE NOT NULL DEFAULT (DATE('now')),
    max_books_allowed INTEGER NOT NULL DEFAULT 3 CHECK(max_books_allowed > 0),
    status TEXT NOT NULL CHECK(status IN ('Active', 'Suspended', 'Expired')) DEFAULT 'Active'
);

-- Staff Entity
CREATE TABLE staff (
    staff_id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('Librarian', 'Assistant', 'Admin')) DEFAULT 'Librarian',
    email TEXT NOT NULL UNIQUE,
    phone TEXT
);

-- Loans Entity (Weak / Transactional Entity linking Members, Books, and Staff)
CREATE TABLE loans (
    loan_id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id INTEGER NOT NULL,
    member_id INTEGER NOT NULL,
    staff_id INTEGER,
    issue_date DATE NOT NULL DEFAULT (DATE('now')),
    due_date DATE NOT NULL CHECK(due_date >= issue_date),
    return_date DATE,
    status TEXT NOT NULL CHECK(status IN ('Issued', 'Returned', 'Overdue')) DEFAULT 'Issued',
    FOREIGN KEY (book_id) REFERENCES books(book_id) ON DELETE RESTRICT,
    FOREIGN KEY (member_id) REFERENCES members(member_id) ON DELETE RESTRICT,
    FOREIGN KEY (staff_id) REFERENCES staff(staff_id) ON DELETE SET NULL
);

-- Fines Entity (Financial penalty for overdue loans)
CREATE TABLE fines (
    fine_id INTEGER PRIMARY KEY AUTOINCREMENT,
    loan_id INTEGER NOT NULL UNIQUE,
    fine_amount REAL NOT NULL DEFAULT 0.0 CHECK(fine_amount >= 0.0),
    fine_date DATE NOT NULL DEFAULT (DATE('now')),
    paid_status TEXT NOT NULL CHECK(paid_status IN ('Unpaid', 'Paid')) DEFAULT 'Unpaid',
    paid_date DATE,
    FOREIGN KEY (loan_id) REFERENCES loans(loan_id) ON DELETE CASCADE
);

-- Audit Logs Entity (Tracks database state changes for accountability)
CREATE TABLE audit_logs (
    log_id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id INTEGER,
    details TEXT,
    timestamp DATETIME NOT NULL DEFAULT (DATETIME('now', 'localtime'))
);

-- ---------------------------------------------------------------------
-- 3. INDEXES (Optimizing query performance on lookup columns)
-- ---------------------------------------------------------------------
CREATE INDEX idx_books_isbn ON books(isbn);
CREATE INDEX idx_books_title ON books(title);
CREATE INDEX idx_books_category ON books(category_id);
CREATE INDEX idx_loans_member ON loans(member_id);
CREATE INDEX idx_loans_book ON loans(book_id);
CREATE INDEX idx_loans_status ON loans(status);
CREATE INDEX idx_fines_paid_status ON fines(paid_status);

-- ---------------------------------------------------------------------
-- 4. TRIGGERS (Automated Business Logic & Integrity Enforcement)
-- ---------------------------------------------------------------------

-- Trigger 1: Decrement available book copies upon issuing a loan
CREATE TRIGGER trg_after_loan_insert
AFTER INSERT ON loans
FOR EACH ROW
BEGIN
    UPDATE books
    SET available_copies = available_copies - 1
    WHERE book_id = NEW.book_id;
END;

-- Trigger 2: Increment available book copies upon returning a loan
CREATE TRIGGER trg_after_loan_return
AFTER UPDATE OF return_date ON loans
FOR EACH ROW
WHEN OLD.return_date IS NULL AND NEW.return_date IS NOT NULL
BEGIN
    UPDATE books
    SET available_copies = available_copies + 1
    WHERE book_id = NEW.book_id;

    UPDATE loans
    SET status = 'Returned'
    WHERE loan_id = NEW.loan_id;
END;

-- Trigger 3: Audit log entry on new loan issuance
CREATE TRIGGER trg_loan_audit_insert
AFTER INSERT ON loans
FOR EACH ROW
BEGIN
    INSERT INTO audit_logs (action, table_name, record_id, details)
    VALUES (
        'INSERT_LOAN',
        'loans',
        NEW.loan_id,
        'Book ID ' || NEW.book_id || ' issued to Member ID ' || NEW.member_id || ' due on ' || NEW.due_date
    );
END;

-- Trigger 4: Audit log entry on book return
CREATE TRIGGER trg_loan_audit_return
AFTER UPDATE OF return_date ON loans
FOR EACH ROW
WHEN OLD.return_date IS NULL AND NEW.return_date IS NOT NULL
BEGIN
    INSERT INTO audit_logs (action, table_name, record_id, details)
    VALUES (
        'RETURN_LOAN',
        'loans',
        NEW.loan_id,
        'Book ID ' || NEW.book_id || ' returned by Member ID ' || NEW.member_id || ' on ' || NEW.return_date
    );
END;

-- ---------------------------------------------------------------------
-- 5. VIEWS (Virtual Tables for Reporting and Abstraction)
-- ---------------------------------------------------------------------

-- View 1: Complete Book Catalog with aggregated authors & publisher details
CREATE VIEW v_book_catalog AS
SELECT 
    b.book_id,
    b.isbn,
    b.title,
    c.category_name,
    p.name AS publisher_name,
    b.publication_year,
    b.total_copies,
    b.available_copies,
    b.shelf_location,
    b.price,
    COALESCE(GROUP_CONCAT(a.first_name || ' ' || a.last_name, ', '), 'Unknown Author') AS authors
FROM books b
JOIN categories c ON b.category_id = c.category_id
LEFT JOIN publishers p ON b.publisher_id = p.publisher_id
LEFT JOIN book_authors ba ON b.book_id = ba.book_id
LEFT JOIN authors a ON ba.author_id = a.author_id
GROUP BY b.book_id;

-- View 2: Active & Overdue Loans with computed overdue status
CREATE VIEW v_active_loans AS
SELECT 
    l.loan_id,
    l.book_id,
    b.title AS book_title,
    b.isbn,
    l.member_id,
    m.first_name || ' ' || m.last_name AS member_name,
    m.email AS member_email,
    m.phone AS member_phone,
    l.issue_date,
    l.due_date,
    l.return_date,
    l.status,
    CASE 
        WHEN l.return_date IS NULL AND DATE('now') > l.due_date THEN CAST(ROUND(julianday('now') - julianday(l.due_date)) AS INTEGER)
        WHEN l.return_date IS NOT NULL AND l.return_date > l.due_date THEN CAST(ROUND(julianday(l.return_date) - julianday(l.due_date)) AS INTEGER)
        ELSE 0 
    END AS days_overdue,
    f.fine_amount,
    COALESCE(f.paid_status, 'None') AS fine_status
FROM loans l
JOIN books b ON l.book_id = b.book_id
JOIN members m ON l.member_id = m.member_id
LEFT JOIN fines f ON l.loan_id = f.loan_id;

-- View 3: Member Fines Summary (Aggregation)
CREATE VIEW v_member_fines AS
SELECT 
    m.member_id,
    m.first_name || ' ' || m.last_name AS member_name,
    m.email,
    COUNT(f.fine_id) AS total_fines_count,
    ROUND(COALESCE(SUM(f.fine_amount), 0.0), 2) AS total_fine_incurred,
    ROUND(COALESCE(SUM(CASE WHEN f.paid_status = 'Paid' THEN f.fine_amount ELSE 0 END), 0.0), 2) AS total_fine_paid,
    ROUND(COALESCE(SUM(CASE WHEN f.paid_status = 'Unpaid' THEN f.fine_amount ELSE 0 END), 0.0), 2) AS total_fine_outstanding
FROM members m
LEFT JOIN loans l ON m.member_id = l.member_id
LEFT JOIN fines f ON l.loan_id = f.loan_id
GROUP BY m.member_id;

-- View 4: Category Distribution and Availability
CREATE VIEW v_category_stats AS
SELECT 
    c.category_id,
    c.category_name,
    COUNT(b.book_id) AS title_count,
    COALESCE(SUM(b.total_copies), 0) AS total_stock,
    COALESCE(SUM(b.available_copies), 0) AS currently_available,
    COALESCE(SUM(b.total_copies - b.available_copies), 0) AS currently_borrowed
FROM categories c
LEFT JOIN books b ON c.category_id = b.category_id
GROUP BY c.category_id;

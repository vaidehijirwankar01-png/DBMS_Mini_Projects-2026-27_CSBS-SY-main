-- =====================================================================
-- DATABASE MANAGEMENT SYSTEM (DBMS) MINI PROJECT
-- Project: Library Management System
-- Dialect: MySQL 8.0+ / MariaDB 10.5+ Compatible Schema
-- =====================================================================

DROP DATABASE IF EXISTS library_db;
CREATE DATABASE library_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE library_db;

-- 1. Publishers
CREATE TABLE publishers (
    publisher_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL UNIQUE,
    address TEXT,
    phone VARCHAR(30),
    email VARCHAR(100)
) ENGINE=InnoDB;

-- 2. Categories
CREATE TABLE categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT
) ENGINE=InnoDB;

-- 3. Authors
CREATE TABLE authors (
    author_id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    biography TEXT
) ENGINE=InnoDB;

-- 4. Books
CREATE TABLE books (
    book_id INT AUTO_INCREMENT PRIMARY KEY,
    isbn VARCHAR(20) NOT NULL UNIQUE,
    title VARCHAR(200) NOT NULL,
    category_id INT NOT NULL,
    publisher_id INT,
    publication_year INT CHECK (publication_year BETWEEN 1000 AND 2100),
    total_copies INT NOT NULL DEFAULT 1 CHECK (total_copies >= 0),
    available_copies INT NOT NULL DEFAULT 1 CHECK (available_copies >= 0 AND available_copies <= total_copies),
    shelf_location VARCHAR(50),
    price DECIMAL(10, 2) NOT NULL DEFAULT 0.00 CHECK (price >= 0.00),
    CONSTRAINT fk_books_category FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE RESTRICT,
    CONSTRAINT fk_books_publisher FOREIGN KEY (publisher_id) REFERENCES publishers(publisher_id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 5. Book_Authors (Many-to-Many Bridge Table)
CREATE TABLE book_authors (
    book_id INT NOT NULL,
    author_id INT NOT NULL,
    PRIMARY KEY (book_id, author_id),
    CONSTRAINT fk_ba_book FOREIGN KEY (book_id) REFERENCES books(book_id) ON DELETE CASCADE,
    CONSTRAINT fk_ba_author FOREIGN KEY (author_id) REFERENCES authors(author_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 6. Members
CREATE TABLE members (
    member_id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(25) NOT NULL,
    membership_type ENUM('Student', 'Faculty', 'General') NOT NULL DEFAULT 'Student',
    join_date DATE NOT NULL DEFAULT (CURRENT_DATE),
    max_books_allowed INT NOT NULL DEFAULT 3 CHECK (max_books_allowed > 0),
    status ENUM('Active', 'Suspended', 'Expired') NOT NULL DEFAULT 'Active'
) ENGINE=InnoDB;

-- 7. Staff
CREATE TABLE staff (
    staff_id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    role ENUM('Librarian', 'Assistant', 'Admin') NOT NULL DEFAULT 'Librarian',
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(25)
) ENGINE=InnoDB;

-- 8. Loans
CREATE TABLE loans (
    loan_id INT AUTO_INCREMENT PRIMARY KEY,
    book_id INT NOT NULL,
    member_id INT NOT NULL,
    staff_id INT,
    issue_date DATE NOT NULL DEFAULT (CURRENT_DATE),
    due_date DATE NOT NULL,
    return_date DATE NULL,
    status ENUM('Issued', 'Returned', 'Overdue') NOT NULL DEFAULT 'Issued',
    CONSTRAINT chk_due_date CHECK (due_date >= issue_date),
    CONSTRAINT fk_loans_book FOREIGN KEY (book_id) REFERENCES books(book_id) ON DELETE RESTRICT,
    CONSTRAINT fk_loans_member FOREIGN KEY (member_id) REFERENCES members(member_id) ON DELETE RESTRICT,
    CONSTRAINT fk_loans_staff FOREIGN KEY (staff_id) REFERENCES staff(staff_id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 9. Fines
CREATE TABLE fines (
    fine_id INT AUTO_INCREMENT PRIMARY KEY,
    loan_id INT NOT NULL UNIQUE,
    fine_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00 CHECK (fine_amount >= 0.00),
    fine_date DATE NOT NULL DEFAULT (CURRENT_DATE),
    paid_status ENUM('Unpaid', 'Paid') NOT NULL DEFAULT 'Unpaid',
    paid_date DATE NULL,
    CONSTRAINT fk_fines_loan FOREIGN KEY (loan_id) REFERENCES loans(loan_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 10. Audit Logs
CREATE TABLE audit_logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    action VARCHAR(50) NOT NULL,
    table_name VARCHAR(50) NOT NULL,
    record_id INT,
    details TEXT,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Indexes
CREATE INDEX idx_books_isbn ON books(isbn);
CREATE INDEX idx_books_title ON books(title);
CREATE INDEX idx_loans_status ON loans(status);

-- Triggers for MySQL
DELIMITER $$

CREATE TRIGGER trg_mysql_after_loan_insert
AFTER INSERT ON loans
FOR EACH ROW
BEGIN
    UPDATE books
    SET available_copies = available_copies - 1
    WHERE book_id = NEW.book_id;

    INSERT INTO audit_logs (action, table_name, record_id, details)
    VALUES ('INSERT_LOAN', 'loans', NEW.loan_id, CONCAT('Book ID ', NEW.book_id, ' issued to Member ID ', NEW.member_id));
END$$

CREATE TRIGGER trg_mysql_after_loan_return
AFTER UPDATE ON loans
FOR EACH ROW
BEGIN
    IF OLD.return_date IS NULL AND NEW.return_date IS NOT NULL THEN
        UPDATE books
        SET available_copies = available_copies + 1
        WHERE book_id = NEW.book_id;

        INSERT INTO audit_logs (action, table_name, record_id, details)
        VALUES ('RETURN_LOAN', 'loans', NEW.loan_id, CONCAT('Book ID ', NEW.book_id, ' returned'));
    END IF;
END$$

DELIMITER ;

-- Views
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
    COALESCE(GROUP_CONCAT(CONCAT(a.first_name, ' ', a.last_name) SEPARATOR ', '), 'Unknown Author') AS authors
FROM books b
JOIN categories c ON b.category_id = c.category_id
LEFT JOIN publishers p ON b.publisher_id = p.publisher_id
LEFT JOIN book_authors ba ON b.book_id = ba.book_id
LEFT JOIN authors a ON ba.author_id = a.author_id
GROUP BY b.book_id, b.isbn, b.title, c.category_name, p.name, b.publication_year, b.total_copies, b.available_copies, b.shelf_location, b.price;

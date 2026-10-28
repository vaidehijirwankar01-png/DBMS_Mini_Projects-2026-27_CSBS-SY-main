-- =====================================================================
-- Library Management System - MySQL 8 schema (database: LibraryDB)
-- Apply with:  python manage.py init-db     or     mysql -u root -p < schema/mysql.sql
-- Plain statements only (no DELIMITER) so the app can run them one by one.
-- Stored procedure + trigger live in schema/mysql_extras.sql.
-- =====================================================================
CREATE DATABASE IF NOT EXISTS LibraryDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE LibraryDB;

CREATE TABLE IF NOT EXISTS Librarian (
  Librarian_ID  INT AUTO_INCREMENT PRIMARY KEY,
  Username      VARCHAR(40)  NOT NULL UNIQUE,
  Full_Name     VARCHAR(80)  NOT NULL,
  Password_Hash VARCHAR(255) NOT NULL,
  Role          ENUM('admin','librarian') NOT NULL DEFAULT 'librarian',
  Created_On    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS Member (
  Member_ID  INT AUTO_INCREMENT PRIMARY KEY,
  Name       VARCHAR(80) NOT NULL,
  Department VARCHAR(40),
  Phone      VARCHAR(15) UNIQUE,
  Joined_On  DATE DEFAULT (CURRENT_DATE)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS Book (
  Book_ID  INT AUTO_INCREMENT PRIMARY KEY,
  Title    VARCHAR(120) NOT NULL,
  Author   VARCHAR(80)  NOT NULL,
  Category VARCHAR(40),
  Quantity INT NOT NULL DEFAULT 0,
  CONSTRAINT chk_book_qty CHECK (Quantity >= 0),
  INDEX idx_book_title (Title)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS Issue (
  Issue_ID    INT AUTO_INCREMENT PRIMARY KEY,
  Member_ID   INT  NOT NULL,
  Book_ID     INT  NOT NULL,
  Issue_Date  DATE NOT NULL,
  Due_Date    DATE NOT NULL,
  Return_Date DATE NULL,
  Renewed     TINYINT(1) NOT NULL DEFAULT 0,
  INDEX idx_issue_open (Return_Date),
  CONSTRAINT fk_issue_member FOREIGN KEY (Member_ID) REFERENCES Member(Member_ID),
  CONSTRAINT fk_issue_book   FOREIGN KEY (Book_ID)   REFERENCES Book(Book_ID)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS Fine (
  Fine_ID  INT AUTO_INCREMENT PRIMARY KEY,
  Issue_ID INT NOT NULL UNIQUE,
  Amount   INT NOT NULL,
  Paid     TINYINT(1) NOT NULL DEFAULT 0,
  CONSTRAINT chk_fine_amt CHECK (Amount >= 0),
  CONSTRAINT fk_fine_issue FOREIGN KEY (Issue_ID) REFERENCES Issue(Issue_ID)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS Audit_Log (
  Log_ID    INT AUTO_INCREMENT PRIMARY KEY,
  Username  VARCHAR(40) NOT NULL,
  Action    VARCHAR(40) NOT NULL,
  Detail    VARCHAR(255),
  Logged_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE OR REPLACE VIEW vw_overdue AS
SELECT i.Issue_ID, m.Name AS Member, b.Title, i.Due_Date,
       DATEDIFF(CURDATE(), i.Due_Date) AS Days_Late
FROM Issue i
JOIN Member m ON m.Member_ID = i.Member_ID
JOIN Book   b ON b.Book_ID   = i.Book_ID
WHERE i.Return_Date IS NULL AND i.Due_Date < CURDATE()

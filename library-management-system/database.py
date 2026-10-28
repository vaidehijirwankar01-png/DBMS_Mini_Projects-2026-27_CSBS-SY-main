"""
Database Access Layer (DAL) for Library Management System
Demonstrates:
  - Connection pooling & Foreign Key constraint enforcement
  - ACID Compliant Transactions
  - Parameterized Queries (SQL Injection Prevention)
  - Business logic with automatic integrity checks
"""

import sqlite3
import os
from datetime import datetime, date, timedelta
from typing import List, Dict, Any, Optional, Tuple

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "library.db")
SCHEMA_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sql", "schema.sql")
SEED_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sql", "seed_data.sql")


def get_connection() -> sqlite3.Connection:
    """Creates a database connection with foreign key enforcement and row factory."""
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.row_factory = sqlite3.Row
    return conn


def init_db(force: bool = False) -> None:
    """Initializes schema and seeds sample data if DB doesn't exist or force is True."""
    if force and os.path.exists(DB_PATH):
        os.remove(DB_PATH)

    db_is_new = not os.path.exists(DB_PATH)
    
    if db_is_new or force:
        print("[INFO] Initializing Database Schema and Seed Data...")
        conn = get_connection()
        try:
            with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
                conn.executescript(f.read())
            with open(SEED_PATH, "r", encoding="utf-8") as f:
                conn.executescript(f.read())
            conn.commit()
            print("[INFO] Database successfully initialized at:", DB_PATH)
        except Exception as e:
            conn.rollback()
            print("[ERROR] Database initialization failed:", e)
            raise e
        finally:
            conn.close()


def query_all(sql: str, params: tuple = ()) -> List[Dict[str, Any]]:
    """Execute a SELECT query and return all rows as list of dictionaries."""
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(sql, params)
        rows = cursor.fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()


def query_one(sql: str, params: tuple = ()) -> Optional[Dict[str, Any]]:
    """Execute a SELECT query and return one row as dictionary or None."""
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(sql, params)
        row = cursor.fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def execute_write(sql: str, params: tuple = ()) -> int:
    """Execute INSERT/UPDATE/DELETE and return lastrowid or rowcount."""
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(sql, params)
        conn.commit()
        return cursor.lastrowid if cursor.lastrowid else cursor.rowcount
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()


# ---------------------------------------------------------------------
# High-Level DBMS Business Logic
# ---------------------------------------------------------------------

def get_dashboard_metrics() -> Dict[str, Any]:
    """Retrieves high-level summary statistics using aggregation queries."""
    stats = {}
    
    # Book inventory metrics
    b_stat = query_one("""
        SELECT 
            COUNT(*) AS total_titles,
            COALESCE(SUM(total_copies), 0) AS total_inventory,
            COALESCE(SUM(available_copies), 0) AS available_inventory
        FROM books
    """)
    stats["total_titles"] = b_stat["total_titles"]
    stats["total_inventory"] = b_stat["total_inventory"]
    stats["available_inventory"] = b_stat["available_inventory"]
    stats["borrowed_inventory"] = b_stat["total_inventory"] - b_stat["available_inventory"]

    # Members metric
    m_stat = query_one("SELECT COUNT(*) AS total_members FROM members WHERE status = 'Active'")
    stats["active_members"] = m_stat["total_members"]

    # Active and Overdue loans
    l_stat = query_one("""
        SELECT 
            COUNT(CASE WHEN return_date IS NULL THEN 1 END) AS active_loans,
            COUNT(CASE WHEN return_date IS NULL AND DATE('now') > due_date THEN 1 END) AS overdue_loans
        FROM loans
    """)
    stats["active_loans"] = l_stat["active_loans"]
    stats["overdue_loans"] = l_stat["overdue_loans"]

    # Fines metrics
    f_stat = query_one("""
        SELECT 
            COALESCE(SUM(CASE WHEN paid_status = 'Unpaid' THEN fine_amount ELSE 0 END), 0.0) AS unpaid_fines,
            COALESCE(SUM(CASE WHEN paid_status = 'Paid' THEN fine_amount ELSE 0 END), 0.0) AS collected_fines
        FROM fines
    """)
    stats["unpaid_fines"] = round(f_stat["unpaid_fines"], 2)
    stats["collected_fines"] = round(f_stat["collected_fines"], 2)

    return stats


def issue_book_transaction(book_id: int, member_id: int, staff_id: int = 1, days: int = 14) -> Tuple[bool, str]:
    """
    Demonstrates ACID Transaction:
      1. Verify Member eligibility (Active status, borrowing limit not exceeded)
      2. Verify Book availability (available_copies > 0)
      3. Insert Loan record (Trigger will automatically decrement book copy)
      4. Commit on success, Rollback on any failure
    """
    conn = get_connection()
    try:
        conn.execute("BEGIN TRANSACTION;")
        cursor = conn.cursor()

        # Step 1: Check member status & active loans
        cursor.execute("SELECT status, max_books_allowed FROM members WHERE member_id = ?", (member_id,))
        member = cursor.fetchone()
        if not member:
            conn.rollback()
            return False, "Member not found."
        if member["status"] != "Active":
            conn.rollback()
            return False, f"Member account is {member['status']}. Cannot issue books."

        cursor.execute("SELECT COUNT(*) AS cnt FROM loans WHERE member_id = ? AND return_date IS NULL", (member_id,))
        current_loans = cursor.fetchone()["cnt"]
        if current_loans >= member["max_books_allowed"]:
            conn.rollback()
            return False, f"Borrowing limit reached ({current_loans}/{member['max_books_allowed']} books currently issued)."

        # Step 2: Check book availability
        cursor.execute("SELECT title, available_copies FROM books WHERE book_id = ?", (book_id,))
        book = cursor.fetchone()
        if not book:
            conn.rollback()
            return False, "Book not found."
        if book["available_copies"] <= 0:
            conn.rollback()
            return False, f"No copies available for '{book['title']}'."

        # Step 3: Insert loan record
        issue_d = date.today()
        due_d = issue_d + timedelta(days=days)
        cursor.execute("""
            INSERT INTO loans (book_id, member_id, staff_id, issue_date, due_date, status)
            VALUES (?, ?, ?, ?, ?, 'Issued')
        """, (book_id, member_id, staff_id, str(issue_d), str(due_d)))

        # Commit transaction
        conn.commit()
        return True, f"Book '{book['title']}' successfully issued! Due date: {due_d}."

    except Exception as e:
        conn.rollback()
        return False, f"Transaction aborted due to error: {str(e)}"
    finally:
        conn.close()


def return_book_transaction(loan_id: int, fine_per_day: float = 5.0) -> Tuple[bool, str, float]:
    """
    Demonstrates ACID Transaction for Book Return:
      1. Check loan status
      2. Set return_date (Trigger automatically restores available_copies)
      3. Compute overdue fine if return_date > due_date
      4. Insert fine record if overdue
    """
    conn = get_connection()
    try:
        conn.execute("BEGIN TRANSACTION;")
        cursor = conn.cursor()

        cursor.execute("""
            SELECT l.loan_id, l.book_id, l.member_id, l.due_date, l.return_date, b.title
            FROM loans l
            JOIN books b ON l.book_id = b.book_id
            WHERE l.loan_id = ?
        """, (loan_id,))
        loan = cursor.fetchone()

        if not loan:
            conn.rollback()
            return False, "Loan record not found.", 0.0

        if loan["return_date"] is not None:
            conn.rollback()
            return False, "This book has already been marked as returned.", 0.0

        today = date.today()
        today_str = str(today)

        # Update loan with return date
        cursor.execute("""
            UPDATE loans 
            SET return_date = ?, status = 'Returned'
            WHERE loan_id = ?
        """, (today_str, loan_id))

        # Check for overdue
        due_date = datetime.strptime(loan["due_date"], "%Y-%m-%d").date()
        fine_amount = 0.0

        if today > due_date:
            overdue_days = (today - due_date).days
            fine_amount = round(overdue_days * fine_per_day, 2)

            # Check if a fine was already generated for this loan
            cursor.execute("SELECT fine_id, fine_amount, paid_status FROM fines WHERE loan_id = ?", (loan_id,))
            existing_fine = cursor.fetchone()

            if existing_fine:
                # Update existing unpaid fine to reflect final returned overdue amount
                if existing_fine["paid_status"] == "Unpaid":
                    cursor.execute("""
                        UPDATE fines 
                        SET fine_amount = ?, fine_date = ?
                        WHERE fine_id = ?
                    """, (fine_amount, today_str, existing_fine["fine_id"]))
            else:
                cursor.execute("""
                    INSERT INTO fines (loan_id, fine_amount, fine_date, paid_status)
                    VALUES (?, ?, ?, 'Unpaid')
                """, (loan_id, fine_amount, today_str))

        conn.commit()
        msg = f"Book '{loan['title']}' returned successfully."
        if fine_amount > 0:
            msg += f" Overdue fine assessed: ₹{fine_amount:.2f}."
        return True, msg, fine_amount

    except Exception as e:
        conn.rollback()
        return False, f"Failed to return book: {str(e)}", 0.0
    finally:
        conn.close()


def pay_fine_transaction(fine_id: int) -> Tuple[bool, str]:
    """Records payment for an outstanding fine."""
    conn = get_connection()
    try:
        conn.execute("BEGIN TRANSACTION;")
        cursor = conn.cursor()

        cursor.execute("SELECT paid_status, fine_amount FROM fines WHERE fine_id = ?", (fine_id,))
        fine = cursor.fetchone()
        if not fine:
            conn.rollback()
            return False, "Fine record not found."
        if fine["paid_status"] == "Paid":
            conn.rollback()
            return False, "This fine has already been paid."

        today_str = str(date.today())
        cursor.execute("""
            UPDATE fines
            SET paid_status = 'Paid', paid_date = ?
            WHERE fine_id = ?
        """, (today_str, fine_id))

        cursor.execute("""
            INSERT INTO audit_logs (action, table_name, record_id, details)
            VALUES ('FINE_PAYMENT', 'fines', ?, ?)
        """, (fine_id, f"Collected ₹{fine['fine_amount']:.2f} for fine ID {fine_id}"))

        conn.commit()
        return True, f"Fine of ₹{fine['fine_amount']:.2f} recorded as PAID."
    except Exception as e:
        conn.rollback()
        return False, f"Payment recording failed: {str(e)}"
    finally:
        conn.close()

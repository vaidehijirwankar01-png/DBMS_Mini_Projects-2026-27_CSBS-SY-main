#!/usr/bin/env python3
"""
Interactive Command-Line Interface (CLI) for Library Management System
Allows interactive DBMS testing, query execution, and transactions directly from terminal.
"""

import sys
import database


def print_header(title: str):
    print("\n" + "=" * 65)
    print(f" {title}".center(65))
    print("=" * 65)


def print_table(headers, rows):
    """Utility to pretty-print database tabular output in terminal."""
    if not rows:
        print("  [No records found]")
        return

    # Determine column widths
    widths = [len(h) for h in headers]
    for row in rows:
        for idx, val in enumerate(row):
            widths[idx] = max(widths[idx], len(str(val if val is not None else "")))

    # Print header
    header_str = " | ".join(f"{h:<{widths[i]}}" for i, h in enumerate(headers))
    sep_str = "-+-".join("-" * widths[i] for i in range(len(headers)))
    print("  " + header_str)
    print("  " + sep_str)

    # Print rows
    for row in rows:
        row_str = " | ".join(f"{str(val if val is not None else ''):<{widths[i]}}" for i, val in enumerate(row))
        print("  " + row_str)


def view_catalog():
    print_header("BOOK CATALOG (View: v_book_catalog)")
    sql = """
        SELECT book_id, isbn, substr(title, 1, 28) AS title, category_name, 
               substr(authors, 1, 22) AS authors, available_copies, total_copies, price
        FROM v_book_catalog
        ORDER BY book_id
    """
    rows = database.query_all(sql)
    headers = ["ID", "ISBN", "Title", "Category", "Authors", "Avail", "Total", "Price ($)"]
    data = [[r["book_id"], r["isbn"], r["title"], r["category_name"], r["authors"], 
             r["available_copies"], r["total_copies"], f"{r['price']:.2f}"] for r in rows]
    print_table(headers, data)


def search_books():
    print_header("SEARCH BOOKS")
    term = input("Enter search keyword (Title, Author, or ISBN): ").strip()
    if not term:
        print("Empty search term.")
        return

    sql = """
        SELECT book_id, isbn, title, category_name, authors, available_copies, total_copies
        FROM v_book_catalog
        WHERE title LIKE ? OR authors LIKE ? OR isbn LIKE ?
    """
    param = f"%{term}%"
    rows = database.query_all(sql, (param, param, param))
    headers = ["ID", "ISBN", "Title", "Category", "Authors", "Avail", "Total"]
    data = [[r["book_id"], r["isbn"], r["title"], r["category_name"], r["authors"], 
             r["available_copies"], r["total_copies"]] for r in rows]
    print_table(headers, data)


def view_members():
    print_header("LIBRARY MEMBERS DIRECTORY")
    sql = """
        SELECT member_id, first_name || ' ' || last_name AS name, email, phone, 
               membership_type, max_books_allowed, status
        FROM members
        ORDER BY member_id
    """
    rows = database.query_all(sql)
    headers = ["ID", "Name", "Email", "Phone", "Type", "Quota", "Status"]
    data = [[r["member_id"], r["name"], r["email"], r["phone"], r["membership_type"], 
             r["max_books_allowed"], r["status"]] for r in rows]
    print_table(headers, data)


def issue_book_cli():
    print_header("CIRCULATION: ISSUE BOOK (TRANSACTION)")
    try:
        book_id = int(input("Enter Book ID to issue: ").strip())
        member_id = int(input("Enter Member ID: ").strip())
        days_str = input("Loan duration in days [Default 14]: ").strip()
        days = int(days_str) if days_str else 14

        success, message = database.issue_book_transaction(book_id, member_id, staff_id=1, days=days)
        if success:
            print(f"\n[SUCCESS] {message}")
        else:
            print(f"\n[REJECTED] {message}")
    except ValueError:
        print("[ERROR] Please enter valid numeric IDs.")


def return_book_cli():
    print_header("CIRCULATION: RETURN BOOK (TRANSACTION)")
    # Show active loans
    sql = """
        SELECT l.loan_id, l.book_id, b.title, l.member_id, m.first_name || ' ' || m.last_name AS member_name,
               l.issue_date, l.due_date
        FROM loans l
        JOIN books b ON l.book_id = b.book_id
        JOIN members m ON l.member_id = m.member_id
        WHERE l.return_date IS NULL
        ORDER BY l.due_date
    """
    loans = database.query_all(sql)
    if not loans:
        print("  No active loans to return.")
        return

    headers = ["Loan ID", "Book ID", "Title", "Member", "Issue Date", "Due Date"]
    data = [[l["loan_id"], l["book_id"], l["title"][:25], l["member_name"], l["issue_date"], l["due_date"]] for l in loans]
    print_table(headers, data)

    try:
        loan_id = int(input("\nEnter Loan ID to return: ").strip())
        success, message, fine = database.return_book_transaction(loan_id)
        if success:
            print(f"\n[SUCCESS] {message}")
        else:
            print(f"\n[ERROR] {message}")
    except ValueError:
        print("[ERROR] Invalid numeric ID.")


def view_fines_cli():
    print_header("FINES MANAGEMENT")
    sql = """
        SELECT f.fine_id, f.loan_id, m.first_name || ' ' || m.last_name AS member_name,
               b.title, f.fine_amount, f.fine_date, f.paid_status
        FROM fines f
        JOIN loans l ON f.loan_id = l.loan_id
        JOIN members m ON l.member_id = m.member_id
        JOIN books b ON l.book_id = b.book_id
        ORDER BY f.paid_status DESC, f.fine_id DESC
    """
    rows = database.query_all(sql)
    headers = ["Fine ID", "Loan ID", "Member", "Book Title", "Amount ($)", "Date", "Status"]
    data = [[r["fine_id"], r["loan_id"], r["member_name"], r["title"][:22], f"{r['fine_amount']:.2f}", 
             r["fine_date"], r["paid_status"]] for r in rows]
    print_table(headers, data)

    unpaid = [r for r in rows if r["paid_status"] == "Unpaid"]
    if unpaid:
        pay = input("\nWould you like to pay an outstanding fine? (y/n): ").strip().lower()
        if pay == 'y':
            try:
                fid = int(input("Enter Fine ID to mark as PAID: ").strip())
                success, msg = database.pay_fine_transaction(fid)
                print(f"[{'SUCCESS' if success else 'ERROR'}] {msg}")
            except ValueError:
                print("Invalid input.")


def run_dbms_analytics():
    print_header("ADVANCED DBMS QUERY SHOWCASE")
    print("  1. Books priced higher than category average (Correlated Subquery)")
    print("  2. Categories with >= 2 titles and Avg Price > $50 (GROUP BY + HAVING)")
    print("  3. Most frequently borrowed books (Aggregation & JOIN)")
    print("  4. Members who never borrowed any book (Subquery with NOT EXISTS)")
    print("  5. Rank books in each category by price (Window Function RANK)")
    
    choice = input("\nSelect query to execute (1-5): ").strip()
    if choice == "1":
        print_header("Correlated Subquery: Above Average Price by Category")
        sql = """
            SELECT b1.book_id, substr(b1.title, 1, 30) AS title, c.category_name, b1.price,
                   ROUND((SELECT AVG(b2.price) FROM books b2 WHERE b2.category_id = b1.category_id), 2) AS cat_avg
            FROM books b1
            JOIN categories c ON b1.category_id = c.category_id
            WHERE b1.price > (SELECT AVG(b2.price) FROM books b2 WHERE b2.category_id = b1.category_id)
        """
        rows = database.query_all(sql)
        headers = ["ID", "Title", "Category", "Price ($)", "Category Avg ($)"]
        data = [[r["book_id"], r["title"], r["category_name"], f"{r['price']:.2f}", f"{r['cat_avg']:.2f}"] for r in rows]
        print_table(headers, data)

    elif choice == "2":
        print_header("GROUP BY with HAVING: Categories with >= 2 books and Avg Price > $50")
        sql = """
            SELECT c.category_name, COUNT(b.book_id) AS total_titles, ROUND(AVG(b.price), 2) AS avg_price,
                   SUM(b.total_copies) AS total_stock
            FROM categories c
            JOIN books b ON c.category_id = b.category_id
            GROUP BY c.category_id, c.category_name
            HAVING COUNT(b.book_id) >= 2 AND AVG(b.price) > 50.0
        """
        rows = database.query_all(sql)
        headers = ["Category", "Titles Count", "Avg Price ($)", "Total Stock"]
        data = [[r["category_name"], r["total_titles"], f"{r['avg_price']:.2f}", r["total_stock"]] for r in rows]
        print_table(headers, data)

    elif choice == "3":
        print_header("Top Most Borrowed Books (Join & Aggregation)")
        sql = """
            SELECT b.book_id, substr(b.title, 1, 32) AS title, c.category_name, COUNT(l.loan_id) AS borrow_count
            FROM books b
            JOIN categories c ON b.category_id = c.category_id
            LEFT JOIN loans l ON b.book_id = l.book_id
            GROUP BY b.book_id
            ORDER BY borrow_count DESC
            LIMIT 5
        """
        rows = database.query_all(sql)
        headers = ["Book ID", "Title", "Category", "Times Borrowed"]
        data = [[r["book_id"], r["title"], r["category_name"], r["borrow_count"]] for r in rows]
        print_table(headers, data)

    elif choice == "4":
        print_header("NOT EXISTS: Members with Zero Borrowings")
        sql = """
            SELECT m.member_id, m.first_name || ' ' || m.last_name AS name, m.email, m.membership_type
            FROM members m
            WHERE NOT EXISTS (SELECT 1 FROM loans l WHERE l.member_id = m.member_id)
        """
        rows = database.query_all(sql)
        headers = ["Member ID", "Name", "Email", "Type"]
        data = [[r["member_id"], r["name"], r["email"], r["membership_type"]] for r in rows]
        print_table(headers, data)

    elif choice == "5":
        print_header("Window Function: RANK() Over Category Partitions")
        sql = """
            SELECT substr(b.title, 1, 30) AS title, c.category_name, b.price,
                   RANK() OVER (PARTITION BY b.category_id ORDER BY b.price DESC) AS price_rank
            FROM books b
            JOIN categories c ON b.category_id = c.category_id
            ORDER BY c.category_name, price_rank
        """
        rows = database.query_all(sql)
        headers = ["Title", "Category", "Price ($)", "Price Rank in Category"]
        data = [[r["title"], r["category_name"], f"{r['price']:.2f}", r["price_rank"]] for r in rows]
        print_table(headers, data)


def view_audit_logs():
    print_header("DATABASE AUDIT LOGS (Trigger Generated)")
    sql = "SELECT log_id, action, table_name, record_id, details, timestamp FROM audit_logs ORDER BY log_id DESC LIMIT 15"
    rows = database.query_all(sql)
    headers = ["Log ID", "Action", "Table", "Rec ID", "Details", "Timestamp"]
    data = [[r["log_id"], r["action"], r["table_name"], r["record_id"], r["details"][:30], r["timestamp"]] for r in rows]
    print_table(headers, data)


def main():
    database.init_db(force=False)

    while True:
        stats = database.get_dashboard_metrics()
        print_header("LIBRARY MANAGEMENT SYSTEM - DBMS CONSOLE")
        print(f"  [METRICS] Titles: {stats['total_titles']} | Stock: {stats['total_inventory']} | "
              f"Active Loans: {stats['active_loans']} | Overdue: {stats['overdue_loans']} | Unpaid Fines: ${stats['unpaid_fines']:.2f}")
        print("-" * 65)
        print("  1. View Book Catalog (View: v_book_catalog)")
        print("  2. Search Books")
        print("  3. View Library Members")
        print("  4. Issue Book (ACID Transaction)")
        print("  5. Return Book (ACID Transaction + Fine Calculation)")
        print("  6. Fines Tracking & Collection")
        print("  7. Advanced DBMS Analytics (Subqueries, Views, Window Functions)")
        print("  8. View Database Audit Logs (Trigger Verification)")
        print("  9. Reset / Re-seed Database to Default")
        print("  0. Exit")
        print("-" * 65)

        choice = input("Enter your choice (0-9): ").strip()
        if choice == "1":
            view_catalog()
        elif choice == "2":
            search_books()
        elif choice == "3":
            view_members()
        elif choice == "4":
            issue_book_cli()
        elif choice == "5":
            return_book_cli()
        elif choice == "6":
            view_fines_cli()
        elif choice == "7":
            run_dbms_analytics()
        elif choice == "8":
            view_audit_logs()
        elif choice == "9":
            confirm = input("Are you sure you want to reset the database? (y/n): ").strip().lower()
            if confirm == "y":
                database.init_db(force=True)
                print("[INFO] Database reset successfully!")
        elif choice == "0":
            print("\nThank you for using Library Management System. Goodbye!\n")
            break
        else:
            print("\n[!] Invalid selection. Please enter 0-9.")


if __name__ == "__main__":
    main()

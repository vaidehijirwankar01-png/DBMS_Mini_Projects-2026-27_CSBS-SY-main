#!/usr/bin/env python3
"""
Flask Application for Library Management System (DBMS Mini Project)
Routes, Controllers, Transaction Handling & SQL Console
"""

import os
from flask import Flask, render_template, request, redirect, url_for, flash
import database

app = Flask(__name__)
app.secret_key = "dbms-library-management-system-secret-key"

# Ensure database is initialized on startup
database.init_db(force=False)


@app.route("/")
def index():
    """Dashboard displaying summary statistics, active loans, and trigger audit logs."""
    stats = database.get_dashboard_metrics()
    active_loans = database.query_all("""
        SELECT * FROM v_active_loans 
        WHERE return_date IS NULL 
        ORDER BY days_overdue DESC, due_date ASC 
        LIMIT 6
    """)
    category_stats = database.query_all("""
        SELECT * FROM v_category_stats 
        ORDER BY total_stock DESC
    """)
    audit_logs = database.query_all("""
        SELECT * FROM audit_logs 
        ORDER BY log_id DESC 
        LIMIT 8
    """)
    return render_template(
        "index.html",
        stats=stats,
        active_loans=active_loans,
        category_stats=category_stats,
        audit_logs=audit_logs
    )


@app.route("/books")
def books():
    """Book catalog view powered by SQL View v_book_catalog."""
    book_list = database.query_all("SELECT * FROM v_book_catalog ORDER BY book_id ASC")
    categories = database.query_all("SELECT category_id, category_name FROM categories ORDER BY category_name ASC")
    publishers = database.query_all("SELECT publisher_id, name FROM publishers ORDER BY name ASC")
    authors = database.query_all("SELECT author_id, first_name, last_name FROM authors ORDER BY first_name, last_name ASC")

    return render_template(
        "books.html",
        books=book_list,
        categories=categories,
        publishers=publishers,
        authors=authors
    )


@app.route("/books/add", methods=["POST"])
def add_book_route():
    """Adds a new book record and associates authors via transaction."""
    title = request.form.get("title", "").strip()
    isbn = request.form.get("isbn", "").strip()
    category_id = request.form.get("category_id")
    publisher_id = request.form.get("publisher_id") or None
    publication_year = request.form.get("publication_year") or None
    total_copies = int(request.form.get("total_copies", 1))
    price = float(request.form.get("price", 0.0))
    shelf_location = request.form.get("shelf_location", "").strip()
    author_id = request.form.get("author_id")

    if not title or not isbn or not category_id or not author_id:
        flash("Title, ISBN, Category, and Primary Author are required.", "danger")
        return redirect(url_for("books"))

    conn = database.get_connection()
    try:
        conn.execute("BEGIN TRANSACTION;")
        cursor = conn.cursor()
        
        # Insert Book
        cursor.execute("""
            INSERT INTO books (isbn, title, category_id, publisher_id, publication_year, total_copies, available_copies, shelf_location, price)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (isbn, title, category_id, publisher_id, publication_year, total_copies, total_copies, shelf_location, price))
        new_book_id = cursor.lastrowid

        # Insert Book-Author M:N Link
        cursor.execute("""
            INSERT INTO book_authors (book_id, author_id)
            VALUES (?, ?)
        """, (new_book_id, author_id))

        # Insert Audit Log
        cursor.execute("""
            INSERT INTO audit_logs (action, table_name, record_id, details)
            VALUES ('INSERT_BOOK', 'books', ?, ?)
        """, (new_book_id, f"Added book '{title}' (ISBN: {isbn})"))

        conn.commit()
        flash(f"Book '{title}' successfully added to catalog!", "success")
    except Exception as e:
        conn.rollback()
        flash(f"Failed to add book: {str(e)}", "danger")
    finally:
        conn.close()

    return redirect(url_for("books"))


@app.route("/books/<int:book_id>")
def book_detail(book_id):
    """Detailed view for a specific book including M:N authors and loan history."""
    book = database.query_one("""
        SELECT b.*, c.category_name, p.name AS publisher_name
        FROM books b
        JOIN categories c ON b.category_id = c.category_id
        LEFT JOIN publishers p ON b.publisher_id = p.publisher_id
        WHERE b.book_id = ?
    """, (book_id,))

    if not book:
        flash("Book not found.", "danger")
        return redirect(url_for("books"))

    authors = database.query_all("""
        SELECT a.*
        FROM authors a
        JOIN book_authors ba ON a.author_id = ba.author_id
        WHERE ba.book_id = ?
    """, (book_id,))

    loan_history = database.query_all("""
        SELECT l.loan_id, l.issue_date, l.due_date, l.return_date, l.status,
               m.first_name || ' ' || m.last_name AS member_name
        FROM loans l
        JOIN members m ON l.member_id = m.member_id
        WHERE l.book_id = ?
        ORDER BY l.loan_id DESC
    """, (book_id,))

    return render_template("book_detail.html", book=book, authors=authors, loan_history=loan_history)


@app.route("/members")
def members():
    """Library members directory showing loan limits and outstanding fines."""
    member_list = database.query_all("""
        SELECT 
            m.member_id,
            m.first_name,
            m.last_name,
            m.email,
            m.phone,
            m.membership_type,
            m.join_date,
            m.max_books_allowed,
            m.status,
            COUNT(CASE WHEN l.return_date IS NULL THEN 1 END) AS current_loans_count,
            COALESCE(SUM(CASE WHEN f.paid_status = 'Unpaid' THEN f.fine_amount ELSE 0 END), 0.0) AS total_fine_outstanding
        FROM members m
        LEFT JOIN loans l ON m.member_id = l.member_id
        LEFT JOIN fines f ON l.loan_id = f.loan_id
        GROUP BY m.member_id
        ORDER BY m.member_id ASC
    """)
    return render_template("members.html", members=member_list)


@app.route("/members/add", methods=["POST"])
def add_member_route():
    """Registers a new member adhering to check constraints."""
    first_name = request.form.get("first_name", "").strip()
    last_name = request.form.get("last_name", "").strip()
    email = request.form.get("email", "").strip()
    phone = request.form.get("phone", "").strip()
    membership_type = request.form.get("membership_type", "Student")
    max_books = int(request.form.get("max_books_allowed", 3))

    if not first_name or not last_name or not email or not phone:
        flash("All fields are required.", "danger")
        return redirect(url_for("members"))

    try:
        database.execute_write("""
            INSERT INTO members (first_name, last_name, email, phone, membership_type, max_books_allowed, status)
            VALUES (?, ?, ?, ?, ?, ?, 'Active')
        """, (first_name, last_name, email, phone, membership_type, max_books))
        flash(f"Member '{first_name} {last_name}' registered successfully!", "success")
    except Exception as e:
        flash(f"Failed to register member (Duplicate Email or Constraint Error): {str(e)}", "danger")

    return redirect(url_for("members"))


@app.route("/circulation")
def circulation():
    """Circulation desk for issuing and returning books."""
    active_members = database.query_all("SELECT member_id, first_name, last_name, membership_type FROM members WHERE status = 'Active' ORDER BY first_name ASC")
    available_books = database.query_all("SELECT book_id, title, available_copies FROM books WHERE available_copies > 0 ORDER BY title ASC")
    active_loans = database.query_all("SELECT * FROM v_active_loans WHERE return_date IS NULL ORDER BY days_overdue DESC, due_date ASC")
    selected_book_id = request.args.get("book_id", type=int)

    return render_template(
        "circulation.html",
        members=active_members,
        available_books=available_books,
        active_loans=active_loans,
        selected_book_id=selected_book_id
    )


@app.route("/circulation/issue", methods=["POST"])
def issue_book_route():
    """Handles book issue via ACID transaction."""
    member_id = request.form.get("member_id", type=int)
    book_id = request.form.get("book_id", type=int)
    days = request.form.get("days", default=14, type=int)

    if not member_id or not book_id:
        flash("Please select both a member and a book.", "danger")
        return redirect(url_for("circulation"))

    success, message = database.issue_book_transaction(book_id, member_id, staff_id=1, days=days)
    if success:
        flash(message, "success")
    else:
        flash(message, "danger")

    return redirect(url_for("circulation"))


@app.route("/circulation/return/<int:loan_id>", methods=["POST"])
def return_book_route(loan_id):
    """Handles book return and overdue fine calculation via ACID transaction."""
    success, message, fine = database.return_book_transaction(loan_id)
    if success:
        flash(message, "success")
    else:
        flash(message, "danger")

    # Redirect back to referring page or circulation
    referrer = request.referrer
    if referrer and "circulation" not in referrer:
        return redirect(url_for("index"))
    return redirect(url_for("circulation"))


@app.route("/fines")
def fines():
    """Fines ledger and summary aggregations."""
    fines_list = database.query_all("""
        SELECT f.fine_id, f.loan_id, f.fine_amount, f.fine_date, f.paid_status, f.paid_date,
               m.first_name || ' ' || m.last_name AS member_name, m.email AS member_email,
               b.title AS book_title
        FROM fines f
        JOIN loans l ON f.loan_id = l.loan_id
        JOIN members m ON l.member_id = m.member_id
        JOIN books b ON l.book_id = b.book_id
        ORDER BY f.paid_status DESC, f.fine_date DESC
    """)

    # Aggregate summaries
    aggregates = database.query_one("""
        SELECT 
            COALESCE(SUM(fine_amount), 0.0) AS total_assessed,
            COALESCE(SUM(CASE WHEN paid_status = 'Paid' THEN fine_amount ELSE 0 END), 0.0) AS total_collected,
            COALESCE(SUM(CASE WHEN paid_status = 'Unpaid' THEN fine_amount ELSE 0 END), 0.0) AS total_pending
        FROM fines
    """)

    member_fines = database.query_all("""
        SELECT * FROM v_member_fines 
        WHERE total_fine_incurred > 0 
        ORDER BY total_fine_outstanding DESC
    """)

    return render_template(
        "fines.html",
        fines=fines_list,
        total_assessed=aggregates["total_assessed"],
        total_collected=aggregates["total_collected"],
        total_pending=aggregates["total_pending"],
        member_fines=member_fines
    )


@app.route("/fines/pay/<int:fine_id>", methods=["POST"])
def pay_fine_route(fine_id):
    """Marks an outstanding fine as settled/paid."""
    success, message = database.pay_fine_transaction(fine_id)
    if success:
        flash(message, "success")
    else:
        flash(message, "danger")
    return redirect(url_for("fines"))


@app.route("/sql_console", methods=["GET", "POST"])
def sql_console():
    """Interactive SQL query execution playground for DBMS lab demonstration."""
    default_query = "SELECT * FROM v_book_catalog LIMIT 5;"
    executed_query = default_query
    results = None
    columns = []
    row_count = 0
    query_error = None

    if request.method == "POST":
        executed_query = request.form.get("query", "").strip()
        # Security sanitization: Allow SELECT and EXPLAIN
        upper_q = executed_query.strip().upper()
        if not (upper_q.startswith("SELECT") or upper_q.startswith("EXPLAIN") or upper_q.startswith("WITH")):
            query_error = "Execution blocked: For safety in this console, only read-only queries (SELECT, WITH, EXPLAIN) are permitted."
        else:
            try:
                conn = database.get_connection()
                cursor = conn.cursor()
                cursor.execute(executed_query)
                raw_rows = cursor.fetchall()
                if cursor.description:
                    columns = [d[0] for d in cursor.description]
                results = [dict(r) for r in raw_rows]
                row_count = len(results)
                conn.close()
            except Exception as e:
                query_error = str(e)

    return render_template(
        "sql_console.html",
        executed_query=executed_query,
        results=results,
        columns=columns,
        row_count=row_count,
        query_error=query_error
    )


@app.route("/reset_db", methods=["POST"])
def reset_database():
    """Resets database schema and reloads seed dataset."""
    try:
        database.init_db(force=True)
        flash("Database has been reset and reseeded with default records!", "success")
    except Exception as e:
        flash(f"Error resetting database: {str(e)}", "danger")
    return redirect(url_for("index"))


if __name__ == "__main__":
    print("\n" + "=" * 60)
    print(" 🚀 LIBRARY MANAGEMENT SYSTEM (DBMS Mini Project)")
    print(" Web Server running at: http://127.0.0.1:5000")
    print(" Press Ctrl+C to terminate the application.")
    print("=" * 60 + "\n")
    app.run(host="127.0.0.1", port=5000, debug=True)

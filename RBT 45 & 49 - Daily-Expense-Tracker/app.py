# Daily Expense Tracker - Flask + MySQL mini project

import datetime
import mysql.connector
from flask import Flask, render_template, request, redirect

app = Flask(__name__)


# Connects to the MySQL database and returns the connection
def get_connection():
    return mysql.connector.connect(
        host='localhost',
        user='root',
        password='your_password',
        database='expense_tracker'
    )


# Returns True only if the text is a number greater than 0
def is_positive(value):
    try:
        return float(value) > 0
    except (TypeError, ValueError):
        return False


# Home page: show all expenses with category name, newest first
@app.route('/')
def index():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute(
        "SELECT e.expense_id, e.amount, c.name AS category, e.expense_date, e.note "
        "FROM expenses e "
        "JOIN categories c ON e.category_id = c.category_id "
        "ORDER BY e.expense_date DESC, e.expense_id DESC"
    )
    rows = cursor.fetchall()

    cursor.close()
    conn.close()
    return render_template('index.html', expenses=rows)


# Add page: GET shows the empty form, POST saves a new expense
@app.route('/add', methods=['GET', 'POST'])
def add_expense():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    if request.method == 'POST':
        amount = request.form['amount']
        category_id = request.form['category_id']
        expense_date = request.form['expense_date']
        note = request.form['note']

        # If the amount is not a positive number, go back without saving
        if not is_positive(amount):
            cursor.close()
            conn.close()
            return redirect('/add')

        cursor.execute(
            "INSERT INTO expenses (amount, category_id, expense_date, note) "
            "VALUES (%s, %s, %s, %s)",
            (amount, category_id, expense_date, note)
        )
        conn.commit()

        cursor.close()
        conn.close()
        return redirect('/')

    # GET: load all categories for the dropdown
    cursor.execute("SELECT category_id, name FROM categories ORDER BY name")
    categories = cursor.fetchall()

    cursor.close()
    conn.close()
    return render_template('form.html', expense=None, categories=categories)


# Edit page: GET shows the form with old values, POST saves the changes
@app.route('/edit/<int:expense_id>', methods=['GET', 'POST'])
def edit_expense(expense_id):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    if request.method == 'POST':
        amount = request.form['amount']
        category_id = request.form['category_id']
        expense_date = request.form['expense_date']
        note = request.form['note']

        # If the amount is not a positive number, go back without saving
        if not is_positive(amount):
            cursor.close()
            conn.close()
            return redirect('/edit/' + str(expense_id))

        cursor.execute(
            "UPDATE expenses "
            "SET amount = %s, category_id = %s, expense_date = %s, note = %s "
            "WHERE expense_id = %s",
            (amount, category_id, expense_date, note, expense_id)
        )
        conn.commit()

        cursor.close()
        conn.close()
        return redirect('/')

    # GET: load this expense and all categories
    cursor.execute(
        "SELECT expense_id, amount, category_id, expense_date, note "
        "FROM expenses WHERE expense_id = %s",
        (expense_id,)
    )
    expense = cursor.fetchone()

    cursor.execute("SELECT category_id, name FROM categories ORDER BY name")
    categories = cursor.fetchall()

    cursor.close()
    conn.close()

    # If no expense has this id, go back to the home page
    if expense is None:
        return redirect('/')

    return render_template('form.html', expense=expense, categories=categories)


# Delete one expense by its id (POST only)
@app.route('/delete/<int:expense_id>', methods=['POST'])
def delete_expense(expense_id):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("DELETE FROM expenses WHERE expense_id = %s", (expense_id,))
    conn.commit()

    cursor.close()
    conn.close()
    return redirect('/')


# Budget page: GET shows spent vs budget for a month, POST saves a budget
@app.route('/budget', methods=['GET', 'POST'])
def budget():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    if request.method == 'POST':
        category_id = request.form['category_id']
        month_year = request.form['month_year']
        limit_amount = request.form['limit_amount']

        # If the limit is not a positive number, go back without saving
        if not is_positive(limit_amount):
            cursor.close()
            conn.close()
            return redirect('/budget?month=' + month_year)

        # Insert the budget, or update the limit if it already exists
        cursor.execute(
            "INSERT INTO budgets (category_id, month_year, limit_amount) "
            "VALUES (%s, %s, %s) "
            "ON DUPLICATE KEY UPDATE limit_amount = VALUES(limit_amount)",
            (category_id, month_year, limit_amount)
        )
        conn.commit()

        cursor.close()
        conn.close()
        return redirect('/budget?month=' + month_year)

    # GET: use the month from the URL, or the current month if missing
    month = request.args.get('month')
    if not month:
        month = datetime.date.today().strftime('%Y-%m')

    cursor.execute("SELECT category_id, name FROM categories ORDER BY name")
    categories = cursor.fetchall()

    # Spent vs budget for each category in this month
    cursor.execute(
        "SELECT c.name AS category, "
        "       b.limit_amount, "
        "       IFNULL(SUM(e.amount), 0) AS spent, "
        "       b.limit_amount - IFNULL(SUM(e.amount), 0) AS remaining, "
        "       CASE "
        "           WHEN IFNULL(SUM(e.amount), 0) > b.limit_amount THEN 'Over budget' "
        "           ELSE 'OK' "
        "       END AS status "
        "FROM budgets b "
        "JOIN categories c ON b.category_id = c.category_id "
        "LEFT JOIN expenses e "
        "       ON e.category_id = b.category_id "
        "      AND DATE_FORMAT(e.expense_date, '%%Y-%%m') = b.month_year "
        "WHERE b.month_year = %s "
        "GROUP BY c.name, b.limit_amount",
        (month,)
    )
    report = cursor.fetchall()

    cursor.close()
    conn.close()
    return render_template('budget.html', categories=categories, report=report, month=month)


# Backup: copy all expenses into expenses_backup (POST only)
@app.route('/backup', methods=['POST'])
def backup():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute(
        "INSERT INTO expenses_backup (expense_id, amount, category_id, expense_date, note) "
        "SELECT expense_id, amount, category_id, expense_date, note FROM expenses"
    )
    conn.commit()

    cursor.close()
    conn.close()
    return redirect('/backups')


# Show all backed up rows, latest backup first
@app.route('/backups')
def backups():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute(
        "SELECT expense_id, amount, category_id, expense_date, note, backed_up_at "
        "FROM expenses_backup "
        "ORDER BY backed_up_at DESC"
    )
    rows = cursor.fetchall()

    cursor.close()
    conn.close()
    return render_template('backups.html', backups=rows)


# Run the app in debug mode
if __name__ == '__main__':
    app.run(debug=True)

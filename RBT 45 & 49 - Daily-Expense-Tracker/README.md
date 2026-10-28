# Daily Expense Tracker

DBMS mini project, SY CSBS, Semester III, 2026-27.

Team number: XX
Members: Aayush Kumar (RBT25CB045), Ritesh Buchade (RBT25CB049)
Guide: Prof. Rutuja S. Bachhav

## About
A two-tier web app to record daily expenses, set monthly budgets per
category, compare spending with the budget, and back up expenses.

## Tech stack
Python Flask, MySQL 8, mysql-connector-python, HTML and CSS

## How to run
1. Install: pip install flask mysql-connector-python
2. In MySQL Workbench, run schema.sql
3. In app.py, set your MySQL password in get_connection()
4. Run: python app.py
5. Open http://127.0.0.1:5000

## Files
- schema.sql: creates the database, tables and sample data
- queries.sql: all SQL queries used by the app
- app.py: Flask routes
- templates/, static/: web pages and style
- report/: project report (PDF and Word) and presentation

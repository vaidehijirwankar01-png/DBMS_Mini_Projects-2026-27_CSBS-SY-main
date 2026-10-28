"""
College Management System — Root Application Launcher
Allows launching the Flask web application from the project root directory.
"""
import os
import sys

# Ensure backend directory is in the Python module search path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(BASE_DIR, 'backend')

if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app import app

if __name__ == '__main__':
    print("=" * 70)
    print("COLLEGE MANAGEMENT SYSTEM - FULL-STACK DBMS PROJECT")
    print("=" * 70)
    print(" * Architecture:  3-Tier (backend/ + frontend/ + database/)")
    print(" * Database:      MySQL 8.x (college_management)")
    print(" * Frontend:      HTML5, CSS3, JavaScript, Bootstrap 5, Chart.js")
    print(" * Backend:       Python Flask")
    print(" * URL:           http://127.0.0.1:5000")
    print("=" * 70)
    app.run(host='127.0.0.1', port=5000, debug=True)

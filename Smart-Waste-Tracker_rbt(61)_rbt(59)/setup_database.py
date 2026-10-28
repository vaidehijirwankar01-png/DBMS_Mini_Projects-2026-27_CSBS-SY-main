"""
Smart Waste Collection & Segregation Tracker
Database Automatic Setup Script

This script automatically connects to MySQL, executes all SQL setup files
in the correct dependency order, and verifies that the database is ready.

Usage:
    python setup_database.py
"""

import os
import sys
import getpass
from dotenv import load_dotenv
import mysql.connector
from mysql.connector import Error

# Load environment configuration
load_dotenv()

DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = int(os.getenv('DB_PORT', '3306'))
DB_USER = os.getenv('DB_USER', 'root')
DB_PASSWORD = os.getenv('DB_PASSWORD', '')

SQL_FILES = [
    ('database/schema.sql', 'Relational Schema & Tables'),
    ('database/views.sql', 'Analytical Relational Views'),
    ('database/triggers.sql', 'Automated Event Triggers'),
    ('database/procedures.sql', 'Stored Procedures & Transactions'),
    ('database/indexes.sql', 'B-Tree Performance Indexes'),
    ('database/seed.sql', 'Initial Demonstration Dataset')
]


def execute_sql_file(cursor, file_path):
    """Execute SQL file handling DELIMITER $$ statements properly."""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Split commands by DELIMITER if present
    if 'DELIMITER $$' in content:
        # Custom parsing for triggers and stored procedures
        sections = content.split('DELIMITER $$')
        # Standard statements before first DELIMITER
        first_part = sections[0].strip()
        if first_part:
            for stmt in first_part.split(';'):
                stmt = stmt.strip()
                if stmt and not stmt.startswith('--'):
                    cursor.execute(stmt)

        for sec in sections[1:]:
            parts = sec.split('DELIMITER ;')
            body = parts[0].strip()
            # Procedures/triggers ended by $$
            for proc in body.split('$$'):
                proc = proc.strip()
                if proc and not proc.startswith('--'):
                    cursor.execute(proc)

            if len(parts) > 1:
                after_delimiter = parts[1].strip()
                for stmt in after_delimiter.split(';'):
                    stmt = stmt.strip()
                    if stmt and not stmt.startswith('--'):
                        cursor.execute(stmt)
    else:
        # Standard statement execution
        statements = content.split(';')
        for stmt in statements:
            stmt = stmt.strip()
            if stmt and not stmt.startswith('--'):
                cursor.execute(stmt)


def main():
    global DB_PASSWORD
    print("=" * 65)
    print(" Smart Waste Collection & Segregation Tracker ")
    print(" Database Setup & Initialization Assistant ")
    print("=" * 65)

    if not DB_PASSWORD or DB_PASSWORD == 'your_actual_mysql_password':
        print(f"\nTarget MySQL Host: {DB_HOST}:{DB_PORT}")
        print(f"Target User:      {DB_USER}")
        DB_PASSWORD = getpass.getpass("Enter MySQL password for 'root' (press Enter if none): ")

    try:
        print(f"\n[1/3] Connecting to MySQL server at {DB_HOST}:{DB_PORT}...")
        conn = mysql.connector.connect(
            host=DB_HOST,
            port=DB_PORT,
            user=DB_USER,
            password=DB_PASSWORD,
            autocommit=True
        )
        cursor = conn.cursor()
        print("      Connected successfully!")

        print("\n[2/3] Executing Database Scripts...")
        for file_path, desc in SQL_FILES:
            if not os.path.exists(file_path):
                print(f"      [SKIP] File not found: {file_path}")
                continue
            print(f"      -> Running {file_path} ({desc})...")
            execute_sql_file(cursor, file_path)
            print("         Done!")

        # Update .env with verified password if it was entered
        if DB_PASSWORD and DB_PASSWORD != 'your_actual_mysql_password':
            env_path = '.env'
            if os.path.exists(env_path):
                with open(env_path, 'r', encoding='utf-8') as f:
                    env_lines = f.readlines()
                with open(env_path, 'w', encoding='utf-8') as f:
                    for line in env_lines:
                        if line.startswith('DB_PASSWORD='):
                            f.write(f'DB_PASSWORD={DB_PASSWORD}\n')
                        else:
                            f.write(line)

        print("\n[3/3] Verifying Database Installation...")
        cursor.execute("USE smart_waste_db;")
        cursor.execute("SHOW TABLES;")
        tables = [t[0] for t in cursor.fetchall()]
        print(f"      Database 'smart_waste_db' verified with {len(tables)} tables:")
        for t in sorted(tables):
            print(f"       - {t}")

        cursor.close()
        conn.close()

        print("\n" + "=" * 65)
        print(" SUCCESS: Database initialized completely!")
        print(" You can now run the Flask application with:")
        print("     python app.py")
        print("=" * 65)

    except Error as e:
        print(f"\n[ERROR] Database initialization failed: {e}")
        print("\nTroubleshooting tips:")
        print("1. Verify your MySQL password.")
        print("2. Ensure MySQL Server service is started.")
        print("3. Check .env settings: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD.")


if __name__ == '__main__':
    main()


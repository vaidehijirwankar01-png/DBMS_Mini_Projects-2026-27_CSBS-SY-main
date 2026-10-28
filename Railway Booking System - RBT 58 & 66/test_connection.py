"""
Database connection test script for Railway Ticket Booking System.
Run this script from terminal:
    python test_connection.py
"""

import sys

# Ensure UTF-8 output if supported, or fallback safely
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

from db import test_db_connection, DB_HOST, DB_PORT, DB_USER, DB_NAME, DB_PASSWORD

def main():
    print("=" * 65)
    print(" [TEST] RAILWAY TICKET BOOKING SYSTEM - DATABASE CONNECTION TEST")
    print("=" * 65)
    print(f"Host:     {DB_HOST}:{DB_PORT}")
    print(f"User:     {DB_USER}")
    masked_pwd = '*' * len(DB_PASSWORD) if DB_PASSWORD else '(empty)'
    print(f"Password: {masked_pwd}")
    print(f"Database: {DB_NAME}")
    print("-" * 65)

    info = test_db_connection()

    if info['success']:
        print("[SUCCESS] Connected to MySQL server successfully!")
        print(f"Server Version: {info.get('server_version')}")
        
        if 'warning' in info:
            print(f"[WARNING] {info['warning']}")
            print("\nTip: To create the database and tables, run:")
            print("    python init_db.py")
        else:
            print(f"Found {len(info['tables'])} tables in '{DB_NAME}':")
            for table in info['tables']:
                print(f"  * {table}")
    else:
        print("[FAILED] COULD NOT CONNECT TO MYSQL:")
        err = info.get('error', {})
        if isinstance(err, dict):
            print(f"Error Code: {err.get('code')}")
            print(f"Message:    {err.get('message')}")
        else:
            print(f"Error: {err}")
        print("\nTROUBLESHOOTING:")
        print("1. Verify that your MySQL service (e.g. MySQL80) is running.")
        print("2. Set your MySQL root password in the .env file:")
        print("       DB_PASSWORD=your_password")
        print("3. Re-run this test: python test_connection.py")
    print("=" * 65)

if __name__ == '__main__':
    main()

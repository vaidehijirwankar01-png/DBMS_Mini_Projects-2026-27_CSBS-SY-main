"""
Script to initialize MySQL database and tables from schema.sql.
Usage:
    python init_db.py
"""

import sys

# Ensure UTF-8 output if supported, or fallback safely
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

from db import init_database, test_db_connection

def main():
    print("=" * 65)
    print(" [INIT] INITIALIZING RAILWAY DATABASE FROM schema.sql")
    print("=" * 65)

    check = test_db_connection()
    if not check['success']:
        print("[ERROR] Could not connect to MySQL server. Please verify credentials in .env first.")
        print(f"Error: {check.get('error')}")
        sys.exit(1)

    print("Connected to MySQL server. Applying schema.sql...")
    ok, msg = init_database()

    if ok:
        print(f"[SUCCESS] {msg}")
        recheck = test_db_connection()
        print(f"Verified tables in database: {', '.join(recheck.get('tables', []))}")
    else:
        print(f"[ERROR] {msg}")
        sys.exit(1)

    print("=" * 65)

if __name__ == '__main__':
    main()

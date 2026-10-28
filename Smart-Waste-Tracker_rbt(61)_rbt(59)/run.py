"""
Smart Waste Collection & Segregation Tracker
One-Click Application Launcher (run.py)

Features:
- Verifies Python environment and dependencies
- Checks MySQL connection
- Offers one-click database setup if database is not yet initialized
- Automatically opens the web browser at http://localhost:5000
- Starts the Flask web application
"""

import os
import sys
import time
import threading
import webbrowser
from config import Config
from db import test_connection, init_pool

def open_browser():
    """Wait for Flask server to boot, then open default web browser."""
    time.sleep(1.5)
    url = f"http://localhost:{Config.APP_PORT}"
    print(f"\n[LAUNCHER] Opening web browser at {url}...")
    try:
        webbrowser.open(url)
    except Exception as e:
        print(f"[LAUNCHER] Note: Could not auto-open browser: {e}")

def ensure_database():
    """Verify database connection or prompt for automatic initialization."""
    print("=" * 65)
    print(" 🌿 Smart Waste Collection & Segregation Tracker ")
    print(" Application Launcher ")
    print("=" * 65)

    if not os.path.exists('.env') and os.path.exists('.env.example'):
        print("[LAUNCHER] Creating .env from .env.example...")
        with open('.env.example', 'r', encoding='utf-8') as src:
            content = src.read()
        with open('.env', 'w', encoding='utf-8') as dst:
            dst.write(content)

    print("\n[1/2] Checking MySQL database connectivity...")
    init_pool()
    if test_connection():
        print("      [OK] Connected to 'smart_waste_db' successfully!")
        return True
    else:
        print("      [!] Could not connect to MySQL 'smart_waste_db'.")
        print("\nWould you like to run the automated database setup now?")
        choice = input("Run database setup? (Y/n): ").strip().lower()
        if choice in ('', 'y', 'yes'):
            try:
                import setup_database
                setup_database.main()
                init_pool()
                return test_connection()
            except Exception as e:
                print(f"[LAUNCHER] Setup error: {e}")
                return False
        else:
            print("[LAUNCHER] Continuing without database initialization.")
            return False

def main():
    db_ok = ensure_database()

    print("\n[2/2] Starting Flask Web Server...")
    print(f"      Port:    {Config.APP_PORT}")
    print(f"      Debug:   {Config.DEBUG}")
    print(f"      Address: http://localhost:{Config.APP_PORT}")
    print("=" * 65)

    # Launch browser thread
    threading.Thread(target=open_browser, daemon=True).start()

    # Import and run Flask app
    try:
        from app import app
        app.run(host='0.0.0.0', port=Config.APP_PORT, debug=Config.DEBUG, use_reloader=False)
    except KeyboardInterrupt:
        print("\n[LAUNCHER] Server stopped cleanly. Goodbye!")
    except Exception as e:
        print(f"\n[LAUNCHER ERROR] Failed to start server: {e}")

if __name__ == '__main__':
    main()


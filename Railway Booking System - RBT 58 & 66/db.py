"""
Database connection and utility module for Railway Ticket Booking System.
Uses mysql-connector-python and loads settings from environment variables (.env).
"""

import os
from pathlib import Path
import mysql.connector
from mysql.connector import Error
from dotenv import load_dotenv

# Load environment variables from .env in project root
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(dotenv_path=BASE_DIR / '.env')

DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = int(os.getenv('DB_PORT', 3306))
DB_USER = os.getenv('DB_USER', 'root')
DB_PASSWORD = os.getenv('DB_PASSWORD', '')
DB_NAME = os.getenv('DB_NAME', 'railway_db')


def get_db_connection(include_database=True):
    """
    Establish and return a connection to MySQL.
    If include_database is False, connects to the MySQL server without selecting a specific database.
    """
    config = {
        'host': DB_HOST,
        'port': DB_PORT,
        'user': DB_USER,
        'password': DB_PASSWORD,
        'charset': 'utf8mb4',
        'use_pure': True
    }
    if include_database:
        config['database'] = DB_NAME

    return mysql.connector.connect(**config)


def test_db_connection():
    """
    Test the MySQL connection using credentials from environment variables.
    Returns a dict with status, server_version, database, tables, and error details if any.
    """
    result = {
        'success': False,
        'host': DB_HOST,
        'port': DB_PORT,
        'user': DB_USER,
        'database': DB_NAME,
        'server_version': None,
        'tables': [],
        'error': None
    }

    try:
        # First test connecting to server
        conn = get_db_connection(include_database=False)
        result['server_version'] = conn.get_server_info()
        
        cursor = conn.cursor()
        cursor.execute("SHOW DATABASES LIKE %s;", (DB_NAME,))
        db_exists = cursor.fetchone()

        if db_exists:
            cursor.execute(f"USE `{DB_NAME}`;")
            cursor.execute("SHOW TABLES;")
            tables = [row[0] for row in cursor.fetchall()]
            result['tables'] = tables
            result['success'] = True
        else:
            result['success'] = True
            result['warning'] = f"Connected to MySQL server successfully, but database '{DB_NAME}' does not exist yet. Run init_database() or import schema.sql."

        cursor.close()
        conn.close()

    except Error as err:
        result['error'] = {
            'code': err.errno,
            'message': str(err),
            'sqlstate': err.sqlstate
        }
    except Exception as e:
        result['error'] = {
            'message': str(e)
        }

    return result


def init_database(schema_file_path=None):
    """
    Reads and executes schema.sql to create database, tables, and populate fictional sample records.
    Parses and executes statements individually to support all mysql-connector-python versions.
    """
    if schema_file_path is None:
        schema_file_path = BASE_DIR / 'schema.sql'

    if not os.path.exists(schema_file_path):
        raise FileNotFoundError(f"Schema file not found at: {schema_file_path}")

    with open(schema_file_path, 'r', encoding='utf-8') as f:
        sql_commands = f.read()

    # Parse statements individually
    statements = []
    current = []
    for line in sql_commands.splitlines():
        trimmed = line.strip()
        if not trimmed or trimmed.startswith('--') or trimmed.startswith('#'):
            continue
        current.append(line)
        if trimmed.endswith(';'):
            stmt = '\n'.join(current).strip()
            if stmt.endswith(';'):
                stmt = stmt[:-1].strip()
            if stmt:
                statements.append(stmt)
            current = []

    if current:
        stmt = '\n'.join(current).strip()
        if stmt.endswith(';'):
            stmt = stmt[:-1].strip()
        if stmt:
            statements.append(stmt)

    # Connect to MySQL server without database first
    conn = get_db_connection(include_database=False)
    cursor = conn.cursor()

    try:
        for stmt in statements:
            cursor.execute(stmt)
        conn.commit()
        return True, f"Database and schema initialized successfully ({len(statements)} statements executed)."
    except Error as err:
        return False, f"Failed to initialize schema: {err}"
    finally:
        cursor.close()
        conn.close()


def query_db(query, params=(), one=False):
    """
    Execute a parameterized SQL query safely and return results as list of dicts.
    """
    conn = get_db_connection(include_database=True)
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(query, params)
        rows = cursor.fetchall()
        return (rows[0] if rows else None) if one else rows
    finally:
        cursor.close()
        conn.close()

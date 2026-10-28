"""
Smart Waste Collection & Segregation Tracker
Database Connection Module

Provides a MySQL connection pool and helper functions for database access.
All queries use parameterized statements to prevent SQL injection.
"""

import mysql.connector
from mysql.connector import pooling, Error
from config import Config

# Connection pool for efficient database access
_pool = None


def init_pool(pool_size=5):
    """Initialize the MySQL connection pool."""
    global _pool
    try:
        db_config = Config.get_db_config()
        _pool = pooling.MySQLConnectionPool(
            pool_name="waste_tracker_pool",
            pool_size=pool_size,
            pool_reset_session=True,
            **db_config
        )
        print(f"[DB] Connection pool created (size={pool_size})")
        return True
    except Error as e:
        print(f"[DB] Failed to create connection pool: {e}")
        return False


def get_connection():
    """Get a connection from the pool."""
    global _pool
    if _pool is None:
        if not init_pool():
            raise Error("MySQL database is not connected. Please start MySQL server on port 3306 and verify your .env credentials.")
    try:
        return _pool.get_connection()
    except Error as e:
        print(f"[DB] Error getting connection: {e}")
        raise


def execute_query(query, params=None, fetchone=False, fetchall=False, commit=False):
    """
    Execute a parameterized SQL query safely.

    Args:
        query: SQL query string with %s placeholders.
        params: Tuple of parameters to bind.
        fetchone: Return a single row as a dictionary.
        fetchall: Return all rows as a list of dictionaries.
        commit: Commit the transaction after execution.

    Returns:
        Query results (dict, list of dicts, lastrowid, or rowcount).
    """
    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(query, params or ())

        if fetchone:
            result = cursor.fetchone()
        elif fetchall:
            result = cursor.fetchall()
        else:
            result = cursor.lastrowid if cursor.lastrowid else cursor.rowcount

        if commit:
            conn.commit()

        return result

    except Error as e:
        if conn and commit:
            conn.rollback()
        raise e

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


def execute_transaction(queries):
    """
    Execute multiple queries in a single transaction.

    Args:
        queries: List of (query_string, params_tuple) pairs.

    Returns:
        True if all queries succeed, raises exception otherwise.
    """
    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        conn.start_transaction()

        results = []
        for query, params in queries:
            cursor.execute(query, params or ())
            if cursor.with_rows:
                results.append(cursor.fetchall())
            else:
                results.append(cursor.lastrowid or cursor.rowcount)

        conn.commit()
        return results

    except Error as e:
        if conn:
            conn.rollback()
        raise e

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


def call_procedure(proc_name, args=(), fetchall=False):
    """
    Call a MySQL stored procedure.

    Args:
        proc_name: Name of the stored procedure.
        args: Tuple of arguments to pass.
        fetchall: If True, fetch and return all result sets.

    Returns:
        Results from the stored procedure.
    """
    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.callproc(proc_name, args)

        results = []
        if fetchall:
            for result_set in cursor.stored_results():
                results.extend(result_set.fetchall())

        conn.commit()
        return results if fetchall else True

    except Error as e:
        if conn:
            conn.rollback()
        raise e

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


def test_connection():
    """Test database connectivity. Returns True if successful."""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        cursor.fetchone()
        cursor.close()
        conn.close()
        return True
    except Error:
        return False


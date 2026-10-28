import os
import pymysql

# Database Configuration Settings
MYSQL_HOST = os.environ.get("MYSQL_HOST", "localhost")
MYSQL_PORT = int(os.environ.get("MYSQL_PORT", 3306))
MYSQL_USER = os.environ.get("MYSQL_USER", "root")
MYSQL_PASSWORD = os.environ.get("MYSQL_PASSWORD", "")
MYSQL_DATABASE = os.environ.get("MYSQL_DATABASE", "hospital_db")

# Path to SQLite fallback database (enables zero-configuration out-of-the-box preview)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SQLITE_DB_PATH = os.path.join(BASE_DIR, "hospital_db.sqlite")

def test_mysql_connection(password=None):
    pwd = password if password is not None else MYSQL_PASSWORD
    try:
        conn = pymysql.connect(
            host=MYSQL_HOST,
            port=MYSQL_PORT,
            user=MYSQL_USER,
            password=pwd,
            charset='utf8mb4',
            cursorclass=pymysql.cursors.DictCursor,
            connect_timeout=3
        )
        conn.close()
        return True, "MySQL Connection Successful"
    except Exception as e:
        return False, str(e)

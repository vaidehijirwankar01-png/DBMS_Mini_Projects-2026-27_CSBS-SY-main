"""Configuration – everything comes from environment variables (see .env.example)."""
import os


def _load_env_file():
    """Tiny .env reader (no extra dependency). Real environment variables always win."""
    path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
    if not os.path.exists(path):
        return
    for line in open(path, encoding="utf-8"):
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        v = v.split(" #")[0].strip().strip('"').strip("'")
        os.environ.setdefault(k.strip(), v)


_load_env_file()


def _int(name, default):
    try:
        return int(os.getenv(name, default))
    except ValueError:
        return int(default)


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "")          # set a long random value in production
    DB_ENGINE = os.getenv("DB_ENGINE", "mysql").lower()  # mysql | sqlite
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = _int("DB_PORT", 3306)
    DB_USER = os.getenv("DB_USER", "root")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "")
    DB_NAME = os.getenv("DB_NAME", "LibraryDB")
    SQLITE_PATH = os.getenv("SQLITE_PATH", os.path.join(os.path.dirname(os.path.dirname(__file__)), "library.db"))

    LOAN_DAYS = _int("LOAN_DAYS", 14)          # loan period
    FINE_PER_DAY = _int("FINE_PER_DAY", 2)     # rupees per late day
    MAX_BOOKS_PER_MEMBER = _int("MAX_BOOKS_PER_MEMBER", 3)

    ADMIN_USER = os.getenv("ADMIN_USER", "admin")
    ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "")   # used by `manage.py seed`

    LOGIN_MAX_FAILS = _int("LOGIN_MAX_FAILS", 5)
    LOGIN_WINDOW_SEC = _int("LOGIN_WINDOW_SEC", 900)
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"
    SESSION_COOKIE_SECURE = os.getenv("COOKIE_SECURE", "0") == "1"   # set 1 behind HTTPS
    PERMANENT_SESSION_LIFETIME = _int("SESSION_HOURS", 8) * 3600
    LOG_DIR = os.getenv("LOG_DIR", os.path.join(os.path.dirname(os.path.dirname(__file__)), "logs"))
    TESTING = False

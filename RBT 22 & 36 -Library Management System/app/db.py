"""Thin database layer: one transaction per request-operation, MySQL or SQLite."""
import os
import sqlite3
from contextlib import contextmanager
from flask import current_app


def engine():
    return current_app.config["DB_ENGINE"]


def _connect():
    cfg = current_app.config
    if cfg["DB_ENGINE"] == "sqlite":
        conn = sqlite3.connect(cfg["SQLITE_PATH"], timeout=10)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        return conn
    import pymysql
    import pymysql.cursors
    return pymysql.connect(
        host=cfg["DB_HOST"], port=cfg["DB_PORT"], user=cfg["DB_USER"], password=cfg["DB_PASSWORD"],
        database=cfg["DB_NAME"], charset="utf8mb4", autocommit=False, connect_timeout=5,
        cursorclass=pymysql.cursors.DictCursor)


class Cur:
    def __init__(self, conn):
        self.conn = conn
        self.cur = conn.cursor()
        self.sqlite = isinstance(conn, sqlite3.Connection)

    def run(self, sql, args=()):
        self.cur.execute(sql.replace("%s", "?") if self.sqlite else sql, tuple(args))
        return self

    def all(self):
        return [dict(r) for r in self.cur.fetchall()]

    def one(self):
        r = self.cur.fetchone()
        return dict(r) if r else None

    def scalar(self):
        r = self.one()
        return list(r.values())[0] if r else None

    @property
    def lastid(self):
        return self.cur.lastrowid

    @property
    def rowcount(self):
        return self.cur.rowcount


@contextmanager
def tx():
    """Commit on success, roll back on any exception, always close."""
    conn = _connect()
    try:
        yield Cur(conn)
        conn.commit()
    except BaseException:
        conn.rollback()
        raise
    finally:
        conn.close()


def schema_path(name):
    return os.path.join(os.path.dirname(os.path.dirname(__file__)), "schema", name)


def _read_sql(name):
    with open(schema_path(name), encoding="utf-8") as f:
        return f.read()


def init_schema():
    """Create all tables (idempotent). SQLite: runs the whole script. MySQL: statement by statement."""
    cfg = current_app.config
    if engine() == "sqlite":
        conn = sqlite3.connect(cfg["SQLITE_PATH"])
        conn.executescript(_read_sql("sqlite.sql"))
        conn.commit()
        conn.close()
        return
    import pymysql
    base = dict(host=cfg["DB_HOST"], port=cfg["DB_PORT"], user=cfg["DB_USER"], password=cfg["DB_PASSWORD"], charset="utf8mb4")
    try:
        conn = pymysql.connect(database=cfg["DB_NAME"], **base)
    except pymysql.err.OperationalError as e:
        if e.args[0] != 1049:            # 1049 = unknown database -> create it (needs CREATE privilege)
            raise
        conn = pymysql.connect(**base)
        with conn.cursor() as c:
            c.execute(f"CREATE DATABASE `{cfg['DB_NAME']}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
            c.execute(f"USE `{cfg['DB_NAME']}`")
    lines = [l for l in _read_sql("mysql.sql").splitlines() if not l.strip().startswith("--")]
    with conn.cursor() as c:
        for stmt in [s.strip() for s in "\n".join(lines).split(";") if s.strip()]:
            if stmt.upper().startswith(("CREATE DATABASE", "USE ")):
                continue
            c.execute(stmt)
    conn.commit()
    conn.close()

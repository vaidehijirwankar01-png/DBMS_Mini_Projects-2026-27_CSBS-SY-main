#!/usr/bin/env python3
"""Command line helper.

  python manage.py init-db                 create tables (safe to re-run)
  python manage.py seed                    sample data + first admin account
  python manage.py create-user NAME FULLNAME [--role admin|librarian]
  python manage.py backup                  dated backup into ./backups (keeps the newest 14)
"""
import getpass
import os
import secrets
import shutil
import sqlite3
import subprocess
import sys
from datetime import date, datetime, timedelta

from app import auth, create_app, db

app = create_app()


def init_db():
    with app.app_context():
        db.init_schema()
    print("Database ready.")


def make_user(username, full_name, role, password):
    with app.app_context(), db.tx() as c:
        if c.run("SELECT 1 AS x FROM Librarian WHERE Username=%s", (username,)).one():
            print(f"User '{username}' already exists."); return
        c.run("INSERT INTO Librarian(Username,Full_Name,Password_Hash,Role) VALUES(%s,%s,%s,%s)",
              (username, full_name, auth.hash_password(password), role))
    print(f"Created {role} '{username}'.")


def seed():
    init_db()
    cfg = app.config
    with app.app_context():
        with db.tx() as c:
            if c.run("SELECT COUNT(*) AS n FROM Member").scalar():
                print("Sample data already present - skipped."); return
        pw = cfg["ADMIN_PASSWORD"]
        if not pw:
            pw = secrets.token_urlsafe(9)
            print(f"\n  ADMIN_PASSWORD not set -> generated one for you:  {cfg['ADMIN_USER']} / {pw}\n  (change it from the app after signing in)\n")
        make_user(cfg["ADMIN_USER"], "Administrator", "admin", pw)
        d = date.today()
        iso = lambda n: (d - timedelta(days=n)).isoformat()
        with db.tx() as c:
            for m in [("Rahul Sharma", "Computer", "9876543210"), ("Priya Patil", "IT", "9876543211"),
                      ("Amit Joshi", "ENTC", "9876543212"), ("Sneha Kulkarni", "Computer", "9876543213"),
                      ("Rohan More", "Mechanical", "9876543214"), ("Neha Deshmukh", "Civil", "9876543215"),
                      ("Kunal Jadhav", "IT", "9876543216"), ("Pooja Pawar", "Computer", "9876543217")]:
                c.run("INSERT INTO Member(Name,Department,Phone) VALUES(%s,%s,%s)", m)
            for b in [("Introduction to Algorithms", "Thomas Cormen", "DSA", 5), ("Clean Code", "Robert Martin", "Programming", 4),
                      ("Database System Concepts", "Silberschatz", "DBMS", 3), ("Operating System Concepts", "Silberschatz", "OS", 6),
                      ("Java Programming", "Herbert Schildt", "Programming", 4), ("Computer Networks", "Andrew Tanenbaum", "Networks", 2),
                      ("Fundamentals of Database Systems", "Elmasri & Navathe", "DBMS", 3), ("Python Crash Course", "Eric Matthes", "Programming", 5),
                      ("Discrete Mathematics", "Kenneth Rosen", "Maths", 4), ("Digital Electronics", "Morris Mano", "Electronics", 2)]:
                c.run("INSERT INTO Book(Title,Author,Category,Quantity) VALUES(%s,%s,%s,%s)", b)
            # (member, book, issued n days ago, returned n days ago | None)
            rows = [(1, 1, 25, None), (2, 3, 5, None), (3, 2, 30, 12), (4, 4, 3, None), (1, 5, 40, 20),
                    (5, 8, 20, None), (6, 3, 10, 2), (7, 6, 18, None), (2, 2, 8, 1)]
            for m, b, ago, ret in rows:
                due = (d - timedelta(days=ago) + timedelta(days=cfg["LOAN_DAYS"])).isoformat()
                c.run("INSERT INTO Issue(Member_ID,Book_ID,Issue_Date,Due_Date,Return_Date) VALUES(%s,%s,%s,%s,%s)",
                      (m, b, iso(ago), due, iso(ret) if ret else None))
                if not ret:
                    c.run("UPDATE Book SET Quantity=Quantity-1 WHERE Book_ID=%s", (b,))
            c.run("INSERT INTO Fine(Issue_ID,Amount,Paid) VALUES(3,8,1)")    # Clean Code returned 4 days late
            c.run("INSERT INTO Fine(Issue_ID,Amount,Paid) VALUES(5,12,0)")   # Java returned 6 days late
    print("Sample data inserted.")


def backup(keep=14):
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backups")
    os.makedirs(out, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    cfg = app.config
    if cfg["DB_ENGINE"] == "sqlite":
        target = os.path.join(out, f"library_{stamp}.db")
        src = sqlite3.connect(cfg["SQLITE_PATH"]); dst = sqlite3.connect(target)
        src.backup(dst); dst.close(); src.close()
    else:
        target = os.path.join(out, f"library_{stamp}.sql")
        if not shutil.which("mysqldump"):
            sys.exit("mysqldump not found. Install the MySQL client tools.")
        with open(target, "w", encoding="utf-8") as f:
            subprocess.run(["mysqldump", "-h", cfg["DB_HOST"], "-P", str(cfg["DB_PORT"]), "-u", cfg["DB_USER"],
                            "--single-transaction", "--routines", "--triggers", cfg["DB_NAME"]],
                           stdout=f, check=True, env={**os.environ, "MYSQL_PWD": cfg["DB_PASSWORD"]})
    files = sorted(f for f in os.listdir(out) if f.startswith("library_"))
    for old in files[:-keep]:
        os.remove(os.path.join(out, old))
    print("Backup written:", target)


if __name__ == "__main__":
    a = sys.argv[1:]
    if not a or a[0] not in ("init-db", "seed", "create-user", "backup"):
        print(__doc__); sys.exit(1)
    if a[0] == "init-db": init_db()
    elif a[0] == "seed": seed()
    elif a[0] == "backup": backup()
    else:
        if len(a) < 3: print(__doc__); sys.exit(1)
        role = a[a.index("--role") + 1] if "--role" in a else "librarian"
        pw = getpass.getpass("Password (min 8 chars): ")
        if len(pw) < 8: sys.exit("Password too short.")
        init_db(); make_user(a[1], a[2], role, pw)

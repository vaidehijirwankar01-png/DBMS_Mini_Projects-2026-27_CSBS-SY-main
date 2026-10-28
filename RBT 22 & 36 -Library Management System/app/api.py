"""REST API: all library operations. Every write runs in ONE transaction and is audited."""
import csv
import io
from datetime import date, datetime, timedelta

from flask import Blueprint, Response, current_app, jsonify, request, session

from . import auth, db

bp = Blueprint("api", __name__)


class ApiError(Exception):
    def __init__(self, msg, code=400):
        super().__init__(msg)
        self.msg, self.code = msg, code


@bp.errorhandler(ApiError)
def _api_error(e):
    return jsonify(error=e.msg), e.code


@bp.before_request
def _csrf():
    return auth.check_csrf()


# ----------------------------------------------------------------- helpers
def as_date(v):
    if isinstance(v, datetime):
        return v.date()
    if isinstance(v, date):
        return v
    return date.fromisoformat(str(v)[:10])


def body():
    d = request.get_json(silent=True)
    if not isinstance(d, dict):
        raise ApiError("Request body must be JSON")
    return d


def text(d, key, label, maxlen, required=False):
    v = d.get(key)
    v = "" if v is None else str(v).strip()
    if required and not v:
        raise ApiError(f"{label} is required")
    if len(v) > maxlen:
        raise ApiError(f"{label} must be at most {maxlen} characters")
    return v


def number(d, key, label, lo, hi, default=None):
    try:
        n = int(d.get(key, default))
    except (TypeError, ValueError):
        raise ApiError(f"{label} must be a whole number")
    if not lo <= n <= hi:
        raise ApiError(f"{label} must be between {lo} and {hi}")
    return n


def phone_of(d):
    p = text(d, "phone", "Phone", 15)
    if p and not (p.isdigit() and len(p) == 10):
        raise ApiError("Phone must be exactly 10 digits")
    return p or None


def paging():
    try:
        page = max(int(request.args.get("page", 1)), 1)
        per = min(max(int(request.args.get("per_page", 10)), 1), 100)
    except ValueError:
        raise ApiError("Invalid page number")
    return page, per


def paged(c, count_sql, count_args, list_sql, list_args):
    page, per = paging()
    total = c.run(count_sql, count_args).scalar() or 0
    items = c.run(list_sql + " LIMIT %s OFFSET %s", list_args + (per, (page - 1) * per)).all()
    return {"items": items, "total": total, "page": page, "per_page": per, "pages": max(-(-total // per), 1)}


def audit(c, action, detail=""):
    c.run("INSERT INTO Audit_Log(Username,Action,Detail,Logged_At) VALUES(%s,%s,%s,%s)",
          (session.get("user", "system"), action, detail[:255], datetime.now().isoformat(sep=" ", timespec="seconds")))


def like():
    return f"%{request.args.get('q', '').strip()}%"


# ----------------------------------------------------------------- health + auth
@bp.get("/health")
def health():
    try:
        with db.tx() as c:
            c.run("SELECT 1 AS ok").one()
        return jsonify(status="ok")
    except Exception:
        current_app.logger.exception("health check failed")
        return jsonify(status="database unavailable"), 503


@bp.post("/api/login")
def login():
    d = body()
    username, password = str(d.get("username", "")).strip(), str(d.get("password", ""))
    key = (request.remote_addr, username.lower())
    if auth.too_many_attempts(key):
        raise ApiError("Too many failed attempts. Try again later.", 429)
    with db.tx() as c:
        row = c.run("SELECT * FROM Librarian WHERE Username=%s", (username,)).one()
    ok = bool(row) and auth.verify(row["Password_Hash"], password)
    if not ok:
        auth.record_failure(key)
        current_app.logger.warning("Failed login for '%s' from %s", username, request.remote_addr)
        raise ApiError("Invalid username or password", 401)
    auth.clear_failures(key)
    auth.login_user(row)
    with db.tx() as c:
        audit(c, "LOGIN", "signed in")
    return jsonify(user=row["Username"], name=row["Full_Name"], role=row["Role"], csrf=session["csrf"])


@bp.post("/api/logout")
def logout():
    session.clear()
    return jsonify(ok=True)


@bp.get("/api/me")
@auth.login_required
def me():
    return jsonify(user=session["user"], name=session["name"], role=session["role"], csrf=session["csrf"],
                   loan_days=current_app.config["LOAN_DAYS"], fine_per_day=current_app.config["FINE_PER_DAY"],
                   max_books=current_app.config["MAX_BOOKS_PER_MEMBER"])


@bp.post("/api/password")
@auth.login_required
def change_password():
    d = body()
    new = str(d.get("new", ""))
    if len(new) < 8:
        raise ApiError("New password must be at least 8 characters")
    with db.tx() as c:
        row = c.run("SELECT Password_Hash FROM Librarian WHERE Librarian_ID=%s", (session["uid"],)).one()
        if not auth.verify(row["Password_Hash"], str(d.get("old", ""))):
            raise ApiError("Current password is wrong", 403)
        c.run("UPDATE Librarian SET Password_Hash=%s WHERE Librarian_ID=%s", (auth.hash_password(new), session["uid"]))
        audit(c, "PASSWORD", "password changed")
    return jsonify(ok=True)


@bp.get("/api/librarians")
@auth.admin_required
def librarians():
    with db.tx() as c:
        return jsonify(c.run("SELECT Librarian_ID, Username, Full_Name, Role, Created_On FROM Librarian ORDER BY Librarian_ID").all())


@bp.post("/api/librarians")
@auth.admin_required
def add_librarian():
    d = body()
    username = text(d, "username", "Username", 40, True).lower()
    name = text(d, "name", "Full name", 80, True)
    pw = str(d.get("password", ""))
    role = d.get("role", "librarian")
    if role not in ("admin", "librarian"):
        raise ApiError("Role must be admin or librarian")
    if len(pw) < 8:
        raise ApiError("Password must be at least 8 characters")
    with db.tx() as c:
        if c.run("SELECT 1 AS x FROM Librarian WHERE Username=%s", (username,)).one():
            raise ApiError("Username already exists", 409)
        c.run("INSERT INTO Librarian(Username,Full_Name,Password_Hash,Role) VALUES(%s,%s,%s,%s)",
              (username, name, auth.hash_password(pw), role))
        audit(c, "ADD_LIBRARIAN", username)
        return jsonify(id=c.lastid), 201


# ----------------------------------------------------------------- dashboard
@bp.get("/api/stats")
@auth.login_required
def stats():
    today = date.today().isoformat()
    with db.tx() as c:
        return jsonify(
            titles=c.run("SELECT COUNT(*) AS n FROM Book").scalar(),
            copies=int(c.run("SELECT COALESCE(SUM(Quantity),0) AS n FROM Book").scalar()),
            members=c.run("SELECT COUNT(*) AS n FROM Member").scalar(),
            issued=c.run("SELECT COUNT(*) AS n FROM Issue WHERE Return_Date IS NULL").scalar(),
            overdue=c.run("SELECT COUNT(*) AS n FROM Issue WHERE Return_Date IS NULL AND Due_Date < %s", (today,)).scalar(),
            unpaid=int(c.run("SELECT COALESCE(SUM(Amount),0) AS n FROM Fine WHERE Paid=0").scalar()),
            collected=int(c.run("SELECT COALESCE(SUM(Amount),0) AS n FROM Fine WHERE Paid=1").scalar()))


# ----------------------------------------------------------------- books
@bp.get("/api/books")
@auth.login_required
def books():
    q = like()
    where = "WHERE Title LIKE %s OR Author LIKE %s OR Category LIKE %s"
    if request.args.get("available") == "1":
        where = "WHERE Quantity > 0 AND (Title LIKE %s OR Author LIKE %s OR Category LIKE %s)"
    with db.tx() as c:
        return jsonify(paged(c, f"SELECT COUNT(*) AS n FROM Book {where}", (q, q, q),
                             f"SELECT * FROM Book {where} ORDER BY Book_ID", (q, q, q)))


def _book_fields(d):
    return (text(d, "title", "Title", 120, True), text(d, "author", "Author", 80, True),
            text(d, "category", "Category", 40), number(d, "quantity", "Quantity", 0, 1000, 1))


@bp.post("/api/books")
@auth.login_required
def add_book():
    f = _book_fields(body())
    with db.tx() as c:
        c.run("INSERT INTO Book(Title,Author,Category,Quantity) VALUES(%s,%s,%s,%s)", f)
        bid = c.lastid
        audit(c, "ADD_BOOK", f"#{bid} {f[0]}")
        return jsonify(id=bid), 201


@bp.put("/api/books/<int:bid>")
@auth.login_required
def edit_book(bid):
    f = _book_fields(body())
    with db.tx() as c:
        if not c.run("SELECT 1 AS x FROM Book WHERE Book_ID=%s", (bid,)).one():
            raise ApiError("Book not found", 404)
        c.run("UPDATE Book SET Title=%s, Author=%s, Category=%s, Quantity=%s WHERE Book_ID=%s", f + (bid,))
        audit(c, "EDIT_BOOK", f"#{bid} {f[0]}")
        return jsonify(ok=True)


@bp.delete("/api/books/<int:bid>")
@auth.admin_required
def del_book(bid):
    with db.tx() as c:
        b = c.run("SELECT Title FROM Book WHERE Book_ID=%s", (bid,)).one()
        if not b:
            raise ApiError("Book not found", 404)
        if c.run("SELECT COUNT(*) AS n FROM Issue WHERE Book_ID=%s", (bid,)).scalar():
            raise ApiError("This book has issue history and cannot be deleted", 409)
        c.run("DELETE FROM Book WHERE Book_ID=%s", (bid,))
        audit(c, "DELETE_BOOK", f"#{bid} {b['Title']}")
        return jsonify(ok=True)


# ----------------------------------------------------------------- members
@bp.get("/api/members")
@auth.login_required
def members():
    q = like()
    where = "WHERE Name LIKE %s OR Department LIKE %s OR Phone LIKE %s"
    with db.tx() as c:
        return jsonify(paged(c, f"SELECT COUNT(*) AS n FROM Member {where}", (q, q, q),
                             f"SELECT * FROM Member {where} ORDER BY Member_ID", (q, q, q)))


@bp.post("/api/members")
@auth.login_required
def add_member():
    d = body()
    name, dept, phone = text(d, "name", "Name", 80, True), text(d, "department", "Department", 40), phone_of(d)
    with db.tx() as c:
        if phone and c.run("SELECT 1 AS x FROM Member WHERE Phone=%s", (phone,)).one():
            raise ApiError("This phone number is already registered", 409)
        c.run("INSERT INTO Member(Name,Department,Phone) VALUES(%s,%s,%s)", (name, dept, phone))
        mid = c.lastid
        audit(c, "ADD_MEMBER", f"#{mid} {name}")
        return jsonify(id=mid), 201


@bp.put("/api/members/<int:mid>")
@auth.login_required
def edit_member(mid):
    d = body()
    name, dept, phone = text(d, "name", "Name", 80, True), text(d, "department", "Department", 40), phone_of(d)
    with db.tx() as c:
        if not c.run("SELECT 1 AS x FROM Member WHERE Member_ID=%s", (mid,)).one():
            raise ApiError("Member not found", 404)
        if phone and c.run("SELECT 1 AS x FROM Member WHERE Phone=%s AND Member_ID<>%s", (phone, mid)).one():
            raise ApiError("This phone number belongs to another member", 409)
        c.run("UPDATE Member SET Name=%s, Department=%s, Phone=%s WHERE Member_ID=%s", (name, dept, phone, mid))
        audit(c, "EDIT_MEMBER", f"#{mid} {name}")
        return jsonify(ok=True)


@bp.delete("/api/members/<int:mid>")
@auth.admin_required
def del_member(mid):
    with db.tx() as c:
        m = c.run("SELECT Name FROM Member WHERE Member_ID=%s", (mid,)).one()
        if not m:
            raise ApiError("Member not found", 404)
        if c.run("SELECT COUNT(*) AS n FROM Issue WHERE Member_ID=%s", (mid,)).scalar():
            raise ApiError("This member has issue history and cannot be deleted", 409)
        c.run("DELETE FROM Member WHERE Member_ID=%s", (mid,))
        audit(c, "DELETE_MEMBER", f"#{mid} {m['Name']}")
        return jsonify(ok=True)


# ----------------------------------------------------------------- issue / return / renew
ISSUE_SQL = """SELECT i.Issue_ID, i.Member_ID, m.Name AS Member, i.Book_ID, b.Title, i.Issue_Date, i.Due_Date,
       i.Return_Date, i.Renewed, COALESCE(f.Amount,0) AS Fine, COALESCE(f.Paid,0) AS Paid
       FROM Issue i JOIN Member m ON m.Member_ID=i.Member_ID JOIN Book b ON b.Book_ID=i.Book_ID
       LEFT JOIN Fine f ON f.Issue_ID=i.Issue_ID"""
ISSUE_COUNT = "SELECT COUNT(*) AS n FROM Issue i JOIN Member m ON m.Member_ID=i.Member_ID JOIN Book b ON b.Book_ID=i.Book_ID"


def _issue_filter():
    q, status = like(), request.args.get("status", "all")
    cond = "(m.Name LIKE %s OR b.Title LIKE %s)"
    if status == "open":
        cond += " AND i.Return_Date IS NULL"
    elif status == "returned":
        cond += " AND i.Return_Date IS NOT NULL"
    elif status == "overdue":
        cond += " AND i.Return_Date IS NULL AND i.Due_Date < '" + date.today().isoformat() + "'"
    return " WHERE " + cond, (q, q)


def _mark_overdue(rows):
    today = date.today()
    for r in rows:
        r["Overdue"] = r["Return_Date"] is None and as_date(r["Due_Date"]) < today
    return rows


@bp.get("/api/issues")
@auth.login_required
def issues():
    where, args = _issue_filter()
    with db.tx() as c:
        out = paged(c, ISSUE_COUNT + where, args, ISSUE_SQL + where + " ORDER BY i.Issue_ID DESC", args)
    _mark_overdue(out["items"])
    return jsonify(out)


@bp.post("/api/issue")
@auth.login_required
def issue_book():
    d, cfg = body(), current_app.config
    mid, bid = number(d, "member_id", "Member", 1, 10**9), number(d, "book_id", "Book", 1, 10**9)
    with db.tx() as c:
        m = c.run("SELECT Name FROM Member WHERE Member_ID=%s", (mid,)).one()
        b = c.run("SELECT Title FROM Book WHERE Book_ID=%s", (bid,)).one()
        if not m:
            raise ApiError("Member not found", 404)
        if not b:
            raise ApiError("Book not found", 404)
        if c.run("SELECT 1 AS x FROM Issue WHERE Member_ID=%s AND Book_ID=%s AND Return_Date IS NULL", (mid, bid)).one():
            raise ApiError("This member already has this book", 409)
        if c.run("SELECT COUNT(*) AS n FROM Issue WHERE Member_ID=%s AND Return_Date IS NULL", (mid,)).scalar() >= cfg["MAX_BOOKS_PER_MEMBER"]:
            raise ApiError(f"Limit reached: a member can hold at most {cfg['MAX_BOOKS_PER_MEMBER']} books", 409)
        if c.run("SELECT 1 AS x FROM Fine f JOIN Issue i ON i.Issue_ID=f.Issue_ID WHERE i.Member_ID=%s AND f.Paid=0", (mid,)).one():
            raise ApiError("Member has unpaid fines. Clear them first", 409)
        # atomic stock decrement: succeeds only if a copy is really available (safe for two librarians at once)
        c.run("UPDATE Book SET Quantity=Quantity-1 WHERE Book_ID=%s AND Quantity>0", (bid,))
        if c.rowcount != 1:
            raise ApiError(f"'{b['Title']}' has no copies available", 409)
        today = date.today()
        due = today + timedelta(days=cfg["LOAN_DAYS"])
        c.run("INSERT INTO Issue(Member_ID,Book_ID,Issue_Date,Due_Date) VALUES(%s,%s,%s,%s)",
              (mid, bid, today.isoformat(), due.isoformat()))
        iid = c.lastid
        audit(c, "ISSUE", f"#{iid} '{b['Title']}' to {m['Name']}")
        return jsonify(id=iid, due=due.isoformat()), 201


@bp.post("/api/return/<int:iid>")
@auth.login_required
def return_book(iid):
    cfg = current_app.config
    with db.tx() as c:
        row = c.run("SELECT * FROM Issue WHERE Issue_ID=%s", (iid,)).one()
        if not row:
            raise ApiError("Issue record not found", 404)
        today = date.today()
        c.run("UPDATE Issue SET Return_Date=%s WHERE Issue_ID=%s AND Return_Date IS NULL", (today.isoformat(), iid))
        if c.rowcount != 1:
            raise ApiError("This book is already returned", 409)
        c.run("UPDATE Book SET Quantity=Quantity+1 WHERE Book_ID=%s", (row["Book_ID"],))
        late = max((today - as_date(row["Due_Date"])).days, 0)
        fine = late * cfg["FINE_PER_DAY"]
        if fine:
            c.run("INSERT INTO Fine(Issue_ID,Amount,Paid) VALUES(%s,%s,0)", (iid, fine))
        audit(c, "RETURN", f"#{iid} late={late}d fine={fine}")
        return jsonify(days_late=late, fine=fine)


@bp.post("/api/renew/<int:iid>")
@auth.login_required
def renew(iid):
    cfg = current_app.config
    with db.tx() as c:
        row = c.run("SELECT * FROM Issue WHERE Issue_ID=%s", (iid,)).one()
        if not row:
            raise ApiError("Issue record not found", 404)
        if row["Return_Date"] is not None:
            raise ApiError("This book is already returned", 409)
        if row["Renewed"]:
            raise ApiError("A book can be renewed only once", 409)
        if as_date(row["Due_Date"]) < date.today():
            raise ApiError("Overdue books cannot be renewed. Return the book first", 409)
        new_due = as_date(row["Due_Date"]) + timedelta(days=cfg["LOAN_DAYS"])
        c.run("UPDATE Issue SET Due_Date=%s, Renewed=1 WHERE Issue_ID=%s", (new_due.isoformat(), iid))
        audit(c, "RENEW", f"#{iid} new due {new_due.isoformat()}")
        return jsonify(due=new_due.isoformat())


# ----------------------------------------------------------------- fines
FINE_SQL = """SELECT f.Fine_ID, f.Issue_ID, m.Name AS Member, b.Title, f.Amount, f.Paid
              FROM Fine f JOIN Issue i ON i.Issue_ID=f.Issue_ID
              JOIN Member m ON m.Member_ID=i.Member_ID JOIN Book b ON b.Book_ID=i.Book_ID"""


@bp.get("/api/fines")
@auth.login_required
def fines():
    where = {"unpaid": " WHERE f.Paid=0", "paid": " WHERE f.Paid=1"}.get(request.args.get("status", "all"), "")
    with db.tx() as c:
        return jsonify(paged(c, "SELECT COUNT(*) AS n FROM Fine f" + where.replace("f.Paid", "Paid"), (),
                             FINE_SQL + where + " ORDER BY f.Paid, f.Fine_ID DESC", ()))


@bp.post("/api/fines/<int:fid>/pay")
@auth.login_required
def pay_fine(fid):
    with db.tx() as c:
        f = c.run("SELECT Paid, Amount FROM Fine WHERE Fine_ID=%s", (fid,)).one()
        if not f:
            raise ApiError("Fine not found", 404)
        if f["Paid"]:
            raise ApiError("This fine is already paid", 409)
        c.run("UPDATE Fine SET Paid=1 WHERE Fine_ID=%s", (fid,))
        audit(c, "PAY_FINE", f"#{fid} Rs {f['Amount']}")
        return jsonify(ok=True)


# ----------------------------------------------------------------- reports / audit / export
@bp.get("/api/reports/summary")
@auth.login_required
def report_summary():
    today, per_day = date.today(), current_app.config["FINE_PER_DAY"]
    with db.tx() as c:
        overdue = c.run(ISSUE_SQL + " WHERE i.Return_Date IS NULL AND i.Due_Date < %s ORDER BY i.Due_Date", (today.isoformat(),)).all()
        top = c.run("""SELECT b.Title, COUNT(*) AS Times_Issued FROM Issue i JOIN Book b ON b.Book_ID=i.Book_ID
                       GROUP BY b.Book_ID, b.Title ORDER BY Times_Issued DESC, b.Title LIMIT 5""").all()
        cats = c.run("""SELECT COALESCE(NULLIF(Category,''),'Uncategorised') AS Category, COUNT(*) AS Titles,
                        SUM(Quantity) AS Copies FROM Book GROUP BY COALESCE(NULLIF(Category,''),'Uncategorised')
                        ORDER BY Titles DESC""").all()
    for r in overdue:
        r["Days_Late"] = (today - as_date(r["Due_Date"])).days
        r["Fine_So_Far"] = r["Days_Late"] * per_day
    for r in cats:
        r["Copies"] = int(r["Copies"] or 0)
    return jsonify(overdue=overdue, top_books=top, categories=cats)


@bp.get("/api/audit")
@auth.admin_required
def audit_log():
    with db.tx() as c:
        return jsonify(paged(c, "SELECT COUNT(*) AS n FROM Audit_Log", (),
                             "SELECT Log_ID, Username, Action, Detail, Logged_At FROM Audit_Log ORDER BY Log_ID DESC", ()))


EXPORTS = {
    "books": "SELECT Book_ID, Title, Author, Category, Quantity FROM Book ORDER BY Book_ID",
    "members": "SELECT Member_ID, Name, Department, Phone, Joined_On FROM Member ORDER BY Member_ID",
    "issues": ISSUE_SQL + " ORDER BY i.Issue_ID",
    "fines": FINE_SQL + " ORDER BY f.Fine_ID",
}


def _safe_cell(v):
    s = "" if v is None else str(v)
    return "'" + s if s[:1] in ("=", "+", "-", "@") else s   # blocks CSV/Excel formula injection


@bp.get("/api/export/<name>.csv")
@auth.login_required
def export(name):
    if name not in EXPORTS:
        raise ApiError("Unknown export", 404)
    with db.tx() as c:
        rows = c.run(EXPORTS[name]).all()
        audit(c, "EXPORT", name)
    buf = io.StringIO()
    if rows:
        w = csv.writer(buf)
        w.writerow(rows[0].keys())
        for r in rows:
            w.writerow([_safe_cell(v) for v in r.values()])
    return Response(buf.getvalue(), mimetype="text/csv",
                    headers={"Content-Disposition": f"attachment; filename=library_{name}_{date.today().isoformat()}.csv"})

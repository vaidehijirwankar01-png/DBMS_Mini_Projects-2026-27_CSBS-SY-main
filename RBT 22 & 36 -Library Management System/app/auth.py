"""Login, sessions, CSRF protection and roles."""
import secrets
import time
from functools import wraps

from flask import current_app, jsonify, request, session
from werkzeug.security import check_password_hash, generate_password_hash

_failures = {}   # (ip, username) -> [timestamps]


def hash_password(pw):
    return generate_password_hash(pw, method="pbkdf2:sha256:600000")


def verify(pw_hash, pw):
    return check_password_hash(pw_hash, pw)


def too_many_attempts(key):
    cfg = current_app.config
    now = time.time()
    _failures[key] = [t for t in _failures.get(key, []) if now - t < cfg["LOGIN_WINDOW_SEC"]]
    return len(_failures[key]) >= cfg["LOGIN_MAX_FAILS"]


def record_failure(key):
    _failures.setdefault(key, []).append(time.time())


def clear_failures(key):
    _failures.pop(key, None)


def login_user(row):
    session.clear()
    session.permanent = True
    session["uid"] = row["Librarian_ID"]
    session["user"] = row["Username"]
    session["name"] = row["Full_Name"]
    session["role"] = row["Role"]
    session["csrf"] = secrets.token_hex(16)


def login_required(fn):
    @wraps(fn)
    def wrapper(*a, **kw):
        if "uid" not in session:
            return jsonify(error="Please sign in"), 401
        return fn(*a, **kw)
    return wrapper


def admin_required(fn):
    @wraps(fn)
    @login_required
    def wrapper(*a, **kw):
        if session.get("role") != "admin":
            return jsonify(error="Administrator access required"), 403
        return fn(*a, **kw)
    return wrapper


def check_csrf():
    """Every state-changing request must echo the per-session token (blocks cross-site forgery)."""
    if request.method in ("POST", "PUT", "PATCH", "DELETE") and request.endpoint != "api.login":
        if "uid" in session and not secrets.compare_digest(request.headers.get("X-CSRF-Token", ""), session.get("csrf", "")):
            return jsonify(error="Invalid or missing security token. Reload the page."), 403

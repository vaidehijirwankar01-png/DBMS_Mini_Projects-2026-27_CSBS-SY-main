"""
Smart Waste Collection & Segregation Tracker
Utility Functions & Decorators

Provides authentication decorators, form helpers, and formatting utilities.
"""

from functools import wraps
from flask import session, redirect, url_for, flash, abort
from datetime import datetime
from decimal import Decimal, InvalidOperation


def login_required(f):
    """
    Decorator that ensures the user is logged in.
    Redirects to the login page if session has no user_id.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            flash('Please log in to access this page.', 'warning')
            return redirect(url_for('auth.login'))
        return f(*args, **kwargs)
    return decorated_function


def role_required(*roles):
    """
    Decorator that restricts access to users with specific roles.
    Must be used AFTER @login_required so that session['role'] is guaranteed.

    Usage:
        @bp.route('/admin-page')
        @login_required
        @role_required('admin')
        def admin_page():
            ...
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            user_role = session.get('role')
            if user_role not in roles:
                flash('You do not have permission to access this page.', 'danger')
                abort(403)
            return f(*args, **kwargs)
        return decorated_function
    return decorator


def flash_errors(form_errors):
    """
    Flash all form validation errors.

    Args:
        form_errors: A dict of field -> list of error messages,
                     or a list of error message strings.
    """
    if isinstance(form_errors, dict):
        for field, errors in form_errors.items():
            for error in errors:
                flash(f"{field}: {error}", 'danger')
    elif isinstance(form_errors, list):
        for error in form_errors:
            flash(error, 'danger')
    else:
        flash(str(form_errors), 'danger')


def format_date(dt, fmt='%d %b %Y'):
    """
    Format a datetime object into a human-readable string.

    Args:
        dt: A datetime object or None.
        fmt: strftime format string (default: '25 Oct 2026').

    Returns:
        Formatted date string or 'N/A' if dt is None.
    """
    if dt is None:
        return 'N/A'
    if isinstance(dt, str):
        try:
            dt = datetime.strptime(dt, '%Y-%m-%d')
        except ValueError:
            try:
                dt = datetime.strptime(dt, '%Y-%m-%d %H:%M:%S')
            except ValueError:
                return dt
    return dt.strftime(fmt)


def safe_decimal(value, default=0):
    """
    Safely convert a value to a Decimal, returning a default on failure.

    Args:
        value: The value to convert.
        default: Default value if conversion fails (default: 0).

    Returns:
        Decimal representation of the value.
    """
    if value is None:
        return Decimal(str(default))
    try:
        return Decimal(str(value))
    except (InvalidOperation, ValueError, TypeError):
        return Decimal(str(default))

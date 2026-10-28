"""
Smart Waste Collection & Segregation Tracker
Authentication Routes

Handles user login, registration, and logout with password hashing.
"""

from flask import (
    Blueprint, render_template, request, redirect,
    url_for, flash, session
)
from werkzeug.security import generate_password_hash, check_password_hash
from db import execute_query
from mysql.connector import Error

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    """Authenticate a user with email and password."""
    if session.get('user_id'):
        return _redirect_by_role(session.get('role'))

    if request.method == 'POST':
        email    = request.form.get('email', '').strip().lower()
        password = request.form.get('password', '')

        if not email or not password:
            flash('Please enter both email and password.', 'danger')
            return render_template('auth/login.html')

        try:
            user = execute_query(
                """SELECT user_id, full_name, email, password_hash, role, is_active
                   FROM users WHERE email = %s""",
                (email,), fetchone=True
            )

            if not user:
                flash('Invalid email or password.', 'danger')
                return render_template('auth/login.html')

            if not user['is_active']:
                flash('Your account has been deactivated. Please contact an administrator.', 'danger')
                return render_template('auth/login.html')

            if not check_password_hash(user['password_hash'], password):
                flash('Invalid email or password.', 'danger')
                return render_template('auth/login.html')

            # Successful login
            session['user_id']   = user['user_id']
            session['role']      = user['role']
            session['full_name'] = user['full_name']
            session['email']     = user['email']
            session.permanent    = True

            flash(f'Welcome back, {user["full_name"]}!', 'success')
            return _redirect_by_role(user['role'])

        except Error as e:
            flash('A database error occurred. Please try again.', 'danger')
            print(f"[AUTH] Login error: {e}")

    return render_template('auth/login.html')


@auth_bp.route('/register', methods=['GET', 'POST'])
def register():
    """Register a new citizen account."""
    if session.get('user_id'):
        return _redirect_by_role(session.get('role'))

    if request.method == 'POST':
        full_name = request.form.get('full_name', '').strip()
        email     = request.form.get('email', '').strip().lower()
        phone     = request.form.get('phone', '').strip()
        area_id   = request.form.get('area_id')
        password  = request.form.get('password', '')
        confirm   = request.form.get('confirm_password', '')

        # Basic validation
        errors = []
        if not full_name:
            errors.append('Full name is required.')
        if not email:
            errors.append('Email is required.')
        if not password:
            errors.append('Password is required.')
        if len(password) < 6:
            errors.append('Password must be at least 6 characters.')
        if password != confirm:
            errors.append('Passwords do not match.')

        if errors:
            for e in errors:
                flash(e, 'danger')
            areas = execute_query("SELECT area_id, area_name, locality FROM areas ORDER BY area_name", fetchall=True) or []
            return render_template('auth/register.html', areas=areas)

        try:
            # Check email uniqueness
            existing = execute_query(
                "SELECT user_id FROM users WHERE email = %s",
                (email,), fetchone=True
            )
            if existing:
                flash('An account with this email already exists.', 'danger')
                areas = execute_query("SELECT area_id, area_name, locality FROM areas ORDER BY area_name", fetchall=True) or []
                return render_template('auth/register.html', areas=areas)

            # Hash the password and insert the user
            password_hash = generate_password_hash(password)
            area_val = int(area_id) if area_id and area_id.isdigit() else None

            execute_query(
                """INSERT INTO users
                       (full_name, email, phone, password_hash, role, area_id, is_active)
                   VALUES (%s, %s, %s, %s, 'citizen', %s, 1)""",
                (full_name, email, phone or None, password_hash, area_val),
                commit=True
            )

            flash('Registration successful! Please log in with your credentials.', 'success')
            return redirect(url_for('auth.login'))

        except Error as e:
            flash(f'A database error occurred during registration: {e}', 'danger')
            print(f"[AUTH] Registration error: {e}")

    areas = []
    try:
        areas = execute_query("SELECT area_id, area_name, locality FROM areas ORDER BY area_name", fetchall=True) or []
    except Error:
        pass
    return render_template('auth/register.html', areas=areas)


@auth_bp.route('/logout')
def logout():
    """Clear the session and redirect to login."""
    session.clear()
    flash('You have been logged out safely.', 'info')
    return redirect(url_for('auth.login'))


def _redirect_by_role(role):
    """Redirect user to their role dashboard."""
    if role == 'admin':
        return redirect(url_for('admin.dashboard'))
    elif role == 'worker':
        return redirect(url_for('worker.dashboard'))
    else:
        return redirect(url_for('citizen.dashboard'))

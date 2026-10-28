"""
Smart Waste Collection & Segregation Tracker
Main Application Entry Point
"""

from flask import Flask, redirect, url_for, session, render_template, request
from config import Config
from db import init_pool, test_connection
import os
import secrets

app = Flask(__name__)
app.config['SECRET_KEY'] = Config.SECRET_KEY

# Initialize database pool
init_pool()

# Register blueprints
from routes.auth import auth_bp
from routes.admin import admin_bp
from routes.citizen import citizen_bp
from routes.worker import worker_bp
from routes.reports import reports_bp

app.register_blueprint(auth_bp)
app.register_blueprint(admin_bp)
app.register_blueprint(citizen_bp)
app.register_blueprint(worker_bp)
app.register_blueprint(reports_bp)


# Ensure CSRF token is present in session
@app.before_request
def ensure_csrf_token():
    if 'csrf_token' not in session:
        session['csrf_token'] = secrets.token_hex(16)


# Context processor to make user & helpers available in all templates
@app.context_processor
def inject_global_data():
    current_user = None
    if session.get('user_id'):
        current_user = {
            'id': session.get('user_id'),
            'name': session.get('full_name'),
            'email': session.get('email'),
            'role': session.get('role'),
        }
    return {
        'current_user': current_user,
        'csrf_token': session.get('csrf_token', '')
    }


# Template filters
@app.template_filter('status_badge')
def status_badge_filter(status):
    """Return Bootstrap badge class for request/assignment status."""
    badge_map = {
        'Pending': 'warning text-dark',
        'Assigned': 'info text-dark',
        'In Progress': 'primary',
        'Collected': 'success',
        'Completed': 'dark',
        'Cancelled': 'danger',
        'Active': 'primary',
        'Available': 'success',
        'Busy': 'warning text-dark',
        'On Leave': 'secondary',
        'Verified': 'success',
        'Incorrect': 'danger'
    }
    return badge_map.get(status, 'secondary')


@app.template_filter('format_date')
def format_date_filter(val, fmt='%d %b %Y'):
    """Format dates nicely in templates."""
    if not val:
        return '—'
    if hasattr(val, 'strftime'):
        return val.strftime(fmt)
    return str(val)


# Landing page
@app.route('/')
def index():
    if session.get('user_id'):
        role = session.get('role')
        if role == 'admin':
            return redirect(url_for('admin.dashboard'))
        elif role == 'worker':
            return redirect(url_for('worker.dashboard'))
        else:
            return redirect(url_for('citizen.dashboard'))
    return render_template('landing.html')


# Error handlers
@app.errorhandler(404)
def not_found(e):
    return render_template('errors/404.html'), 404


@app.errorhandler(403)
def forbidden(e):
    return render_template('errors/403.html'), 403


@app.errorhandler(500)
def server_error(e):
    return render_template('errors/500.html'), 500


if __name__ == '__main__':
    print("=" * 65)
    print(" Smart Waste Collection & Segregation Tracker ")
    print("=" * 65)
    if test_connection():
        print("[OK] Database connection verified successfully.")
    else:
        print("[WARNING] Could not connect to MySQL database.")
        print("          Ensure MySQL server is running and .env is configured.")
    print(f"Starting server on http://localhost:{Config.APP_PORT}")
    print("=" * 65)
    app.run(debug=Config.DEBUG, port=Config.APP_PORT)


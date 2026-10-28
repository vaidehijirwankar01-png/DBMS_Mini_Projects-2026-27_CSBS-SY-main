"""
Smart Waste Collection & Segregation Tracker
Citizen Routes Blueprint

Features:
- Citizen dashboard with personal stats
- Create new waste collection requests
- View personal collection history and tracking details
- Cancel pending requests
- Submit feedback & ratings for completed collections (duplicate protected)
- View interactive waste segregation instructions
"""

from flask import Blueprint, render_template, request, redirect, url_for, flash, session
from utils import login_required, role_required, safe_decimal
from db import execute_query
from services.collection_service import (
    create_request, get_citizen_requests, get_request_by_id, cancel_request
)
from datetime import datetime, date
from mysql.connector import Error

citizen_bp = Blueprint('citizen', __name__, url_prefix='/citizen')


@citizen_bp.route('/dashboard')
@login_required
@role_required('citizen')
def dashboard():
    """Citizen Dashboard showing active requests, status summary, and quick actions."""
    citizen_id = session.get('user_id')

    # Get requests summary
    stats_row = execute_query(
        """SELECT 
               COUNT(*) AS total_requests,
               SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pending_count,
               SUM(CASE WHEN status IN ('Assigned', 'In Progress', 'Collected') THEN 1 ELSE 0 END) AS active_count,
               SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS completed_count,
               COALESCE(SUM(actual_quantity_kg), 0) AS total_collected_kg
           FROM collection_requests
           WHERE citizen_id = %s""",
        (citizen_id,), fetchone=True
    ) or {}

    # Recent 5 requests
    recent_requests = execute_query(
        """SELECT cr.request_id, cr.estimated_quantity_kg, cr.actual_quantity_kg,
                  cr.pickup_address, cr.preferred_date, cr.status, cr.created_at,
                  wc.category_name, wc.color_code,
                  (SELECT rating FROM feedback WHERE request_id = cr.request_id AND citizen_id = %s) AS user_rating
           FROM collection_requests cr
           JOIN waste_categories wc ON cr.category_id = wc.category_id
           WHERE cr.citizen_id = %s
           ORDER BY cr.created_at DESC
           LIMIT 5""",
        (citizen_id, citizen_id), fetchall=True
    ) or []

    return render_template('citizen/dashboard.html',
                           stats=stats_row,
                           recent_requests=recent_requests)


@citizen_bp.route('/request/new', methods=['GET', 'POST'])
@login_required
@role_required('citizen')
def new_request():
    """Create a new waste collection request."""
    citizen_id = session.get('user_id')

    if request.method == 'POST':
        category_id   = request.form.get('category_id')
        area_id       = request.form.get('area_id')
        estimated_qty = request.form.get('estimated_quantity_kg')
        address       = request.form.get('pickup_address', '').strip()
        pref_date_str = request.form.get('preferred_date', '')
        notes         = request.form.get('notes', '').strip()

        # Validation
        if not category_id or not area_id or not estimated_qty or not address or not pref_date_str:
            flash('All required fields must be filled.', 'danger')
            return redirect(url_for('citizen.new_request'))

        try:
            qty = float(estimated_qty)
            if qty <= 0:
                flash('Estimated quantity must be greater than 0 kg.', 'danger')
                return redirect(url_for('citizen.new_request'))

            pref_date = datetime.strptime(pref_date_str, '%Y-%m-%d').date()
            if pref_date < date.today():
                flash('Preferred collection date cannot be in the past.', 'danger')
                return redirect(url_for('citizen.new_request'))

            req_id = create_request(
                citizen_id=citizen_id,
                category_id=int(category_id),
                area_id=int(area_id),
                quantity=qty,
                address=address,
                preferred_date=pref_date_str,
                notes=notes or None
            )

            flash(f'Waste collection request #{req_id} submitted successfully! Sanitation workers will be scheduled.', 'success')
            return redirect(url_for('citizen.requests'))

        except (ValueError, Error) as e:
            flash(f"Error submitting collection request: {e}", 'danger')

    # Load categories and areas for the form
    categories = execute_query(
        "SELECT category_id, category_name, description, color_code FROM waste_categories ORDER BY category_id",
        fetchall=True
    ) or []
    areas = execute_query(
        "SELECT area_id, area_name, locality, postal_code FROM areas ORDER BY area_name",
        fetchall=True
    ) or []

    # Get citizen's default area if set
    user = execute_query("SELECT area_id FROM users WHERE user_id = %s", (citizen_id,), fetchone=True)
    default_area_id = user['area_id'] if user else None

    return render_template('citizen/new_request.html',
                           categories=categories,
                           areas=areas,
                           default_area_id=default_area_id,
                           min_date=date.today().isoformat())


@citizen_bp.route('/requests')
@login_required
@role_required('citizen')
def requests():
    """List all requests submitted by the logged-in citizen with status filtering."""
    citizen_id = session.get('user_id')
    status_filter = request.args.get('status', 'all')

    requests_list = get_citizen_requests(citizen_id, status_filter)

    return render_template('citizen/requests.html',
                           requests=requests_list,
                           current_status=status_filter)


@citizen_bp.route('/requests/<int:request_id>')
@login_required
@role_required('citizen')
def request_detail(request_id):
    """View details of a specific collection request."""
    citizen_id = session.get('user_id')
    req = get_request_by_id(request_id)

    if not req or req['citizen_id'] != citizen_id:
        flash('Request not found or access unauthorized.', 'danger')
        return redirect(url_for('citizen.requests'))

    # Check for existing feedback
    feedback = execute_query(
        """SELECT rating, comments, submitted_at
           FROM feedback
           WHERE request_id = %s AND citizen_id = %s""",
        (request_id, citizen_id), fetchone=True
    )

    # Status tracking history
    history = execute_query(
        """SELECT previous_status, new_status, changed_at, remarks
           FROM collection_status_history
           WHERE request_id = %s
           ORDER BY changed_at ASC""",
        (request_id,), fetchall=True
    ) or []

    return render_template('citizen/request_detail.html',
                           req=req,
                           feedback=feedback,
                           history=history)


@citizen_bp.route('/requests/<int:request_id>/cancel', methods=['POST'])
@login_required
@role_required('citizen')
def cancel(request_id):
    """Cancel a pending request."""
    citizen_id = session.get('user_id')
    try:
        cancel_request(request_id, citizen_id)
        flash(f'Collection request #{request_id} has been cancelled.', 'info')
    except (ValueError, Error) as e:
        flash(f'Cancellation failed: {e}', 'danger')

    return redirect(url_for('citizen.request_detail', request_id=request_id))


@citizen_bp.route('/requests/<int:request_id>/feedback', methods=['POST'])
@login_required
@role_required('citizen')
def submit_feedback(request_id):
    """Submit rating and comments for a completed collection."""
    citizen_id = session.get('user_id')
    rating_str = request.form.get('rating')
    comments   = request.form.get('comments', '').strip()

    req = get_request_by_id(request_id)
    if not req or req['citizen_id'] != citizen_id:
        flash('Unauthorized request access.', 'danger')
        return redirect(url_for('citizen.requests'))

    if req['status'] != 'Completed':
        flash('Feedback can only be provided for completed collections.', 'warning')
        return redirect(url_for('citizen.request_detail', request_id=request_id))

    try:
        rating = int(rating_str)
        if rating < 1 or rating > 5:
            flash('Rating must be between 1 and 5 stars.', 'danger')
            return redirect(url_for('citizen.request_detail', request_id=request_id))

        # Check duplicate feedback
        existing = execute_query(
            "SELECT feedback_id FROM feedback WHERE request_id = %s AND citizen_id = %s",
            (request_id, citizen_id), fetchone=True
        )
        if existing:
            flash('You have already submitted feedback for this collection request.', 'warning')
            return redirect(url_for('citizen.request_detail', request_id=request_id))

        execute_query(
            """INSERT INTO feedback (request_id, citizen_id, rating, comments, submitted_at)
               VALUES (%s, %s, %s, %s, NOW())""",
            (request_id, citizen_id, rating, comments or None),
            commit=True
        )
        flash('Thank you for your valuable feedback!', 'success')

    except (ValueError, Error) as e:
        flash(f'Error submitting feedback: {e}', 'danger')

    return redirect(url_for('citizen.request_detail', request_id=request_id))


@citizen_bp.route('/segregation-guide')
def segregation_guide():
    """Educational guide for waste segregation categories and best practices."""
    categories = []
    try:
        categories = execute_query(
            """SELECT category_id, category_name, description,
                      segregation_instructions, color_code
               FROM waste_categories
               ORDER BY category_id ASC""",
            fetchall=True
        ) or []
    except Error:
        pass

    return render_template('citizen/segregation_guide.html', categories=categories)

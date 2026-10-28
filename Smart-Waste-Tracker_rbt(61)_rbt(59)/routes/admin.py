"""
Smart Waste Collection & Segregation Tracker
Admin Routes Blueprint

Handles all administrator features:
- Dashboard with real-time stats and metrics
- User management (view, toggle active)
- Worker management (view, add)
- Area management (view, add, edit)
- Category management
- Collection requests management & assignment
- Segregation & recycling tracking
- Reports and CSV export
- Comprehensive DBMS demonstration page
"""

from flask import Blueprint, render_template, request, redirect, url_for, flash, session, Response
from utils import login_required, role_required, format_date, safe_decimal
from db import execute_query, execute_transaction
from services.collection_service import get_all_requests, get_request_by_id
from services.assignment_service import assign_worker, get_available_workers
from services.reporting_service import (
    get_dashboard_stats, get_collection_report, get_area_stats,
    get_worker_performance, get_category_distribution, get_recycling_stats,
    generate_csv_data
)
from werkzeug.security import generate_password_hash
from mysql.connector import Error
from datetime import datetime

admin_bp = Blueprint('admin', __name__, url_prefix='/admin')


@admin_bp.route('/dashboard')
@login_required
@role_required('admin')
def dashboard():
    """Admin Dashboard showing high-level operational statistics and recent requests."""
    stats = get_dashboard_stats()

    # Recent 10 requests
    recent_requests = execute_query(
        """SELECT cr.request_id, cr.status, cr.created_at,
                  cr.estimated_quantity_kg, cr.actual_quantity_kg,
                  u.full_name AS citizen_name,
                  wc.category_name, wc.color_code,
                  a.area_name
           FROM collection_requests cr
           JOIN users u             ON cr.citizen_id  = u.user_id
           JOIN waste_categories wc ON cr.category_id = wc.category_id
           LEFT JOIN areas a        ON cr.area_id     = a.area_id
           ORDER BY cr.created_at DESC
           LIMIT 10""",
        fetchall=True
    ) or []

    # Workers overview
    worker_stats = execute_query(
        """SELECT u.full_name,
                  w.availability_status,
                  w.total_collections,
                  COUNT(a.assignment_id) AS active_tasks
           FROM workers w
           JOIN users u ON w.user_id = u.user_id
           LEFT JOIN assignments a ON w.worker_id = a.worker_id AND a.assignment_status = 'Active'
           GROUP BY w.worker_id, u.full_name, w.availability_status, w.total_collections
           ORDER BY w.availability_status, u.full_name
           LIMIT 5""",
        fetchall=True
    ) or []

    return render_template('admin/dashboard.html',
                           stats=stats,
                           recent_requests=recent_requests,
                           worker_stats=worker_stats)


@admin_bp.route('/users')
@login_required
@role_required('admin')
def users():
    """List and filter system users."""
    role_filter = request.args.get('role', 'all')
    search_term = request.args.get('search', '').strip()

    query = """
        SELECT u.user_id, u.full_name, u.email, u.phone, u.role,
               u.is_active, u.created_at, a.area_name
        FROM users u
        LEFT JOIN areas a ON u.area_id = a.area_id
        WHERE 1=1
    """
    params = []

    if role_filter != 'all':
        query += " AND u.role = %s"
        params.append(role_filter)

    if search_term:
        query += " AND (u.full_name LIKE %s OR u.email LIKE %s)"
        params.extend([f"%{search_term}%", f"%{search_term}%"])

    query += " ORDER BY u.created_at DESC"
    all_users = execute_query(query, tuple(params), fetchall=True) or []

    return render_template('admin/users.html',
                           users=all_users,
                           current_role=role_filter,
                           search=search_term)


@admin_bp.route('/users/<int:user_id>/toggle', methods=['POST'])
@login_required
@role_required('admin')
def toggle_user(user_id):
    """Toggle user active status (soft activate / deactivate)."""
    if user_id == session.get('user_id'):
        flash('You cannot deactivate your own administrative account.', 'danger')
        return redirect(url_for('admin.users'))

    try:
        user = execute_query("SELECT is_active FROM users WHERE user_id = %s", (user_id,), fetchone=True)
        if not user:
            flash('User not found.', 'danger')
            return redirect(url_for('admin.users'))

        new_status = not user['is_active']
        execute_query("UPDATE users SET is_active = %s WHERE user_id = %s", (new_status, user_id), commit=True)
        flash(f"User account {'activated' if new_status else 'deactivated'} successfully.", 'success')
    except Error as e:
        flash(f"Database error: {e}", 'danger')

    return redirect(url_for('admin.users'))


@admin_bp.route('/workers')
@login_required
@role_required('admin')
def workers():
    """List sanitation workers with operational statistics."""
    worker_list = execute_query(
        """SELECT w.worker_id, w.user_id, u.full_name, u.email, u.phone,
                  w.availability_status, w.joining_date, w.total_collections,
                  u.is_active,
                  COUNT(CASE WHEN a.assignment_status = 'Active' THEN 1 END) AS active_tasks
           FROM workers w
           JOIN users u ON w.user_id = u.user_id
           LEFT JOIN assignments a ON w.worker_id = a.worker_id
           GROUP BY w.worker_id, w.user_id, u.full_name, u.email, u.phone,
                    w.availability_status, w.joining_date, w.total_collections, u.is_active
           ORDER BY w.worker_id ASC""",
        fetchall=True
    ) or []

    return render_template('admin/workers.html', workers=worker_list)


@admin_bp.route('/workers/add', methods=['GET', 'POST'])
@login_required
@role_required('admin')
def add_worker():
    """Register a new sanitation worker (creates user + worker records in a single transaction)."""
    if request.method == 'POST':
        full_name = request.form.get('full_name', '').strip()
        email     = request.form.get('email', '').strip().lower()
        phone     = request.form.get('phone', '').strip()
        password  = request.form.get('password', 'password123')
        joining   = request.form.get('joining_date', datetime.today().strftime('%Y-%m-%d'))

        if not full_name or not email:
            flash('Name and Email are required.', 'danger')
            return render_template('admin/add_worker.html')

        try:
            existing = execute_query("SELECT user_id FROM users WHERE email = %s", (email,), fetchone=True)
            if existing:
                flash('An account with this email already exists.', 'danger')
                return render_template('admin/add_worker.html')

            pw_hash = generate_password_hash(password)
            
            # Execute atomic user + worker creation
            user_id = execute_query(
                """INSERT INTO users (full_name, email, phone, password_hash, role, is_active)
                   VALUES (%s, %s, %s, %s, 'worker', TRUE)""",
                (full_name, email, phone, pw_hash),
                commit=False
            )
            execute_query(
                """INSERT INTO workers (user_id, availability_status, joining_date, total_collections)
                   VALUES (%s, 'Available', %s, 0)""",
                (user_id, joining),
                commit=True
            )

            flash(f"Sanitation worker '{full_name}' added successfully.", 'success')
            return redirect(url_for('admin.workers'))
        except Error as e:
            flash(f"Database error while adding worker: {e}", 'danger')

    return render_template('admin/add_worker.html')


@admin_bp.route('/areas')
@login_required
@role_required('admin')
def areas():
    """List collection areas and their request counts."""
    area_list = execute_query(
        """SELECT a.area_id, a.area_name, a.locality, a.postal_code,
                  COUNT(cr.request_id) AS request_count
           FROM areas a
           LEFT JOIN collection_requests cr ON a.area_id = cr.area_id
           GROUP BY a.area_id, a.area_name, a.locality, a.postal_code
           ORDER BY a.area_name ASC""",
        fetchall=True
    ) or []

    return render_template('admin/areas.html', areas=area_list)


@admin_bp.route('/areas/add', methods=['GET', 'POST'])
@login_required
@role_required('admin')
def add_area():
    """Add a new geographic collection area."""
    if request.method == 'POST':
        area_name   = request.form.get('area_name', '').strip()
        locality    = request.form.get('locality', '').strip()
        postal_code = request.form.get('postal_code', '').strip()

        if not area_name or not postal_code:
            flash('Area Name and Postal Code are mandatory.', 'danger')
            return redirect(url_for('admin.areas'))

        try:
            execute_query(
                """INSERT INTO areas (area_name, locality, postal_code)
                   VALUES (%s, %s, %s)""",
                (area_name, locality or None, postal_code),
                commit=True
            )
            flash(f"Area '{area_name}' registered successfully.", 'success')
        except Error as e:
            flash(f"Error adding area: {e}", 'danger')

        return redirect(url_for('admin.areas'))

    return redirect(url_for('admin.areas'))


@admin_bp.route('/areas/<int:area_id>/edit', methods=['POST'])
@login_required
@role_required('admin')
def edit_area(area_id):
    """Update existing area details."""
    area_name   = request.form.get('area_name', '').strip()
    locality    = request.form.get('locality', '').strip()
    postal_code = request.form.get('postal_code', '').strip()

    try:
        execute_query(
            """UPDATE areas
               SET area_name = %s, locality = %s, postal_code = %s
               WHERE area_id = %s""",
            (area_name, locality, postal_code, area_id),
            commit=True
        )
        flash('Area updated successfully.', 'success')
    except Error as e:
        flash(f"Error updating area: {e}", 'danger')

    return redirect(url_for('admin.areas'))


@admin_bp.route('/categories')
@login_required
@role_required('admin')
def categories():
    """Display waste classification categories and segregation rules."""
    cat_list = execute_query(
        """SELECT category_id, category_name, description,
                  segregation_instructions, color_code
           FROM waste_categories
           ORDER BY category_id ASC""",
        fetchall=True
    ) or []

    return render_template('admin/categories.html', categories=cat_list)


@admin_bp.route('/requests')
@login_required
@role_required('admin')
def requests():
    """View and filter all collection requests."""
    status_filter   = request.args.get('status', 'all')
    area_filter     = request.args.get('area_id', 'all')
    category_filter = request.args.get('category_id', 'all')
    start_date      = request.args.get('start_date', '')
    end_date        = request.args.get('end_date', '')
    search_term     = request.args.get('search', '').strip()

    filters = {
        'status': status_filter,
        'area_id': area_filter,
        'category_id': category_filter,
        'start_date': start_date,
        'end_date': end_date,
        'search': search_term
    }

    all_requests = get_all_requests(filters)
    areas_list = execute_query("SELECT area_id, area_name FROM areas ORDER BY area_name", fetchall=True) or []
    categories_list = execute_query("SELECT category_id, category_name FROM waste_categories ORDER BY category_name", fetchall=True) or []

    return render_template('admin/requests.html',
                           requests=all_requests,
                           areas=areas_list,
                           categories=categories_list,
                           filters=filters)


@admin_bp.route('/requests/<int:request_id>')
@login_required
@role_required('admin')
def request_detail(request_id):
    """Detailed view for a specific request with full history and related records."""
    req = get_request_by_id(request_id)
    if not req:
        flash('Collection request not found.', 'danger')
        return redirect(url_for('admin.requests'))

    # Available workers for assignment
    available_workers = get_available_workers() if req['status'] == 'Pending' else []

    # Status history
    history = execute_query(
        """SELECT h.history_id, h.previous_status, h.new_status,
                  h.changed_at, h.remarks, u.full_name AS changed_by_name
           FROM collection_status_history h
           LEFT JOIN users u ON h.changed_by = u.user_id
           WHERE h.request_id = %s
           ORDER BY h.changed_at ASC""",
        (request_id,), fetchall=True
    ) or []

    # Feedback
    feedback_data = execute_query(
        """SELECT f.rating, f.comments, f.submitted_at, u.full_name AS citizen_name
           FROM feedback f
           JOIN users u ON f.citizen_id = u.user_id
           WHERE f.request_id = %s""",
        (request_id,), fetchone=True
    )

    # Segregation records
    segregation_records = execute_query(
        """SELECT sr.segregation_id, sr.quantity_kg, sr.is_correctly_segregated,
                  sr.segregation_status, sr.remarks, sr.recorded_at,
                  wc.category_name, u.full_name AS recorded_by_name
           FROM segregation_records sr
           JOIN waste_categories wc ON sr.category_id = wc.category_id
           LEFT JOIN users u        ON sr.recorded_by  = u.user_id
           WHERE sr.request_id = %s""",
        (request_id,), fetchall=True
    ) or []

    # Recycling records
    recycling_records = execute_query(
        """SELECT rr.recycling_id, rr.quantity_kg, rr.processing_type,
                  rr.destination, rr.processed_at, rr.notes
           FROM recycling_records rr
           WHERE rr.request_id = %s""",
        (request_id,), fetchall=True
    ) or []

    return render_template('admin/request_detail.html',
                           req=req,
                           available_workers=available_workers,
                           history=history,
                           feedback=feedback_data,
                           segregation_records=segregation_records,
                           recycling_records=recycling_records)


@admin_bp.route('/requests/<int:request_id>/assign', methods=['POST'])
@login_required
@role_required('admin')
def assign_request_worker(request_id):
    """Assign an available sanitation worker to a collection request."""
    worker_id = request.form.get('worker_id')
    if not worker_id:
        flash('Please select a valid worker.', 'danger')
        return redirect(url_for('admin.request_detail', request_id=request_id))

    try:
        assign_worker(request_id, int(worker_id), session['user_id'])
        flash('Sanitation worker assigned successfully.', 'success')
    except (ValueError, Error) as e:
        flash(f"Assignment error: {e}", 'danger')

    return redirect(url_for('admin.request_detail', request_id=request_id))


@admin_bp.route('/recycling')
@login_required
@role_required('admin')
def recycling():
    """Recycling and disposal records management."""
    records = execute_query(
        """SELECT rr.recycling_id, rr.request_id, rr.quantity_kg,
                  rr.processing_type, rr.destination, rr.processed_at, rr.notes,
                  wc.category_name, u.full_name AS citizen_name
           FROM recycling_records rr
           JOIN collection_requests cr ON rr.request_id  = cr.request_id
           JOIN waste_categories wc    ON cr.category_id = wc.category_id
           JOIN users u                ON cr.citizen_id  = u.user_id
           ORDER BY rr.processed_at DESC""",
        fetchall=True
    ) or []

    # Completed requests eligible for recycling
    eligible_requests = execute_query(
        """SELECT cr.request_id, cr.actual_quantity_kg,
                  wc.category_name, u.full_name AS citizen_name
           FROM collection_requests cr
           JOIN waste_categories wc ON cr.category_id = wc.category_id
           JOIN users u             ON cr.citizen_id  = u.user_id
           WHERE cr.status IN ('Collected', 'Completed')
           ORDER BY cr.updated_at DESC
           LIMIT 50""",
        fetchall=True
    ) or []

    stats = get_dashboard_stats()
    recycling_breakdown = get_recycling_stats()

    return render_template('admin/recycling.html',
                           records=records,
                           eligible_requests=eligible_requests,
                           stats=stats,
                           breakdown=recycling_breakdown)


@admin_bp.route('/recycling/add', methods=['POST'])
@login_required
@role_required('admin')
def add_recycling_record():
    """Record a recycling or disposal processing event."""
    request_id      = request.form.get('request_id')
    quantity_kg     = request.form.get('quantity_kg')
    processing_type = request.form.get('processing_type', 'Recycling')
    destination     = request.form.get('destination', '').strip()
    notes           = request.form.get('notes', '').strip()

    if not request_id or not quantity_kg:
        flash('Request ID and Quantity are required.', 'danger')
        return redirect(url_for('admin.recycling'))

    try:
        execute_query(
            """INSERT INTO recycling_records
               (request_id, quantity_kg, processing_type, destination, processed_at, notes)
               VALUES (%s, %s, %s, %s, NOW(), %s)""",
            (request_id, quantity_kg, processing_type, destination or None, notes or None),
            commit=True
        )
        flash('Recycling processing record added successfully.', 'success')
    except Error as e:
        flash(f"Error adding recycling record: {e}", 'danger')

    return redirect(url_for('admin.recycling'))


@admin_bp.route('/segregation')
@login_required
@role_required('admin')
def segregation():
    """View waste segregation compliance and verification audits."""
    status_filter = request.args.get('status', 'all')
    query = """
        SELECT sr.segregation_id, sr.request_id, sr.quantity_kg,
               sr.is_correctly_segregated, sr.segregation_status,
               sr.remarks, sr.recorded_at,
               wc.category_name, wc.color_code,
               u.full_name AS recorded_by_name
        FROM segregation_records sr
        JOIN waste_categories wc ON sr.category_id = wc.category_id
        LEFT JOIN users u        ON sr.recorded_by  = u.user_id
        WHERE 1=1
    """
    params = []
    if status_filter != 'all':
        query += " AND sr.segregation_status = %s"
        params.append(status_filter)

    query += " ORDER BY sr.recorded_at DESC"
    records = execute_query(query, tuple(params), fetchall=True) or []

    return render_template('admin/segregation.html',
                           records=records,
                           current_status=status_filter)


@admin_bp.route('/reports')
@login_required
@role_required('admin')
def reports():
    """Comprehensive analytical reporting with date range filtering."""
    start_date = request.args.get('start_date', (datetime.now().replace(day=1)).strftime('%Y-%m-%d'))
    end_date   = request.args.get('end_date', datetime.now().strftime('%Y-%m-%d'))

    collections = get_collection_report(start_date, end_date)
    area_stats  = get_area_stats()
    worker_perf = get_worker_performance()
    cat_dist    = get_category_distribution()
    rec_stats   = get_recycling_stats()

    # Query Views if available
    area_summary = []
    worker_performance_view = []
    monthly_stats_view = []
    try:
        area_summary = execute_query("SELECT * FROM vw_area_waste_summary", fetchall=True) or []
    except Error:
        pass
    try:
        worker_performance_view = execute_query("SELECT * FROM vw_worker_performance", fetchall=True) or []
    except Error:
        pass
    try:
        monthly_stats_view = execute_query("SELECT * FROM vw_monthly_statistics", fetchall=True) or []
    except Error:
        pass

    return render_template('admin/reports.html',
                           collections=collections,
                           area_stats=area_stats,
                           worker_perf=worker_perf,
                           cat_dist=cat_dist,
                           rec_stats=rec_stats,
                           area_summary=area_summary,
                           worker_performance_view=worker_performance_view,
                           monthly_stats_view=monthly_stats_view,
                           start_date=start_date,
                           end_date=end_date)


@admin_bp.route('/reports/download')
@login_required
@role_required('admin')
def download_csv():
    """Export analytical reports as CSV files."""
    report_type = request.args.get('type', 'collections')
    start_date  = request.args.get('start_date')
    end_date    = request.args.get('end_date')

    csv_data, filename = generate_csv_data(report_type, start_date, end_date)
    return Response(
        csv_data,
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment;filename={filename}"}
    )


@admin_bp.route('/dbms-demo')
@login_required
@role_required('admin')
def dbms_demo():
    """
    DBMS Evaluation Demonstration Page.
    Renders live executions of queries, views, procedures, triggers,
    and schema statistics for college viva/project demonstration.
    """
    demo_data = {
        'queries': [
            {
                'title': 'Query 1: Requests with Multi-Table JOIN & Filtering',
                'description': 'Retrieves pending/assigned requests with citizen name, category, and area.',
                'sql': """SELECT cr.request_id, u.full_name AS citizen, wc.category_name, 
       a.area_name, cr.status, cr.estimated_quantity_kg
FROM collection_requests cr
JOIN users u ON cr.citizen_id = u.user_id
JOIN waste_categories wc ON cr.category_id = wc.category_id
LEFT JOIN areas a ON cr.area_id = a.area_id
ORDER BY cr.created_at DESC LIMIT 5;""",
                'results': execute_query(
                    """SELECT cr.request_id, u.full_name AS citizen, wc.category_name, 
                              a.area_name, cr.status, cr.estimated_quantity_kg
                       FROM collection_requests cr
                       JOIN users u ON cr.citizen_id = u.user_id
                       JOIN waste_categories wc ON cr.category_id = wc.category_id
                       LEFT JOIN areas a ON cr.area_id = a.area_id
                       ORDER BY cr.created_at DESC LIMIT 5""",
                    fetchall=True
                ) or []
            },
            {
                'title': 'Query 2: Worker Performance with Aggregation & Grouping',
                'description': 'Calculates tasks handled and average citizen rating per sanitation worker.',
                'sql': """SELECT w.worker_id, u.full_name AS worker_name, w.availability_status,
       COUNT(a.assignment_id) AS total_assignments,
       COALESCE(AVG(f.rating), 0) AS avg_rating
FROM workers w
JOIN users u ON w.user_id = u.user_id
LEFT JOIN assignments a ON w.worker_id = a.worker_id
LEFT JOIN feedback f ON a.request_id = f.request_id
GROUP BY w.worker_id, u.full_name, w.availability_status;""",
                'results': execute_query(
                    """SELECT w.worker_id, u.full_name AS worker_name, w.availability_status,
                              COUNT(a.assignment_id) AS total_assignments,
                              ROUND(COALESCE(AVG(f.rating), 0), 1) AS avg_rating
                       FROM workers w
                       JOIN users u ON w.user_id = u.user_id
                       LEFT JOIN assignments a ON w.worker_id = a.worker_id
                       LEFT JOIN feedback f ON a.request_id = f.request_id
                       GROUP BY w.worker_id, u.full_name, w.availability_status""",
                    fetchall=True
                ) or []
            },
            {
                'title': 'Query 3: Subquery - Requests Exceeding Average Waste Quantity',
                'description': 'Finds collection requests where estimated quantity exceeds the global average.',
                'sql': """SELECT cr.request_id, u.full_name, cr.estimated_quantity_kg, cr.status
FROM collection_requests cr
JOIN users u ON cr.citizen_id = u.user_id
WHERE cr.estimated_quantity_kg > (SELECT AVG(estimated_quantity_kg) FROM collection_requests)
LIMIT 5;""",
                'results': execute_query(
                    """SELECT cr.request_id, u.full_name, cr.estimated_quantity_kg, cr.status
                       FROM collection_requests cr
                       JOIN users u ON cr.citizen_id = u.user_id
                       WHERE cr.estimated_quantity_kg > (SELECT AVG(estimated_quantity_kg) FROM collection_requests)
                       LIMIT 5""",
                    fetchall=True
                ) or []
            },
            {
                'title': 'Query 4: Category-Wise Waste Breakdown with CASE statement',
                'description': 'Classifies categories and aggregates total waste volume.',
                'sql': """SELECT wc.category_name, COUNT(cr.request_id) AS total_requests,
       COALESCE(SUM(cr.actual_quantity_kg), 0) AS total_kg,
       CASE 
           WHEN COALESCE(SUM(cr.actual_quantity_kg), 0) > 100 THEN 'High Volume'
           WHEN COALESCE(SUM(cr.actual_quantity_kg), 0) > 20 THEN 'Medium Volume'
           ELSE 'Low Volume'
       END AS volume_tier
FROM waste_categories wc
LEFT JOIN collection_requests cr ON wc.category_id = cr.category_id
GROUP BY wc.category_id, wc.category_name;""",
                'results': execute_query(
                    """SELECT wc.category_name, COUNT(cr.request_id) AS total_requests,
                              COALESCE(SUM(cr.actual_quantity_kg), 0) AS total_kg,
                              CASE 
                                  WHEN COALESCE(SUM(cr.actual_quantity_kg), 0) > 100 THEN 'High Volume'
                                  WHEN COALESCE(SUM(cr.actual_quantity_kg), 0) > 20 THEN 'Medium Volume'
                                  ELSE 'Low Volume'
                              END AS volume_tier
                       FROM waste_categories wc
                       LEFT JOIN collection_requests cr ON wc.category_id = cr.category_id
                       GROUP BY wc.category_id, wc.category_name""",
                    fetchall=True
                ) or []
            }
        ],
        'views': [
            {
                'name': 'vw_area_waste_summary',
                'description': 'Aggregated operational metrics grouped by service area.',
                'results': execute_query("SELECT * FROM vw_area_waste_summary LIMIT 5", fetchall=True) or []
            },
            {
                'name': 'vw_worker_performance',
                'description': 'Worker metrics tracking assignments, completion, and rating.',
                'results': execute_query("SELECT * FROM vw_worker_performance LIMIT 5", fetchall=True) or []
            },
            {
                'name': 'vw_monthly_statistics',
                'description': 'Chronological monthly collection trends and weights.',
                'results': execute_query("SELECT * FROM vw_monthly_statistics LIMIT 5", fetchall=True) or []
            }
        ],
        'db_stats': {
            'users_count': (execute_query("SELECT COUNT(*) AS c FROM users", fetchone=True) or {}).get('c', 0),
            'requests_count': (execute_query("SELECT COUNT(*) AS c FROM collection_requests", fetchone=True) or {}).get('c', 0),
            'workers_count': (execute_query("SELECT COUNT(*) AS c FROM workers", fetchone=True) or {}).get('c', 0),
            'areas_count': (execute_query("SELECT COUNT(*) AS c FROM areas", fetchone=True) or {}).get('c', 0),
            'segregations_count': (execute_query("SELECT COUNT(*) AS c FROM segregation_records", fetchone=True) or {}).get('c', 0),
            'recycling_count': (execute_query("SELECT COUNT(*) AS c FROM recycling_records", fetchone=True) or {}).get('c', 0),
            'feedback_count': (execute_query("SELECT COUNT(*) AS c FROM feedback", fetchone=True) or {}).get('c', 0),
            'history_count': (execute_query("SELECT COUNT(*) AS c FROM collection_status_history", fetchone=True) or {}).get('c', 0)
        }
    }

    return render_template('admin/dbms_demo.html', demo=demo_data)

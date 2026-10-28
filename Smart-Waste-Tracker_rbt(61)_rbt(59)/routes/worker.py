"""
Smart Waste Collection & Segregation Tracker
Sanitation Worker Routes Blueprint

Features:
- Worker dashboard with operational task stats
- View assigned collection tasks
- Advance collection request status: Assigned -> In Progress -> Collected -> Completed
- Record actual collected waste weight
- Record segregation audit/verification results
- View completed task history and citizen feedback
"""

from flask import Blueprint, render_template, request, redirect, url_for, flash, session
from utils import login_required, role_required
from db import execute_query, execute_transaction
from services.collection_service import get_request_by_id, update_request_status
from services.assignment_service import get_worker_assignments
from mysql.connector import Error

worker_bp = Blueprint('worker', __name__, url_prefix='/worker')


def get_current_worker():
    """Helper to get current worker record from session user_id."""
    user_id = session.get('user_id')
    return execute_query(
        """SELECT w.worker_id, w.user_id, w.availability_status, w.total_collections,
                  u.full_name, u.phone, u.email
           FROM workers w
           JOIN users u ON w.user_id = u.user_id
           WHERE w.user_id = %s""",
        (user_id,), fetchone=True
    )


@worker_bp.route('/dashboard')
@login_required
@role_required('worker')
def dashboard():
    """Sanitation Worker Dashboard."""
    worker = get_current_worker()
    if not worker:
        flash('Worker profile not found for this account.', 'danger')
        return redirect(url_for('auth.logout'))

    worker_id = worker['worker_id']

    # Performance and assignment stats
    stats = execute_query(
        """SELECT 
               COUNT(a.assignment_id) AS total_assigned,
               SUM(CASE WHEN a.assignment_status = 'Active' THEN 1 ELSE 0 END) AS active_tasks,
               SUM(CASE WHEN a.assignment_status = 'Completed' THEN 1 ELSE 0 END) AS completed_tasks,
               (SELECT COALESCE(AVG(f.rating), 0)
                FROM assignments a2
                JOIN feedback f ON a2.request_id = f.request_id
                WHERE a2.worker_id = %s) AS avg_rating
           FROM assignments a
           WHERE a.worker_id = %s""",
        (worker_id, worker_id), fetchone=True
    ) or {}

    # Active tasks currently assigned
    active_tasks = get_worker_assignments(worker_id, status_filter='Active')

    return render_template('worker/dashboard.html',
                           worker=worker,
                           stats=stats,
                           active_tasks=active_tasks)


@worker_bp.route('/tasks')
@login_required
@role_required('worker')
def tasks():
    """View active and assigned pickup tasks."""
    worker = get_current_worker()
    if not worker:
        flash('Worker profile not found.', 'danger')
        return redirect(url_for('auth.logout'))

    status_filter = request.args.get('status', 'Active')
    tasks_list = get_worker_assignments(worker['worker_id'], status_filter=status_filter)

    return render_template('worker/tasks.html',
                           worker=worker,
                           tasks=tasks_list,
                           current_status=status_filter)


@worker_bp.route('/tasks/<int:request_id>')
@login_required
@role_required('worker')
def task_detail(request_id):
    """View details of an assigned task and manage its lifecycle."""
    worker = get_current_worker()
    req = get_request_by_id(request_id)

    if not req:
        flash('Task not found.', 'danger')
        return redirect(url_for('worker.tasks'))

    # Verify worker assignment
    assignment = execute_query(
        """SELECT assignment_id, assignment_status
           FROM assignments
           WHERE request_id = %s AND worker_id = %s""",
        (request_id, worker['worker_id']), fetchone=True
    )
    if not assignment:
        flash('You are not assigned to this task.', 'danger')
        return redirect(url_for('worker.tasks'))

    # Existing segregation records for this request
    segregations = execute_query(
        """SELECT sr.segregation_id, sr.quantity_kg, sr.is_correctly_segregated,
                  sr.segregation_status, sr.remarks, wc.category_name
           FROM segregation_records sr
           JOIN waste_categories wc ON sr.category_id = wc.category_id
           WHERE sr.request_id = %s""",
        (request_id,), fetchall=True
    ) or []

    categories = execute_query(
        "SELECT category_id, category_name FROM waste_categories ORDER BY category_id",
        fetchall=True
    ) or []

    return render_template('worker/task_detail.html',
                           req=req,
                           assignment=assignment,
                           segregations=segregations,
                           categories=categories)


@worker_bp.route('/tasks/<int:request_id>/start', methods=['POST'])
@login_required
@role_required('worker')
def start_task(request_id):
    """Mark task as In Progress (on route to pickup)."""
    user_id = session.get('user_id')
    try:
        update_request_status(request_id, 'In Progress', user_id, remarks='Worker started route for pickup')
        flash('Task status updated to In Progress. Drive safely!', 'info')
    except (ValueError, Error) as e:
        flash(f'Error starting task: {e}', 'danger')

    return redirect(url_for('worker.task_detail', request_id=request_id))


@worker_bp.route('/tasks/<int:request_id>/collect', methods=['POST'])
@login_required
@role_required('worker')
def collect_task(request_id):
    """Record actual measured weight and mark waste as Collected."""
    user_id = session.get('user_id')
    actual_qty_str = request.form.get('actual_quantity_kg')

    if not actual_qty_str:
        flash('Actual collected quantity (kg) is required.', 'danger')
        return redirect(url_for('worker.task_detail', request_id=request_id))

    try:
        actual_qty = float(actual_qty_str)
        if actual_qty < 0:
            flash('Collected weight cannot be negative.', 'danger')
            return redirect(url_for('worker.task_detail', request_id=request_id))

        update_request_status(
            request_id=request_id,
            new_status='Collected',
            user_id=user_id,
            actual_qty=actual_qty,
            remarks=f'Waste collected. Measured weight: {actual_qty} kg'
        )
        flash(f'Waste marked as Collected ({actual_qty} kg recorded).', 'success')

    except (ValueError, Error) as e:
        flash(f'Error updating collection: {e}', 'danger')

    return redirect(url_for('worker.task_detail', request_id=request_id))


@worker_bp.route('/tasks/<int:request_id>/segregation', methods=['POST'])
@login_required
@role_required('worker')
def record_segregation(request_id):
    """Record waste segregation assessment."""
    user_id = session.get('user_id')
    category_id = request.form.get('category_id')
    quantity_kg = request.form.get('quantity_kg')
    is_correct  = request.form.get('is_correctly_segregated')
    status      = request.form.get('segregation_status', 'Verified')
    remarks     = request.form.get('remarks', '').strip()

    if not category_id or not quantity_kg:
        flash('Category and Quantity are required.', 'danger')
        return redirect(url_for('worker.task_detail', request_id=request_id))

    try:
        is_correct_bool = True if is_correct == '1' else (False if is_correct == '0' else None)
        execute_query(
            """INSERT INTO segregation_records
               (request_id, category_id, quantity_kg, is_correctly_segregated,
                segregation_status, recorded_by, recorded_at, remarks)
               VALUES (%s, %s, %s, %s, %s, %s, NOW(), %s)""",
            (request_id, category_id, quantity_kg, is_correct_bool, status, user_id, remarks or None),
            commit=True
        )
        flash('Segregation audit entry recorded successfully.', 'success')
    except Error as e:
        flash(f'Error recording segregation: {e}', 'danger')

    return redirect(url_for('worker.task_detail', request_id=request_id))


@worker_bp.route('/tasks/<int:request_id>/complete', methods=['POST'])
@login_required
@role_required('worker')
def complete_task(request_id):
    """Mark collection request as Completed."""
    user_id = session.get('user_id')
    remarks = request.form.get('remarks', 'Task completed and waste deposited at facility').strip()

    try:
        update_request_status(request_id, 'Completed', user_id, remarks=remarks)
        flash('Task completed successfully! Great job.', 'success')
        return redirect(url_for('worker.tasks'))
    except (ValueError, Error) as e:
        flash(f'Error completing task: {e}', 'danger')

    return redirect(url_for('worker.task_detail', request_id=request_id))


@worker_bp.route('/history')
@login_required
@role_required('worker')
def history():
    """View completed collections history and feedback."""
    worker = get_current_worker()
    if not worker:
        flash('Worker profile not found.', 'danger')
        return redirect(url_for('auth.logout'))

    completed_tasks = execute_query(
        """SELECT cr.request_id, cr.estimated_quantity_kg, cr.actual_quantity_kg,
                  cr.pickup_address, cr.preferred_date, cr.completed_at,
                  wc.category_name, wc.color_code,
                  ar.area_name,
                  u.full_name AS citizen_name,
                  f.rating, f.comments
           FROM assignments a
           JOIN collection_requests cr ON a.request_id  = cr.request_id
           JOIN waste_categories wc    ON cr.category_id = wc.category_id
           LEFT JOIN areas ar          ON cr.area_id     = ar.area_id
           JOIN users u                ON cr.citizen_id  = u.user_id
           LEFT JOIN feedback f        ON cr.request_id  = f.request_id
           WHERE a.worker_id = %s AND a.assignment_status = 'Completed'
           ORDER BY cr.completed_at DESC""",
        (worker['worker_id'],), fetchall=True
    ) or []

    return render_template('worker/history.html',
                           worker=worker,
                           completed_tasks=completed_tasks)


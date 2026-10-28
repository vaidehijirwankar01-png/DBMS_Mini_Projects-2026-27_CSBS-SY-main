"""
Smart Waste Collection & Segregation Tracker
Assignment Service

Business logic for assigning workers to collection requests.
Fully aligned with the relational schema in smart_waste_db.
"""

from db import execute_query, execute_transaction
from mysql.connector import Error


def assign_worker(request_id, worker_id, admin_id):
    """
    Assign a worker to a collection request inside a single transaction.

    Steps:
        1. Verify the request is in 'Pending' status.
        2. Verify the worker is 'Available'.
        3. Insert into assignments table.
        4. Update collection_requests status to 'Assigned'.
        5. Update workers availability_status to 'Busy'.
        6. Log status history.
    """
    req = execute_query(
        "SELECT status FROM collection_requests WHERE request_id = %s",
        (request_id,), fetchone=True
    )
    if not req:
        raise ValueError("Collection request not found.")
    if req['status'] != 'Pending':
        raise ValueError(
            f"Request is '{req['status']}', not 'Pending'. Cannot assign."
        )

    worker = execute_query(
        "SELECT availability_status FROM workers WHERE worker_id = %s",
        (worker_id,), fetchone=True
    )
    if not worker:
        raise ValueError("Worker not found.")
    if worker['availability_status'] != 'Available':
        raise ValueError(
            f"Worker is currently '{worker['availability_status']}'. Only 'Available' workers can be assigned."
        )

    queries = [
        (
            """INSERT INTO assignments
                   (request_id, worker_id, assigned_by, assigned_at, assignment_status)
               VALUES (%s, %s, %s, NOW(), 'Active')""",
            (request_id, worker_id, admin_id)
        ),
        (
            """UPDATE collection_requests
               SET status = 'Assigned', updated_at = NOW()
               WHERE request_id = %s""",
            (request_id,)
        ),
        (
            """UPDATE workers
               SET availability_status = 'Busy'
               WHERE worker_id = %s""",
            (worker_id,)
        ),
        (
            """INSERT INTO collection_status_history
               (request_id, previous_status, new_status, changed_by, changed_at, remarks)
               VALUES (%s, 'Pending', 'Assigned', %s, NOW(), %s)""",
            (request_id, admin_id, f"Assigned to worker ID: {worker_id}")
        ),
    ]
    execute_transaction(queries)
    return True


def get_worker_assignments(worker_id, status_filter=None):
    """
    Get all assignments for a given worker.
    """
    query = """
        SELECT a.assignment_id, a.request_id, a.assigned_at,
               a.assignment_status,
               cr.estimated_quantity_kg, cr.actual_quantity_kg,
               cr.pickup_address, cr.preferred_date, cr.status AS request_status,
               cr.notes,
               wc.category_name, wc.color_code,
               ar.area_name, ar.locality,
               u.full_name AS citizen_name, u.phone AS citizen_phone
        FROM assignments a
        JOIN collection_requests cr ON a.request_id   = cr.request_id
        JOIN waste_categories wc    ON cr.category_id  = wc.category_id
        LEFT JOIN areas ar          ON cr.area_id      = ar.area_id
        JOIN users u                ON cr.citizen_id   = u.user_id
        WHERE a.worker_id = %s
    """
    params = [worker_id]

    if status_filter and status_filter != 'all':
        query += " AND a.assignment_status = %s"
        params.append(status_filter)

    query += " ORDER BY a.assigned_at DESC"
    return execute_query(query, tuple(params), fetchall=True) or []


def get_available_workers():
    """
    Get all workers whose availability_status is 'Available'.
    """
    query = """
        SELECT w.worker_id, w.availability_status, w.total_collections,
               u.full_name, u.email, u.phone
        FROM workers w
        JOIN users u ON w.user_id = u.user_id
        WHERE w.availability_status = 'Available'
          AND u.is_active = 1
        ORDER BY u.full_name
    """
    return execute_query(query, fetchall=True) or []


def complete_assignment(assignment_id):
    """
    Mark an assignment as completed and free the worker.
    """
    asg = execute_query(
        "SELECT worker_id, assignment_status FROM assignments WHERE assignment_id = %s",
        (assignment_id,), fetchone=True
    )
    if not asg:
        raise ValueError("Assignment not found.")

    queries = [
        (
            """UPDATE assignments
               SET assignment_status = 'Completed'
               WHERE assignment_id = %s""",
            (assignment_id,)
        ),
        (
            """UPDATE workers
               SET availability_status = 'Available'
               WHERE worker_id = %s""",
            (asg['worker_id'],)
        ),
    ]
    execute_transaction(queries)
    return True

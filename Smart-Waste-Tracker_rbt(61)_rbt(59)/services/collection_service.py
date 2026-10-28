"""
Smart Waste Collection & Segregation Tracker
Collection Service

Business logic for collection requests: CRUD, status transitions, validation.
Fully aligned with the relational schema in smart_waste_db.
"""

from db import execute_query, execute_transaction
from mysql.connector import Error
from datetime import datetime


# Valid status transitions
_VALID_TRANSITIONS = {
    'Pending':     ['Assigned', 'Cancelled'],
    'Assigned':    ['In Progress', 'Cancelled'],
    'In Progress': ['Collected'],
    'Collected':   ['Completed'],
}


def get_valid_transitions():
    """Return the dict of valid status transitions."""
    return dict(_VALID_TRANSITIONS)


def get_request_by_id(request_id):
    """
    Get full details for a single collection request, including
    citizen name, category name, area name, and assignment info.
    """
    query = """
        SELECT cr.request_id, cr.citizen_id, cr.category_id, cr.area_id,
               cr.estimated_quantity_kg, cr.actual_quantity_kg, cr.pickup_address,
               cr.preferred_date, cr.status, cr.notes,
               cr.created_at, cr.updated_at, cr.completed_at,
               u.full_name   AS citizen_name,
               u.email       AS citizen_email,
               u.phone       AS citizen_phone,
               wc.category_name,
               wc.description AS category_description,
               wc.segregation_instructions,
               wc.color_code,
               a.area_name,
               a.locality,
               a.postal_code,
               asg.assignment_id,
               asg.worker_id,
               asg.assigned_at,
               asg.assignment_status,
               wu.full_name  AS worker_name,
               wu.phone      AS worker_phone
        FROM collection_requests cr
        JOIN users u             ON cr.citizen_id  = u.user_id
        JOIN waste_categories wc ON cr.category_id = wc.category_id
        LEFT JOIN areas a        ON cr.area_id     = a.area_id
        LEFT JOIN assignments asg ON cr.request_id = asg.request_id AND asg.assignment_status IN ('Active', 'Completed')
        LEFT JOIN workers w      ON asg.worker_id  = w.worker_id
        LEFT JOIN users wu       ON w.user_id      = wu.user_id
        WHERE cr.request_id = %s
    """
    return execute_query(query, (request_id,), fetchone=True)


def create_request(citizen_id, category_id, area_id, quantity, address,
                   preferred_date, notes=None):
    """
    Insert a new collection request and log to status history.
    """
    req_query = """
        INSERT INTO collection_requests
            (citizen_id, category_id, area_id, estimated_quantity_kg, pickup_address,
             preferred_date, notes, status, created_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, 'Pending', NOW())
    """
    params = (citizen_id, category_id, area_id, quantity, address,
              preferred_date, notes)
    request_id = execute_query(req_query, params, commit=True)

    if request_id:
        execute_query(
            """INSERT INTO collection_status_history
               (request_id, previous_status, new_status, changed_by, changed_at, remarks)
               VALUES (%s, NULL, 'Pending', %s, NOW(), 'Request created by citizen')""",
            (request_id, citizen_id), commit=True
        )

    return request_id


def update_request_status(request_id, new_status, user_id,
                          actual_qty=None, remarks=None):
    """
    Update request lifecycle status with strict transition validation.
    """
    current = execute_query(
        "SELECT status FROM collection_requests WHERE request_id = %s",
        (request_id,), fetchone=True
    )
    if not current:
        raise ValueError("Collection request not found.")

    current_status = current['status']
    allowed = _VALID_TRANSITIONS.get(current_status, [])
    if new_status not in allowed:
        raise ValueError(
            f"Cannot transition from '{current_status}' to '{new_status}'. Allowed: {allowed}"
        )

    queries = []

    # Update collection request
    if new_status == 'Collected':
        queries.append((
            """UPDATE collection_requests
               SET status = %s, actual_quantity_kg = %s, updated_at = NOW()
               WHERE request_id = %s""",
            (new_status, actual_qty, request_id)
        ))
    elif new_status == 'Completed':
        queries.append((
            """UPDATE collection_requests
               SET status = %s, completed_at = NOW(), updated_at = NOW()
               WHERE request_id = %s""",
            (new_status, request_id)
        ))
        # Complete active assignment
        queries.append((
            """UPDATE assignments
               SET assignment_status = 'Completed'
               WHERE request_id = %s AND assignment_status = 'Active'""",
            (request_id,)
        ))
        # Free worker
        queries.append((
            """UPDATE workers
               SET availability_status = 'Available',
                   total_collections = total_collections + 1
               WHERE worker_id IN (
                   SELECT worker_id FROM assignments 
                   WHERE request_id = %s AND assignment_status = 'Completed'
               )""",
            (request_id,)
        ))
    elif new_status == 'Cancelled':
        queries.append((
            """UPDATE collection_requests
               SET status = %s, updated_at = NOW()
               WHERE request_id = %s""",
            (new_status, request_id)
        ))
        queries.append((
            """UPDATE assignments
               SET assignment_status = 'Cancelled'
               WHERE request_id = %s AND assignment_status = 'Active'""",
            (request_id,)
        ))
        queries.append((
            """UPDATE workers
               SET availability_status = 'Available'
               WHERE worker_id IN (
                   SELECT worker_id FROM assignments 
                   WHERE request_id = %s AND assignment_status = 'Cancelled'
               )""",
            (request_id,)
        ))
    else:
        queries.append((
            """UPDATE collection_requests
               SET status = %s, updated_at = NOW()
               WHERE request_id = %s""",
            (new_status, request_id)
        ))

    # Log into history
    queries.append((
        """INSERT INTO collection_status_history
           (request_id, previous_status, new_status, changed_by, changed_at, remarks)
           VALUES (%s, %s, %s, %s, NOW(), %s)""",
        (request_id, current_status, new_status, user_id, remarks or f'Status updated to {new_status}')
    ))

    execute_transaction(queries)
    return True


def get_citizen_requests(citizen_id, status_filter=None):
    """
    Get all collection requests for a citizen.
    """
    query = """
        SELECT cr.request_id, cr.estimated_quantity_kg, cr.actual_quantity_kg,
               cr.pickup_address, cr.preferred_date, cr.status,
               cr.created_at, cr.completed_at, cr.notes,
               wc.category_name, wc.color_code,
               a.area_name
        FROM collection_requests cr
        JOIN waste_categories wc ON cr.category_id = wc.category_id
        LEFT JOIN areas a        ON cr.area_id     = a.area_id
        WHERE cr.citizen_id = %s
    """
    params = [citizen_id]

    if status_filter and status_filter != 'all':
        query += " AND cr.status = %s"
        params.append(status_filter)

    query += " ORDER BY cr.created_at DESC"
    return execute_query(query, tuple(params), fetchall=True) or []


def get_all_requests(filters=None):
    """
    Get collection requests with multi-field search and filter capabilities.
    """
    query = """
        SELECT cr.request_id, cr.estimated_quantity_kg, cr.actual_quantity_kg,
               cr.pickup_address, cr.preferred_date, cr.status,
               cr.created_at, cr.completed_at, cr.notes,
               u.full_name  AS citizen_name,
               wc.category_name, wc.color_code,
               a.area_name,
               wu.full_name AS assigned_worker_name
        FROM collection_requests cr
        JOIN users u             ON cr.citizen_id  = u.user_id
        JOIN waste_categories wc ON cr.category_id = wc.category_id
        LEFT JOIN areas a        ON cr.area_id     = a.area_id
        LEFT JOIN assignments asg ON cr.request_id = asg.request_id AND asg.assignment_status = 'Active'
        LEFT JOIN workers w      ON asg.worker_id  = w.worker_id
        LEFT JOIN users wu       ON w.user_id      = wu.user_id
        WHERE 1=1
    """
    params = []

    if filters:
        if filters.get('status') and filters['status'] != 'all':
            query += " AND cr.status = %s"
            params.append(filters['status'])

        if filters.get('area_id') and str(filters['area_id']) != 'all':
            query += " AND cr.area_id = %s"
            params.append(filters['area_id'])

        if filters.get('category_id') and str(filters['category_id']) != 'all':
            query += " AND cr.category_id = %s"
            params.append(filters['category_id'])

        if filters.get('start_date'):
            query += " AND cr.created_at >= %s"
            params.append(filters['start_date'])

        if filters.get('end_date'):
            query += " AND cr.created_at <= %s"
            params.append(filters['end_date'] + ' 23:59:59')

        if filters.get('search'):
            query += " AND (u.full_name LIKE %s OR cr.pickup_address LIKE %s)"
            search_term = f"%{filters['search']}%"
            params.extend([search_term, search_term])

    query += " ORDER BY cr.created_at DESC"
    return execute_query(query, tuple(params), fetchall=True) or []


def cancel_request(request_id, citizen_id):
    """
    Cancel request if pending and citizen owns it.
    """
    req = execute_query(
        "SELECT status, citizen_id FROM collection_requests WHERE request_id = %s",
        (request_id,), fetchone=True
    )
    if not req:
        raise ValueError("Request not found.")
    if req['citizen_id'] != citizen_id:
        raise ValueError("You can only cancel your own requests.")
    if req['status'] not in ('Pending',):
        raise ValueError(
            f"Cannot cancel a request with status '{req['status']}'. Only Pending requests can be cancelled."
        )

    return update_request_status(request_id, 'Cancelled', citizen_id, remarks='Cancelled by citizen')

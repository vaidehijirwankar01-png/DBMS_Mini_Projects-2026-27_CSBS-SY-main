"""
Smart Waste Collection & Segregation Tracker
Reporting Service

Aggregation queries and data generators for dashboards, charts, and CSV exports.
Fully aligned with the relational schema in smart_waste_db.
"""

import csv
import io
from db import execute_query
from mysql.connector import Error
from datetime import datetime, timedelta


def get_dashboard_stats():
    """
    Compute high-level statistics for the admin dashboard.
    """
    stats = {}

    # Request counts by status
    rows = execute_query(
        """SELECT status, COUNT(*) AS cnt
           FROM collection_requests
           GROUP BY status""",
        fetchall=True
    ) or []

    status_map = {r['status']: r['cnt'] for r in rows}
    stats['total_requests'] = sum(status_map.values())
    stats['pending']     = status_map.get('Pending', 0)
    stats['assigned']    = status_map.get('Assigned', 0)
    stats['in_progress'] = status_map.get('In Progress', 0)
    stats['collected']   = status_map.get('Collected', 0)
    stats['completed']   = status_map.get('Completed', 0)
    stats['cancelled']   = status_map.get('Cancelled', 0)

    # Total waste collected
    row = execute_query(
        """SELECT COALESCE(SUM(actual_quantity_kg), 0) AS total
           FROM collection_requests
           WHERE status IN ('Collected', 'Completed')""",
        fetchone=True
    )
    stats['total_waste_kg'] = float(row['total']) if row and row['total'] else 0.0

    # Recycling percentage
    try:
        rec = execute_query(
            """SELECT
                 COALESCE(SUM(quantity_kg), 0) AS recycled,
                 (SELECT COALESCE(SUM(actual_quantity_kg), 0)
                  FROM collection_requests
                  WHERE status IN ('Collected', 'Completed')) AS total_collected
               FROM recycling_records""",
            fetchone=True
        )
        if rec and rec['total_collected'] and float(rec['total_collected']) > 0:
            stats['recycling_pct'] = round(
                float(rec['recycled']) / float(rec['total_collected']) * 100, 1
            )
        else:
            stats['recycling_pct'] = 0.0
    except Error:
        stats['recycling_pct'] = 0.0

    # User and worker counts
    uc = execute_query(
        "SELECT COUNT(*) AS cnt FROM users WHERE is_active = 1",
        fetchone=True
    )
    stats['total_users'] = uc['cnt'] if uc else 0

    wc = execute_query(
        "SELECT COUNT(*) AS cnt FROM workers",
        fetchone=True
    )
    stats['total_workers'] = wc['cnt'] if wc else 0

    return stats


def get_monthly_data(months=6):
    """
    Get monthly collection totals for the last N months.
    """
    query = """
        SELECT DATE_FORMAT(created_at, '%%Y-%%m') AS month_label,
               COUNT(*)                            AS request_count,
               COALESCE(SUM(actual_quantity_kg), 0) AS total_kg
        FROM collection_requests
        WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL %s MONTH)
        GROUP BY month_label
        ORDER BY month_label ASC
    """
    return execute_query(query, (months,), fetchall=True) or []


def get_category_distribution():
    """
    Get request count and total weight per waste category.
    """
    query = """
        SELECT wc.category_name, wc.color_code,
               COUNT(cr.request_id) AS request_count,
               COALESCE(SUM(cr.actual_quantity_kg), 0) AS total_kg
        FROM waste_categories wc
        LEFT JOIN collection_requests cr ON wc.category_id = cr.category_id
        GROUP BY wc.category_id, wc.category_name, wc.color_code
        ORDER BY request_count DESC
    """
    return execute_query(query, fetchall=True) or []


def get_area_stats():
    """
    Get request count and total weight per area.
    """
    query = """
        SELECT a.area_name, a.locality, a.postal_code,
               COUNT(cr.request_id) AS request_count,
               COALESCE(SUM(cr.actual_quantity_kg), 0) AS total_kg
        FROM areas a
        LEFT JOIN collection_requests cr ON a.area_id = cr.area_id
        GROUP BY a.area_id, a.area_name, a.locality, a.postal_code
        ORDER BY request_count DESC
    """
    return execute_query(query, fetchall=True) or []


def get_worker_performance():
    """
    Get performance metrics for each worker.
    """
    query = """
        SELECT w.worker_id, u.full_name AS worker_name, u.phone,
               w.availability_status, w.total_collections,
               COUNT(a.assignment_id) AS total_assigned,
               SUM(CASE WHEN a.assignment_status = 'Completed' THEN 1 ELSE 0 END) AS completed_tasks,
               COALESCE(AVG(f.rating), 0) AS avg_rating
        FROM workers w
        JOIN users u             ON w.user_id     = u.user_id
        LEFT JOIN assignments a   ON w.worker_id   = a.worker_id
        LEFT JOIN feedback f      ON a.request_id  = f.request_id
        GROUP BY w.worker_id, u.full_name, u.phone, w.availability_status, w.total_collections
        ORDER BY completed_tasks DESC
    """
    return execute_query(query, fetchall=True) or []


def get_collection_report(start_date, end_date):
    """
    Filtered collection report between two dates.
    """
    query = """
        SELECT cr.request_id, u.full_name AS citizen_name,
               wc.category_name, a.area_name,
               cr.estimated_quantity_kg, cr.actual_quantity_kg,
               cr.status, cr.created_at, cr.preferred_date, cr.completed_at
        FROM collection_requests cr
        JOIN users u             ON cr.citizen_id  = u.user_id
        JOIN waste_categories wc ON cr.category_id = wc.category_id
        LEFT JOIN areas a        ON cr.area_id     = a.area_id
        WHERE DATE(cr.created_at) BETWEEN %s AND %s
        ORDER BY cr.created_at DESC
    """
    return execute_query(
        query, (start_date, end_date), fetchall=True
    ) or []


def get_recycling_stats():
    """
    Get aggregated recycling statistics.
    """
    query = """
        SELECT rr.processing_type,
               COALESCE(SUM(rr.quantity_kg), 0) AS total_kg,
               COUNT(rr.recycling_id) AS record_count
        FROM recycling_records rr
        GROUP BY rr.processing_type
        ORDER BY total_kg DESC
    """
    return execute_query(query, fetchall=True) or []


def generate_csv_data(report_type, start_date=None, end_date=None):
    """
    Generate CSV text for a given report type.
    """
    output = io.StringIO()
    writer = csv.writer(output)
    today = datetime.now().strftime('%Y%m%d')

    if report_type == 'collections':
        if not start_date:
            start_date = (datetime.now() - timedelta(days=365)).strftime('%Y-%m-%d')
        if not end_date:
            end_date = datetime.now().strftime('%Y-%m-%d')

        rows = get_collection_report(start_date, end_date)
        writer.writerow([
            'Request ID', 'Citizen', 'Category', 'Area',
            'Estimated Qty (kg)', 'Actual Qty (kg)', 'Status',
            'Created Date', 'Preferred Date', 'Completed Date'
        ])
        for r in rows:
            writer.writerow([
                r['request_id'], r['citizen_name'], r['category_name'],
                r.get('area_name', ''), r['estimated_quantity_kg'],
                r.get('actual_quantity_kg', '') or 'N/A', r['status'],
                r['created_at'], r.get('preferred_date', ''),
                r.get('completed_at', '') or 'N/A'
            ])
        filename = f'collections_report_{today}.csv'

    elif report_type == 'areas':
        rows = get_area_stats()
        writer.writerow(['Area Name', 'Locality', 'Postal Code', 'Request Count', 'Total Waste (kg)'])
        for r in rows:
            writer.writerow([
                r['area_name'], r.get('locality', ''), r.get('postal_code', ''),
                r['request_count'], float(r['total_kg'])
            ])
        filename = f'area_report_{today}.csv'

    elif report_type == 'workers':
        rows = get_worker_performance()
        writer.writerow([
            'Worker Name', 'Phone', 'Availability', 'Total Assigned', 'Completed Tasks', 'Avg Rating'
        ])
        for r in rows:
            writer.writerow([
                r['worker_name'], r.get('phone', ''), r['availability_status'],
                r['total_assigned'], r['completed_tasks'], round(float(r['avg_rating']), 2)
            ])
        filename = f'worker_report_{today}.csv'

    elif report_type == 'categories':
        rows = get_category_distribution()
        writer.writerow(['Category', 'Request Count', 'Total Waste (kg)'])
        for r in rows:
            writer.writerow([
                r['category_name'], r['request_count'],
                float(r['total_kg'])
            ])
        filename = f'category_report_{today}.csv'

    else:
        writer.writerow(['Error', f'Unknown report type: {report_type}'])
        filename = f'error_report_{today}.csv'

    csv_string = output.getvalue()
    output.close()
    return csv_string, filename

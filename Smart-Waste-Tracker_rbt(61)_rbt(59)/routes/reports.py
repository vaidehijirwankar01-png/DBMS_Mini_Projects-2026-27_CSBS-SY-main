"""
Smart Waste Collection & Segregation Tracker
Reports & Analytics API Blueprint

Provides JSON endpoints for dynamic charts (Chart.js) and dashboards.
"""

from flask import Blueprint, jsonify, request
from utils import login_required, role_required
from services.reporting_service import (
    get_dashboard_stats, get_monthly_data, get_category_distribution,
    get_area_stats, get_worker_performance, get_recycling_stats
)

reports_bp = Blueprint('reports', __name__, url_prefix='/reports')


@reports_bp.route('/api/dashboard-stats')
@login_required
@role_required('admin')
def api_dashboard_stats():
    """Return JSON stats for dashboard cards."""
    stats = get_dashboard_stats()
    return jsonify(stats)


@reports_bp.route('/api/monthly-trends')
@login_required
@role_required('admin')
def api_monthly_trends():
    """Return monthly collection totals for bar/line charts."""
    months = request.args.get('months', 6, type=int)
    data = get_monthly_data(months)
    
    labels = [d['month_label'] for d in data]
    requests = [d['request_count'] for d in data]
    weights = [float(d['total_kg']) for d in data]

    return jsonify({
        'labels': labels,
        'requests': requests,
        'weights': weights
    })


@reports_bp.route('/api/category-distribution')
@login_required
@role_required('admin')
def api_category_distribution():
    """Return waste distribution by category for doughnut/pie charts."""
    data = get_category_distribution()
    labels = [d['category_name'] for d in data]
    colors = [d.get('color_code') or '#28a745' for d in data]
    counts = [d['request_count'] for d in data]
    weights = [float(d['total_kg']) for d in data]

    return jsonify({
        'labels': labels,
        'colors': colors,
        'counts': counts,
        'weights': weights
    })


@reports_bp.route('/api/area-stats')
@login_required
@role_required('admin')
def api_area_stats():
    """Return area-wise collection counts and weights."""
    data = get_area_stats()
    labels = [d['area_name'] for d in data]
    counts = [d['request_count'] for d in data]
    weights = [float(d['total_kg']) for d in data]

    return jsonify({
        'labels': labels,
        'counts': counts,
        'weights': weights
    })


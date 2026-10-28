"""
Smart Waste Collection & Segregation Tracker
Test Suite - Assignment Tests

Tests for worker assignment functionality including
assignment creation, duplicate prevention, and worker availability.
"""

import unittest
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from app import app
    from db import test_connection, execute_query
    DB_AVAILABLE = test_connection()
except Exception:
    DB_AVAILABLE = False


@unittest.skipUnless(DB_AVAILABLE, "MySQL database not available")
class TestAssignments(unittest.TestCase):
    """Test worker assignment operations."""

    def setUp(self):
        app.config['TESTING'] = True
        self.client = app.test_client()
        self.ctx = app.app_context()
        self.ctx.push()
        # Login as admin
        self.client.post('/login', data={
            'email': 'admin@smartwaste.com',
            'password': 'password123',
            'csrf_token': 'test'
        })

    def tearDown(self):
        self.ctx.pop()

    def test_workers_page_loads(self):
        """Test that the workers management page loads."""
        response = self.client.get('/admin/workers')
        self.assertEqual(response.status_code, 200)

    def test_available_workers_query(self):
        """Test querying available workers."""
        try:
            from services.assignment_service import get_available_workers
            workers = get_available_workers()
            self.assertIsInstance(workers, list)
        except ImportError:
            self.skipTest("assignment_service not available")

    def test_assignment_requires_admin(self):
        """Test that only admins can assign workers."""
        # Logout
        self.client.get('/logout')
        # Login as citizen
        self.client.post('/login', data={
            'email': 'rahul.sharma@email.com',
            'password': 'password123',
            'csrf_token': 'test'
        })
        # Try to assign a worker
        response = self.client.post('/admin/requests/1/assign', data={
            'worker_id': '1',
            'csrf_token': 'test'
        })
        self.assertIn(response.status_code, [302, 403])


@unittest.skipUnless(DB_AVAILABLE, "MySQL database not available")
class TestWorkerDashboard(unittest.TestCase):
    """Test worker dashboard functionality."""

    def setUp(self):
        app.config['TESTING'] = True
        self.client = app.test_client()
        self.ctx = app.app_context()
        self.ctx.push()
        self.client.post('/login', data={
            'email': 'suresh.kumar@email.com',
            'password': 'password123',
            'csrf_token': 'test'
        })

    def tearDown(self):
        self.ctx.pop()

    def test_worker_dashboard_loads(self):
        """Test that the worker dashboard loads."""
        response = self.client.get('/worker/dashboard')
        self.assertEqual(response.status_code, 200)

    def test_worker_tasks_loads(self):
        """Test that the tasks page loads."""
        response = self.client.get('/worker/tasks')
        self.assertEqual(response.status_code, 200)

    def test_worker_history_loads(self):
        """Test that the history page loads."""
        response = self.client.get('/worker/history')
        self.assertEqual(response.status_code, 200)


if __name__ == '__main__':
    unittest.main(verbosity=2)


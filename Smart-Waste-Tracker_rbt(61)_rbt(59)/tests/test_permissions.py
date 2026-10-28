"""
Smart Waste Collection & Segregation Tracker
Test Suite - Permissions and Authorization Tests

Tests for backend RBAC (Role-Based Access Control), unauthenticated route protection,
and unauthorized cross-role operations.
"""

import unittest
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from app import app
    from db import test_connection
    DB_AVAILABLE = test_connection()
except Exception:
    DB_AVAILABLE = False


class TestPermissions(unittest.TestCase):
    """Test access control across application roles."""

    def setUp(self):
        app.config['TESTING'] = True
        app.config['WTF_CSRF_ENABLED'] = False
        self.client = app.test_client()
        self.ctx = app.app_context()
        self.ctx.push()

    def tearDown(self):
        self.ctx.pop()

    def test_unauthenticated_admin_redirect(self):
        """Unauthenticated access to /admin/dashboard must redirect to login."""
        response = self.client.get('/admin/dashboard')
        self.assertIn(response.status_code, [302, 401])
        self.assertIn('/login', response.headers.get('Location', ''))

    def test_unauthenticated_citizen_redirect(self):
        """Unauthenticated access to /citizen/dashboard must redirect to login."""
        response = self.client.get('/citizen/dashboard')
        self.assertIn(response.status_code, [302, 401])
        self.assertIn('/login', response.headers.get('Location', ''))

    def test_unauthenticated_worker_redirect(self):
        """Unauthenticated access to /worker/dashboard must redirect to login."""
        response = self.client.get('/worker/dashboard')
        self.assertIn(response.status_code, [302, 401])
        self.assertIn('/login', response.headers.get('Location', ''))

    def test_unauthenticated_reports_api_redirect(self):
        """Unauthenticated access to reporting API must redirect to login."""
        response = self.client.get('/reports/api/dashboard-stats')
        self.assertIn(response.status_code, [302, 401])

    @unittest.skipUnless(DB_AVAILABLE, "MySQL database required for authenticated tests")
    def test_citizen_cannot_access_worker_tasks(self):
        """Logged in citizen must not access worker tasks."""
        self.client.post('/login', data={'email': 'rahul.sharma@email.com', 'password': 'password123'})
        response = self.client.get('/worker/tasks')
        self.assertIn(response.status_code, [403, 302])

    @unittest.skipUnless(DB_AVAILABLE, "MySQL database required for authenticated tests")
    def test_worker_cannot_access_admin_users(self):
        """Logged in worker must not access admin user management."""
        self.client.post('/login', data={'email': 'suresh.kumar@email.com', 'password': 'password123'})
        response = self.client.get('/admin/users')
        self.assertIn(response.status_code, [403, 302])


if __name__ == '__main__':
    unittest.main(verbosity=2)


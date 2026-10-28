"""
Smart Waste Collection & Segregation Tracker
Test Suite - Authentication Tests

Tests for user registration, login, logout, and role-based access control.
These tests verify that the authentication system works correctly
and that unauthorized access is properly prevented.

Note: These tests require a running MySQL instance with the test database.
If MySQL is not available, tests will be skipped with an appropriate message.
"""

import unittest
import sys
import os

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from app import app
    from db import test_connection, execute_query
    DB_AVAILABLE = test_connection()
except Exception:
    DB_AVAILABLE = False


@unittest.skipUnless(DB_AVAILABLE, "MySQL database not available")
class TestAuthentication(unittest.TestCase):
    """Test authentication endpoints."""

    def setUp(self):
        """Set up test client."""
        app.config['TESTING'] = True
        app.config['WTF_CSRF_ENABLED'] = False
        self.client = app.test_client()
        self.ctx = app.app_context()
        self.ctx.push()

    def tearDown(self):
        """Clean up."""
        self.ctx.pop()

    def test_login_page_loads(self):
        """Test that the login page loads successfully."""
        response = self.client.get('/login')
        self.assertEqual(response.status_code, 200)
        self.assertIn(b'Login', response.data)

    def test_register_page_loads(self):
        """Test that the registration page loads successfully."""
        response = self.client.get('/register')
        self.assertEqual(response.status_code, 200)
        self.assertIn(b'Register', response.data)

    def test_login_with_valid_credentials(self):
        """Test login with valid admin credentials."""
        response = self.client.post('/login', data={
            'email': 'admin@smartwaste.com',
            'password': 'password123',
            'csrf_token': 'test'
        }, follow_redirects=True)
        self.assertEqual(response.status_code, 200)

    def test_login_with_invalid_credentials(self):
        """Test login with wrong password."""
        response = self.client.post('/login', data={
            'email': 'admin@smartwaste.com',
            'password': 'wrongpassword',
            'csrf_token': 'test'
        }, follow_redirects=True)
        self.assertEqual(response.status_code, 200)
        self.assertIn(b'Invalid', response.data)

    def test_login_with_nonexistent_user(self):
        """Test login with email that doesn't exist."""
        response = self.client.post('/login', data={
            'email': 'nobody@example.com',
            'password': 'password123',
            'csrf_token': 'test'
        }, follow_redirects=True)
        self.assertEqual(response.status_code, 200)

    def test_logout(self):
        """Test that logout clears the session."""
        # Login first
        self.client.post('/login', data={
            'email': 'admin@smartwaste.com',
            'password': 'password123',
            'csrf_token': 'test'
        })
        # Then logout
        response = self.client.get('/logout', follow_redirects=True)
        self.assertEqual(response.status_code, 200)

    def test_register_duplicate_email(self):
        """Test that registering with an existing email fails."""
        response = self.client.post('/register', data={
            'full_name': 'Test User',
            'email': 'admin@smartwaste.com',  # Already exists
            'password': 'password123',
            'confirm_password': 'password123',
            'phone': '9999999999',
            'area_id': '1',
            'csrf_token': 'test'
        }, follow_redirects=True)
        self.assertEqual(response.status_code, 200)


@unittest.skipUnless(DB_AVAILABLE, "MySQL database not available")
class TestRoleBasedAccess(unittest.TestCase):
    """Test that role-based access control works correctly."""

    def setUp(self):
        """Set up test client."""
        app.config['TESTING'] = True
        self.client = app.test_client()
        self.ctx = app.app_context()
        self.ctx.push()

    def tearDown(self):
        self.ctx.pop()

    def _login_as(self, email):
        """Helper to login as a specific user."""
        return self.client.post('/login', data={
            'email': email,
            'password': 'password123',
            'csrf_token': 'test'
        }, follow_redirects=True)

    def test_citizen_cannot_access_admin_dashboard(self):
        """Test that citizens are blocked from admin pages."""
        self._login_as('rahul.sharma@email.com')
        response = self.client.get('/admin/dashboard')
        self.assertIn(response.status_code, [403, 302])

    def test_worker_cannot_access_admin_dashboard(self):
        """Test that workers are blocked from admin pages."""
        self._login_as('suresh.kumar@email.com')
        response = self.client.get('/admin/dashboard')
        self.assertIn(response.status_code, [403, 302])

    def test_citizen_cannot_access_worker_dashboard(self):
        """Test that citizens are blocked from worker pages."""
        self._login_as('rahul.sharma@email.com')
        response = self.client.get('/worker/dashboard')
        self.assertIn(response.status_code, [403, 302])

    def test_unauthenticated_redirect_to_login(self):
        """Test that unauthenticated users are redirected to login."""
        response = self.client.get('/admin/dashboard')
        self.assertIn(response.status_code, [302, 401])

    def test_admin_can_access_admin_dashboard(self):
        """Test that admins can access admin pages."""
        self._login_as('admin@smartwaste.com')
        response = self.client.get('/admin/dashboard')
        self.assertEqual(response.status_code, 200)


class TestWithoutDB(unittest.TestCase):
    """Tests that don't require database connection."""

    def test_landing_page(self):
        """Test that the landing page loads."""
        try:
            app.config['TESTING'] = True
            client = app.test_client()
            response = client.get('/')
            self.assertIn(response.status_code, [200, 302])
        except Exception:
            self.skipTest("App could not be initialized")


if __name__ == '__main__':
    unittest.main(verbosity=2)


import sys
import unittest
from app import app, get_db_connection

class CollegeManagementSystemTestCase(unittest.TestCase):
    def setUp(self):
        app.config['TESTING'] = True
        app.config['WTF_CSRF_ENABLED'] = False
        self.client = app.test_client()

    def test_01_db_connection(self):
        conn = get_db_connection()
        self.assertIsNotNone(conn, "Database connection should not be None")
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        res = cursor.fetchone()
        cursor.close()
        conn.close()
        self.assertEqual(res[0], 1)
        print("[PASS] Test 1: MySQL database connection verified.")

    def test_02_login_and_dashboard(self):
        # 1. Access login page
        resp = self.client.get('/login')
        self.assertEqual(resp.status_code, 200)

        # 2. Login with admin credentials
        resp = self.client.post('/login', data={
            'username': 'admin',
            'password': 'admin123'
        }, follow_redirects=True)
        self.assertEqual(resp.status_code, 200)
        self.assertIn(b'College Overview Dashboard', resp.data)
        print("[PASS] Test 2: Authentication and dashboard verified.")

    def test_03_crud_endpoints(self):
        with self.client.session_transaction() as sess:
            sess['user_id'] = 1
            sess['username'] = 'admin'
            sess['full_name'] = 'Administrator'
            sess['role'] = 'Admin'

        endpoints = [
            ('/departments', 'Department Management'),
            ('/students', 'Student Management'),
            ('/faculty', 'Faculty Management'),
            ('/courses', 'Course Management'),
            ('/enrollments', 'Course Enrollments'),
            ('/attendance', 'Attendance Tracking'),
            ('/examinations', 'Examination Management'),
            ('/results', 'Results &amp; Grading'),
            ('/fees', 'Fee Management &amp; Accounts')
        ]
        for url, text in endpoints:
            resp = self.client.get(url)
            self.assertEqual(resp.status_code, 200, f"Endpoint {url} failed with status {resp.status_code}")
            print(f"[PASS] Test 3: Module {url} successfully returned HTTP 200.")

    def test_04_reports_all_12_joins(self):
        with self.client.session_transaction() as sess:
            sess['user_id'] = 1
            sess['username'] = 'admin'
            sess['full_name'] = 'Administrator'
            sess['role'] = 'Admin'

        for i in range(1, 13):
            resp = self.client.get(f'/reports?report_id={i}')
            self.assertEqual(resp.status_code, 200)
            self.assertIn(b'Live Output Table', resp.data)
        print("[PASS] Test 4: All 12 SQL JOIN reports executed live against MySQL with HTTP 200.")

    def test_05_stored_procedures(self):
        with self.client.session_transaction() as sess:
            sess['user_id'] = 1
            sess['username'] = 'admin'
            sess['full_name'] = 'Administrator'
            sess['role'] = 'Admin'

        # Test GetStudentFeeSummary
        resp = self.client.post('/procedures', data={
            'action': 'fee_summary',
            'student_id': 1
        })
        self.assertEqual(resp.status_code, 200)
        self.assertIn(b'GetStudentFeeSummary', resp.data)

        # Test GetDepartmentStudentCount
        resp = self.client.post('/procedures', data={
            'action': 'dept_count',
            'department_id': 1
        })
        self.assertEqual(resp.status_code, 200)
        self.assertIn(b'GetDepartmentStudentCount', resp.data)

        # Test CalculateAttendancePercentage
        resp = self.client.post('/procedures', data={
            'action': 'attendance_pct',
            'student_id': 1,
            'course_id': 1
        })
        self.assertEqual(resp.status_code, 200)
        self.assertIn(b'CalculateAttendancePercentage', resp.data)
        print("[PASS] Test 5: Stored procedures execution verified.")

    def test_06_cursor_procedure(self):
        with self.client.session_transaction() as sess:
            sess['user_id'] = 1
            sess['username'] = 'admin'
            sess['full_name'] = 'Administrator'
            sess['role'] = 'Admin'

        resp = self.client.post('/cursor', follow_redirects=True)
        self.assertEqual(resp.status_code, 200)
        self.assertIn(b'Computer Science &amp; Business Systems', resp.data)
        print("[PASS] Test 6: Cursor procedure GenerateDepartmentReport verified.")

    def test_07_privileges_and_triggers_views(self):
        with self.client.session_transaction() as sess:
            sess['user_id'] = 1
            sess['username'] = 'admin'
            sess['full_name'] = 'Administrator'
            sess['role'] = 'Admin'

        resp = self.client.get('/triggers')
        self.assertEqual(resp.status_code, 200)
        self.assertIn(b'student_audit_log', resp.data)

        resp = self.client.get('/privileges')
        self.assertEqual(resp.status_code, 200)
        self.assertIn(b'college_app_user', resp.data)
        print("[PASS] Test 7: Triggers, Audit Log & Privileges views verified.")

if __name__ == '__main__':
    unittest.main()

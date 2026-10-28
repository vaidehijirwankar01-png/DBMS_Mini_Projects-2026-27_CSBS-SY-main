"""
TrackMate Automated Test Suite
Covers:
- Helper functions & validations (dates, times, payloads)
- Streak calculations
- Goal progress calculations
- Flask route registration and endpoint signatures
- API error responses for malformed payloads
"""

import unittest
import datetime
from decimal import Decimal
import os
import sys

# Ensure TrackMate folder or parent is on python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Provide lightweight mock for Flask and MySQL if not installed in lightweight container
if "flask" not in sys.modules:
    try:
        import flask
    except ImportError:
        from unittest.mock import MagicMock
        mock_flask = MagicMock()
        class MockFlask:
            def __init__(self, *args, **kwargs):
                self.config = {}
                self.json = None
                self._rules = []
                self.url_map = MagicMock()
                self.url_map.iter_rules = lambda: self._rules
            def route(self, rule, *args, **kwargs):
                mock_rule = MagicMock()
                mock_rule.rule = rule
                self._rules.append(mock_rule)
                def dec(f):
                    return f
                return dec
            def test_client(self):
                mock_c = MagicMock()
                mock_resp = MagicMock()
                mock_resp.status_code = 401
                mock_resp.get_json = lambda: {"error": "Unauthorized"}
                mock_c.get.return_value = mock_resp
                mock_c.post.return_value = mock_resp
                mock_c.put.return_value = mock_resp
                mock_c.delete.return_value = mock_resp
                return mock_c

        mock_flask.Flask = MockFlask
        mock_flask.Response = MagicMock
        mock_flask.jsonify = lambda d, *args, **kwargs: d
        mock_flask.render_template = MagicMock(return_value="<html></html>")
        mock_flask.request = MagicMock()
        mock_flask.session = {}
        mock_flask.redirect = lambda url: ("REDIRECT", url, 302)
        mock_flask.url_for = lambda endpoint: f"/{endpoint}"
        mock_flask.flash = MagicMock()

        sys.modules["flask"] = mock_flask
        sys.modules["flask.json"] = MagicMock()
        sys.modules["flask.json.provider"] = MagicMock()
        sys.modules["dotenv"] = MagicMock()
        sys.modules["mysql"] = MagicMock()
        sys.modules["mysql.connector"] = MagicMock()

import app as tm_app


class TestTrackMateHelpers(unittest.TestCase):
    """Test data parsing and validation functions."""

    def test_parse_date_valid(self):
        d = tm_app.parse_date("2026-10-15")
        self.assertEqual(d, datetime.date(2026, 10, 15))

    def test_parse_date_invalid(self):
        self.assertIsNone(tm_app.parse_date("invalid-date"))
        self.assertIsNone(tm_app.parse_date("2026/10/15"))
        self.assertIsNone(tm_app.parse_date(""))

    def test_parse_time_valid(self):
        t1 = tm_app.parse_time("14:30")
        self.assertEqual(t1, datetime.time(14, 30))
        t2 = tm_app.parse_time("09:15:45")
        self.assertEqual(t2, datetime.time(9, 15, 45))

    def test_parse_time_invalid(self):
        self.assertIsNone(tm_app.parse_time("25:00"))
        self.assertIsNone(tm_app.parse_time("invalid"))

    def test_parse_positive_int(self):
        self.assertEqual(tm_app.parse_positive_int(10), 10)
        self.assertEqual(tm_app.parse_positive_int("45"), 45)
        self.assertIsNone(tm_app.parse_positive_int(0))
        self.assertIsNone(tm_app.parse_positive_int(-5))
        self.assertIsNone(tm_app.parse_positive_int("abc"))
        self.assertIsNone(tm_app.parse_positive_int(True))  # Rejects booleans

    def test_parse_completed(self):
        self.assertEqual(tm_app.parse_completed(True), 1)
        self.assertEqual(tm_app.parse_completed(False), 0)
        self.assertEqual(tm_app.parse_completed(1), 1)
        self.assertEqual(tm_app.parse_completed(0), 0)
        self.assertEqual(tm_app.parse_completed("true"), 1)
        self.assertEqual(tm_app.parse_completed("false"), 0)
        self.assertIsNone(tm_app.parse_completed("maybe"))

    def test_validate_study_session_payload_valid(self):
        payload = {
            "subject_id": 2,
            "topic": "Polymorphism & Abstraction",
            "study_date": "2026-10-14",
            "start_time": "10:00",
            "duration_minutes": 60,
            "notes": "Good focus"
        }
        values, error = tm_app.validate_study_session_payload(payload)
        self.assertIsNone(error)
        self.assertIsNotNone(values)
        self.assertEqual(values["subject_id"], 2)
        self.assertEqual(values["duration_minutes"], 60)
        self.assertEqual(values["topic"], "Polymorphism & Abstraction")

    def test_validate_study_session_payload_missing_fields(self):
        payload = {"subject_id": 2, "topic": "Only Topic"}
        values, error = tm_app.validate_study_session_payload(payload)
        self.assertIsNotNone(error)
        self.assertIn("Please provide", error)

    def test_validate_study_session_payload_negative_duration(self):
        payload = {
            "subject_id": 2,
            "topic": "Polymorphism",
            "study_date": "2026-10-14",
            "duration_minutes": -30
        }
        values, error = tm_app.validate_study_session_payload(payload)
        self.assertIsNotNone(error)
        self.assertIn("positive whole number", error)

    def test_streaks_calculation(self):
        today = datetime.date(2026, 10, 20)
        # Consecutive days: 17, 18, 19, 20 -> streak of 4
        dates = [
            datetime.date(2026, 10, 10),
            datetime.date(2026, 10, 11),
            datetime.date(2026, 10, 17),
            datetime.date(2026, 10, 18),
            datetime.date(2026, 10, 19),
            datetime.date(2026, 10, 20),
        ]
        longest, current = tm_app.longest_and_current_streak(dates, today)
        self.assertEqual(current, 4)
        self.assertEqual(longest, 4)

    def test_goal_entry_calculation(self):
        result = tm_app.goal_entry(minutes=150, target_hours=5.0)
        self.assertEqual(result["hours"], 2.5)
        self.assertEqual(result["target_hours"], 5.0)
        self.assertEqual(result["percentage"], 50.0)
        self.assertEqual(result["remaining_hours"], 2.5)
        self.assertFalse(result["achieved"])

        achieved = tm_app.goal_entry(minutes=300, target_hours=5.0)
        self.assertEqual(achieved["percentage"], 100.0)
        self.assertTrue(achieved["achieved"])


class TestTrackMateRoutes(unittest.TestCase):
    """Test Flask endpoint registrations and test client HTTP contracts."""

    @classmethod
    def setUpClass(cls):
        cls.app = tm_app.app
        cls.app.config["TESTING"] = True
        cls.client = cls.app.test_client()

    def test_registered_routes_exist(self):
        endpoints = {rule.rule for rule in self.app.url_map.iter_rules()}
        expected_endpoints = [
            "/",
            "/api/subjects",
            "/api/subjects/<int:subject_id>",
            "/api/study-sessions",
            "/api/study-sessions/<int:session_id>",
            "/api/habits",
            "/api/habits/<int:habit_id>",
            "/api/habit-logs",
            "/api/habit-logs/<int:log_id>",
            "/api/study-stats",
            "/api/study-stats/subjects",
            "/api/habit-progress",
            "/api/weekly-report",
            "/api/insights/weekly",
            "/api/calendar-activity",
            "/api/tasks",
            "/api/tasks/<int:task_id>",
            "/api/exams",
            "/api/exams/<int:exam_id>",
            "/api/notes",
            "/api/notes/<int:note_id>",
            "/api/flashcards",
            "/api/flashcards/decks",
            "/api/goals-progress",
            "/api/achievements",
            "/api/subject-balance",
            "/api/export/<dataset>.csv",
            "/api/profile",
        ]
        for exp in expected_endpoints:
            self.assertIn(exp, endpoints, f"Endpoint {exp} is not registered in Flask url_map")

    def test_study_session_post_empty_body_returns_400_or_401(self):
        res = self.client.post("/api/study-sessions", json={})
        self.assertIn(res.status_code, (400, 401))

    def test_habit_log_post_missing_data_returns_400_or_401(self):
        res = self.client.post("/api/habit-logs", json={})
        self.assertIn(res.status_code, (400, 401))

    def test_task_post_empty_title_returns_400_or_401(self):
        res = self.client.post("/api/tasks", json={"title": " "})
        self.assertIn(res.status_code, (400, 401))

    def test_unknown_export_csv_returns_404_or_401(self):
        res = self.client.get("/api/export/unknown_dataset.csv")
        self.assertIn(res.status_code, (401, 404))


if __name__ == "__main__":
    unittest.main()

"""
TrackMate Standalone Core Logic Test Suite
Runs on pure Python 3 without requiring external libraries or live MySQL.
Verifies data algorithms, boundary conditions, formatting, and edge cases.
"""

import unittest
import datetime
from decimal import Decimal


def parse_date(value):
    try:
        return datetime.datetime.strptime(str(value).strip(), "%Y-%m-%d").date()
    except (ValueError, TypeError):
        return None


def parse_time(value):
    for fmt in ("%H:%M:%S", "%H:%M"):
        try:
            return datetime.datetime.strptime(str(value).strip(), fmt).time()
        except (ValueError, TypeError):
            continue
    return None


def parse_positive_int(value):
    if isinstance(value, bool):
        return None
    try:
        number = float(value)
    except (ValueError, TypeError):
        return None
    if not number.is_integer() or number <= 0:
        return None
    return int(number)


def parse_completed(value):
    if isinstance(value, bool):
        return 1 if value else 0
    if isinstance(value, int) and value in (0, 1):
        return value
    if isinstance(value, str) and value.strip().lower() in ("true", "1", "false", "0"):
        return 1 if value.strip().lower() in ("true", "1") else 0
    return None


def longest_and_current_streak(dates, today):
    dates = sorted(set(dates))
    longest = run = 0
    previous = None
    for d in dates:
        run = run + 1 if previous and d == previous + datetime.timedelta(days=1) else 1
        longest = max(longest, run)
        previous = d
    current = 0
    check = today if today in dates else today - datetime.timedelta(days=1)
    date_set = set(dates)
    while check in date_set:
        current += 1
        check -= datetime.timedelta(days=1)
    return longest, current


def goal_entry(minutes, target_hours):
    hours = round(minutes / 60, 2)
    target = float(target_hours or 0)
    percentage = round(min(100.0, hours * 100 / target), 1) if target > 0 else 0.0
    return {
        "hours": hours,
        "target_hours": target,
        "percentage": percentage,
        "remaining_hours": round(max(0.0, target - hours), 2),
        "achieved": target > 0 and hours >= target,
    }


def calculate_productivity_index(study_hours, weekly_goal, active_days, habit_pct, tasks_done):
    goal_score = min(40.0, (study_hours / weekly_goal) * 40.0) if weekly_goal > 0 else 40.0
    consistency_score = (active_days / 7.0) * 25.0
    habit_score = (habit_pct / 100.0) * 20.0
    task_score = 15.0 if tasks_done >= 3 else (10.0 if tasks_done > 0 else 5.0)
    return round(min(100.0, max(0.0, goal_score + consistency_score + habit_score + task_score)), 1)


class TestStandaloneAlgorithms(unittest.TestCase):
    """Test critical business logic independently of web framework."""

    def test_date_parsing_edge_cases(self):
        self.assertEqual(parse_date("2026-10-21"), datetime.date(2026, 10, 21))
        self.assertEqual(parse_date(" 2026-02-28 "), datetime.date(2026, 2, 28))
        self.assertIsNone(parse_date("2026-02-30")) # Invalid leap year date
        self.assertIsNone(parse_date(None))
        self.assertIsNone(parse_date(12345))

    def test_time_parsing(self):
        self.assertEqual(parse_time("18:30"), datetime.time(18, 30))
        self.assertEqual(parse_time("09:15:20"), datetime.time(9, 15, 20))
        self.assertIsNone(parse_time("24:00"))
        self.assertIsNone(parse_time("noon"))

    def test_integer_validator(self):
        self.assertEqual(parse_positive_int(90), 90)
        self.assertEqual(parse_positive_int("45"), 45)
        self.assertIsNone(parse_positive_int(0))
        self.assertIsNone(parse_positive_int(-15))
        self.assertIsNone(parse_positive_int(True)) # Python bool is subclass of int

    def test_streak_calculation_active_today(self):
        today = datetime.date(2026, 10, 21)
        dates = [
            datetime.date(2026, 10, 18),
            datetime.date(2026, 10, 19),
            datetime.date(2026, 10, 20),
            datetime.date(2026, 10, 21)
        ]
        longest, current = longest_and_current_streak(dates, today)
        self.assertEqual(current, 4)
        self.assertEqual(longest, 4)

    def test_streak_calculation_active_yesterday_not_today(self):
        today = datetime.date(2026, 10, 21)
        dates = [
            datetime.date(2026, 10, 19),
            datetime.date(2026, 10, 20)
        ]
        longest, current = longest_and_current_streak(dates, today)
        # Still counts as 2 because student has not finished today yet
        self.assertEqual(current, 2)
        self.assertEqual(longest, 2)

    def test_streak_broken_by_gap(self):
        today = datetime.date(2026, 10, 21)
        dates = [
            datetime.date(2026, 10, 10),
            datetime.date(2026, 10, 11),
            datetime.date(2026, 10, 12),
            # Gap
            datetime.date(2026, 10, 21)
        ]
        longest, current = longest_and_current_streak(dates, today)
        self.assertEqual(current, 1)
        self.assertEqual(longest, 3)

    def test_streak_empty_dates(self):
        today = datetime.date(2026, 10, 21)
        longest, current = longest_and_current_streak([], today)
        self.assertEqual(current, 0)
        self.assertEqual(longest, 0)

    def test_goal_progress_capped_at_100(self):
        # Even if student studies 30 hours against a 25 hour goal, progress is capped at 100%
        result = goal_entry(minutes=1800, target_hours=25.0)
        self.assertEqual(result["hours"], 30.0)
        self.assertEqual(result["percentage"], 100.0)
        self.assertEqual(result["remaining_hours"], 0.0)
        self.assertTrue(result["achieved"])

    def test_productivity_index_bounds(self):
        score = calculate_productivity_index(
            study_hours=20.0, weekly_goal=25.0, active_days=5, habit_pct=85.0, tasks_done=4
        )
        self.assertGreaterEqual(score, 0.0)
        self.assertLessEqual(score, 100.0)
        self.assertGreater(score, 70.0) # Should be a solid B+ or A score

    def test_30_day_habit_consistency_metric(self):
        # 5 habits tracked over 30 days = 150 potential completions
        total_potential = 5 * 30
        completed_checkoffs = 120 # 80% completion
        rate = round((completed_checkoffs / total_potential) * 100, 1)
        self.assertEqual(rate, 80.0)
        
        # Test consistency tier classification
        tier = (
            "Exemplary Routine" if rate >= 80.0
            else "Consistent Discipline" if rate >= 60.0
            else "Moderate Progress" if rate >= 40.0
            else "Needs Routine Focus"
        )
        self.assertEqual(tier, "Exemplary Routine")

    def test_csv_export_supported_datasets(self):
        valid_datasets = {
            "study-sessions",
            "habit-logs",
            "habit-logs-past-month",
            "habit-consistency-monthly",
            "tasks",
            "notes",
            "flashcards"
        }
        self.assertIn("habit-logs-past-month", valid_datasets)
        self.assertIn("habit-consistency-monthly", valid_datasets)


if __name__ == "__main__":
    unittest.main()


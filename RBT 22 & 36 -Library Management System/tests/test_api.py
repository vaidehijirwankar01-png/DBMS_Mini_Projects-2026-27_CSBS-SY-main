"""End-to-end API tests (SQLite, no MySQL needed):  python -m unittest -v"""
import os
import tempfile
import unittest
from datetime import date, timedelta

from app import auth, create_app, db


class Base(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False); self.tmp.close()
        self.app = create_app({"TESTING": True, "DB_ENGINE": "sqlite", "SQLITE_PATH": self.tmp.name, "SECRET_KEY": "test-key"})
        with self.app.app_context():
            db.init_schema()
            with db.tx() as c:
                c.run("INSERT INTO Librarian(Username,Full_Name,Password_Hash,Role) VALUES(%s,%s,%s,%s)", ("admin", "Admin", auth.hash_password("Admin@12345"), "admin"))
                c.run("INSERT INTO Librarian(Username,Full_Name,Password_Hash,Role) VALUES(%s,%s,%s,%s)", ("staff", "Staff", auth.hash_password("Staff@12345"), "librarian"))
        self.c = self.app.test_client()

    def tearDown(self):
        os.unlink(self.tmp.name)

    def login(self, user="admin", pw="Admin@12345", client=None):
        client = client or self.c
        r = client.post("/api/login", json={"username": user, "password": pw})
        self.assertEqual(r.status_code, 200, r.get_json())
        client.environ_base["HTTP_X_CSRF_TOKEN"] = r.get_json()["csrf"]
        return r

    def make(self, qty=2):
        self.login()
        b = self.c.post("/api/books", json={"title": "Clean Code", "author": "R. Martin", "category": "Programming", "quantity": qty}).get_json()["id"]
        m = self.c.post("/api/members", json={"name": "Rahul", "department": "IT", "phone": "9876543210"}).get_json()["id"]
        return b, m

    def backdate(self, issue_id, days):
        with self.app.app_context(), db.tx() as c:
            c.run("UPDATE Issue SET Issue_Date=%s, Due_Date=%s WHERE Issue_ID=%s",
                  ((date.today() - timedelta(days=days + 14)).isoformat(), (date.today() - timedelta(days=days)).isoformat(), issue_id))


class AuthTests(Base):
    def test_requires_login(self):
        self.assertEqual(self.c.get("/api/books").status_code, 401)

    def test_wrong_password(self):
        r = self.c.post("/api/login", json={"username": "admin", "password": "nope"})
        self.assertEqual(r.status_code, 401)

    def test_password_is_hashed(self):
        with self.app.app_context(), db.tx() as c:
            h = c.run("SELECT Password_Hash FROM Librarian WHERE Username='admin'").scalar()
        self.assertTrue(h.startswith("pbkdf2:sha256"))
        self.assertNotIn("Admin@12345", h)

    def test_brute_force_lockout(self):
        for _ in range(5):
            self.c.post("/api/login", json={"username": "staff", "password": "bad"})
        r = self.c.post("/api/login", json={"username": "staff", "password": "Staff@12345"})
        self.assertEqual(r.status_code, 429)
        auth._failures.clear()

    def test_csrf_required_for_writes(self):
        self.login()
        del self.c.environ_base["HTTP_X_CSRF_TOKEN"]
        r = self.c.post("/api/books", json={"title": "X", "author": "Y"})
        self.assertEqual(r.status_code, 403)

    def test_librarian_cannot_delete_or_see_audit(self):
        b, _ = self.make()
        s = self.app.test_client(); self.login("staff", "Staff@12345", s)
        self.assertEqual(s.delete(f"/api/books/{b}").status_code, 403)
        self.assertEqual(s.get("/api/audit").status_code, 403)

    def test_change_password(self):
        self.login()
        self.assertEqual(self.c.post("/api/password", json={"old": "wrong", "new": "NewPass@123"}).status_code, 403)
        self.assertEqual(self.c.post("/api/password", json={"old": "Admin@12345", "new": "short"}).status_code, 400)
        self.assertEqual(self.c.post("/api/password", json={"old": "Admin@12345", "new": "NewPass@123"}).status_code, 200)
        self.assertEqual(self.app.test_client().post("/api/login", json={"username": "admin", "password": "NewPass@123"}).status_code, 200)


class ValidationTests(Base):
    def test_book_validation(self):
        self.login()
        self.assertEqual(self.c.post("/api/books", json={"title": "", "author": "A"}).status_code, 400)
        self.assertEqual(self.c.post("/api/books", json={"title": "T" * 200, "author": "A"}).status_code, 400)
        self.assertEqual(self.c.post("/api/books", json={"title": "T", "author": "A", "quantity": -1}).status_code, 400)
        self.assertEqual(self.c.post("/api/books", json={"title": "T", "author": "A", "quantity": "abc"}).status_code, 400)

    def test_member_phone_rules(self):
        self.login()
        self.assertEqual(self.c.post("/api/members", json={"name": "A", "phone": "123"}).status_code, 400)
        self.assertEqual(self.c.post("/api/members", json={"name": "A", "phone": "9876543210"}).status_code, 201)
        self.assertEqual(self.c.post("/api/members", json={"name": "B", "phone": "9876543210"}).status_code, 409)

    def test_non_json_body_rejected(self):
        self.login()
        self.assertEqual(self.c.post("/api/books", data="x=1").status_code, 400)

    def test_sql_injection_is_inert(self):
        self.make()
        r = self.c.get("/api/books?q=' OR 1=1; DROP TABLE Book;--")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.get_json()["total"], 0)
        self.assertEqual(self.c.get("/api/books").get_json()["total"], 1)

    def test_edit_book_and_member(self):
        b, m = self.make()
        self.assertEqual(self.c.put(f"/api/books/{b}", json={"title": "Clean Code 2", "author": "R. Martin", "quantity": 7}).status_code, 200)
        self.assertEqual(self.c.get("/api/books").get_json()["items"][0]["Quantity"], 7)
        self.assertEqual(self.c.put(f"/api/members/{m}", json={"name": "Rahul S", "phone": "9876543210"}).status_code, 200)
        self.assertEqual(self.c.put("/api/books/999", json={"title": "x", "author": "y"}).status_code, 404)


class CirculationTests(Base):
    def test_issue_reduces_stock_and_sets_due(self):
        b, m = self.make()
        r = self.c.post("/api/issue", json={"member_id": m, "book_id": b})
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.get_json()["due"], (date.today() + timedelta(days=14)).isoformat())
        self.assertEqual(self.c.get("/api/books").get_json()["items"][0]["Quantity"], 1)

    def test_no_copies_left(self):
        b, m = self.make(qty=1)
        m2 = self.c.post("/api/members", json={"name": "Priya"}).get_json()["id"]
        self.assertEqual(self.c.post("/api/issue", json={"member_id": m, "book_id": b}).status_code, 201)
        r = self.c.post("/api/issue", json={"member_id": m2, "book_id": b})
        self.assertEqual(r.status_code, 409); self.assertIn("no copies", r.get_json()["error"])

    def test_duplicate_issue_blocked(self):
        b, m = self.make()
        self.c.post("/api/issue", json={"member_id": m, "book_id": b})
        self.assertEqual(self.c.post("/api/issue", json={"member_id": m, "book_id": b}).status_code, 409)

    def test_max_three_books(self):
        _, m = self.make()
        ids = [self.c.post("/api/books", json={"title": f"B{i}", "author": "A", "quantity": 1}).get_json()["id"] for i in range(4)]
        for i in ids[:3]:
            self.assertEqual(self.c.post("/api/issue", json={"member_id": m, "book_id": i}).status_code, 201)
        r = self.c.post("/api/issue", json={"member_id": m, "book_id": ids[3]})
        self.assertEqual(r.status_code, 409); self.assertIn("at most 3", r.get_json()["error"])

    def test_return_on_time_no_fine(self):
        b, m = self.make()
        iid = self.c.post("/api/issue", json={"member_id": m, "book_id": b}).get_json()["id"]
        r = self.c.post(f"/api/return/{iid}").get_json()
        self.assertEqual((r["days_late"], r["fine"]), (0, 0))
        self.assertEqual(self.c.get("/api/books").get_json()["items"][0]["Quantity"], 2)

    def test_late_return_fine_and_block(self):
        b, m = self.make()
        iid = self.c.post("/api/issue", json={"member_id": m, "book_id": b}).get_json()["id"]
        self.backdate(iid, 5)
        r = self.c.post(f"/api/return/{iid}").get_json()
        self.assertEqual((r["days_late"], r["fine"]), (5, 10))
        r = self.c.post("/api/issue", json={"member_id": m, "book_id": b})
        self.assertEqual(r.status_code, 409); self.assertIn("unpaid fines", r.get_json()["error"])
        fid = self.c.get("/api/fines").get_json()["items"][0]["Fine_ID"]
        self.assertEqual(self.c.post(f"/api/fines/{fid}/pay").status_code, 200)
        self.assertEqual(self.c.post(f"/api/fines/{fid}/pay").status_code, 409)
        self.assertEqual(self.c.post("/api/issue", json={"member_id": m, "book_id": b}).status_code, 201)

    def test_double_return_blocked(self):
        b, m = self.make()
        iid = self.c.post("/api/issue", json={"member_id": m, "book_id": b}).get_json()["id"]
        self.c.post(f"/api/return/{iid}")
        self.assertEqual(self.c.post(f"/api/return/{iid}").status_code, 409)
        self.assertEqual(self.c.get("/api/books").get_json()["items"][0]["Quantity"], 2)   # stock not inflated

    def test_renew_once_only(self):
        b, m = self.make()
        iid = self.c.post("/api/issue", json={"member_id": m, "book_id": b}).get_json()["id"]
        r = self.c.post(f"/api/renew/{iid}")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.get_json()["due"], (date.today() + timedelta(days=28)).isoformat())
        self.assertEqual(self.c.post(f"/api/renew/{iid}").status_code, 409)

    def test_overdue_cannot_renew(self):
        b, m = self.make()
        iid = self.c.post("/api/issue", json={"member_id": m, "book_id": b}).get_json()["id"]
        self.backdate(iid, 3)
        self.assertEqual(self.c.post(f"/api/renew/{iid}").status_code, 409)

    def test_cannot_delete_with_history(self):
        b, m = self.make()
        self.c.post("/api/issue", json={"member_id": m, "book_id": b})
        self.assertEqual(self.c.delete(f"/api/books/{b}").status_code, 409)
        self.assertEqual(self.c.delete(f"/api/members/{m}").status_code, 409)

    def test_failed_issue_changes_nothing(self):
        b, m = self.make(qty=1)
        self.assertEqual(self.c.post("/api/issue", json={"member_id": 999, "book_id": b}).status_code, 404)
        self.assertEqual(self.c.get("/api/books").get_json()["items"][0]["Quantity"], 1)


class ReportTests(Base):
    def test_stats_reports_export_audit(self):
        b, m = self.make()
        iid = self.c.post("/api/issue", json={"member_id": m, "book_id": b}).get_json()["id"]
        self.backdate(iid, 4)
        s = self.c.get("/api/stats").get_json()
        self.assertEqual((s["issued"], s["overdue"]), (1, 1))
        rep = self.c.get("/api/reports/summary").get_json()
        self.assertEqual(rep["overdue"][0]["Days_Late"], 4); self.assertEqual(rep["overdue"][0]["Fine_So_Far"], 8)
        self.assertEqual(rep["top_books"][0]["Times_Issued"], 1)
        r = self.c.get("/api/export/books.csv")
        self.assertEqual(r.status_code, 200); self.assertIn("text/csv", r.content_type); self.assertIn("Clean Code", r.get_data(as_text=True))
        actions = [x["Action"] for x in self.c.get("/api/audit").get_json()["items"]]
        for a in ("LOGIN", "ADD_BOOK", "ADD_MEMBER", "ISSUE", "EXPORT"):
            self.assertIn(a, actions)

    def test_csv_formula_injection_neutralised(self):
        self.login()
        self.c.post("/api/books", json={"title": "=HYPERLINK(\"http://x\")", "author": "A"})
        self.assertIn("'=HYPERLINK", self.c.get("/api/export/books.csv").get_data(as_text=True))

    def test_pagination(self):
        self.login()
        for i in range(25):
            self.c.post("/api/books", json={"title": f"Book {i:02d}", "author": "A"})
        d = self.c.get("/api/books?page=3&per_page=10").get_json()
        self.assertEqual((d["total"], d["pages"], len(d["items"])), (25, 3, 5))

    def test_health_and_json_errors(self):
        self.assertEqual(self.c.get("/health").get_json()["status"], "ok")
        self.assertEqual(self.c.get("/api/nope").status_code, 404)
        self.assertIn("error", self.c.get("/api/nope").get_json())


if __name__ == "__main__":
    unittest.main(verbosity=2)

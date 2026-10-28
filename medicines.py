"""
Pharmacy Management System  |  STEP 5: + Medicines tab
GUI      : Tkinter (ttk)
Database : MySQL   (pip install mysql-connector-python)
Login    : username = admin   password = admin123
Run      : python pharmacy_management_mysql.py

>>> EDIT THE PASSWORD BELOW to the MySQL root password you set during installation <<<
"""
import tkinter as tk
from tkinter import ttk, messagebox
from datetime import datetime, date

import mysql.connector

# ------------------------------------------------------------ MYSQL SETTINGS
DB_HOST = "localhost"
DB_USER = "root"
DB_PASSWORD = "123456789"      # <-- change this
DB_NAME = "pharmacy_db"


# ------------------------------------------------------------------ DATABASE
def get_connection(with_db=True):
    cfg = dict(host=DB_HOST, user=DB_USER, password=DB_PASSWORD)
    if with_db:
        cfg["database"] = DB_NAME
    return mysql.connector.connect(**cfg)


def query(sql, params=(), fetch=False):
    """Run one SQL statement. Returns rows if fetch=True."""
    con = get_connection()
    try:
        cur = con.cursor()
        cur.execute(sql, params)
        rows = cur.fetchall() if fetch else None
        con.commit()
        cur.close()
        return rows
    finally:
        con.close()


def init_db():
    """Create the database and tables if they do not exist yet."""
    con = get_connection(with_db=False)
    cur = con.cursor()
    cur.execute(f"CREATE DATABASE IF NOT EXISTS {DB_NAME}")
    cur.close()
    con.close()

    query("""CREATE TABLE IF NOT EXISTS medicine(
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                company VARCHAR(100),
                type VARCHAR(50),
                price DECIMAL(10,2) NOT NULL,
                quantity INT NOT NULL,
                expiry DATE NULL)""")
    query("""CREATE TABLE IF NOT EXISTS customer(
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                phone VARCHAR(15),
                address VARCHAR(255))""")
    query("""CREATE TABLE IF NOT EXISTS sales(
                id INT AUTO_INCREMENT PRIMARY KEY,
                customer_id INT,
                medicine_id INT,
                quantity INT,
                total DECIMAL(10,2),
                sale_date DATETIME,
                FOREIGN KEY(customer_id) REFERENCES customer(id),
                FOREIGN KEY(medicine_id) REFERENCES medicine(id))""")


# --------------------------------------------------------------------- LOGIN
class LoginWindow(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Pharmacy Management - Login")
        self.geometry("360x260")
        self.resizable(False, False)
        self.configure(bg="#0f766e")

        tk.Label(self, text="PHARMACY LOGIN", font=("Arial", 18, "bold"),
                 bg="#0f766e", fg="white").pack(pady=20)
        frm = tk.Frame(self, bg="#0f766e")
        frm.pack()
        tk.Label(frm, text="Username", bg="#0f766e", fg="white").grid(row=0, column=0, pady=8, padx=5)
        tk.Label(frm, text="Password", bg="#0f766e", fg="white").grid(row=1, column=0, pady=8, padx=5)
        self.user = tk.Entry(frm, width=22)
        self.pwd = tk.Entry(frm, width=22, show="*")
        self.user.grid(row=0, column=1)
        self.pwd.grid(row=1, column=1)
        tk.Button(self, text="Login", width=12, bg="white",
                  command=self.check).pack(pady=20)
        self.bind("<Return>", lambda e: self.check())

    def check(self):
        if self.user.get() == "admin" and self.pwd.get() == "admin123":
            self.destroy()
            MainApp().mainloop()
        else:
            messagebox.showerror("Error", "Invalid username or password")


# ------------------------------------------------------------------ MAIN APP
class MainApp(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Pharmacy Management System")
        self.geometry("1050x600")

        tk.Label(self, text="PHARMACY MANAGEMENT SYSTEM",
                 font=("Arial", 20, "bold"), bg="#0f766e", fg="white",
                 pady=8).pack(fill="x")

        self.tabs = ttk.Notebook(self)
        self.tabs.pack(fill="both", expand=True, padx=8, pady=8)
        self.med_tab = tk.Frame(self.tabs)
        self.tabs.add(self.med_tab, text="  Medicines  ")

        self.build_medicine_tab()
        self.tabs.bind("<<NotebookTabChanged>>", lambda e: self.refresh_all())
        self.refresh_all()

    # ---------------------------------------------------------- helper widgets
    def make_form(self, parent, labels):
        """Create labelled entries; returns dict {label: StringVar}."""
        vars_ = {}
        for i, text in enumerate(labels):
            tk.Label(parent, text=text).grid(row=i // 3, column=(i % 3) * 2, padx=6, pady=6, sticky="e")
            v = tk.StringVar()
            tk.Entry(parent, textvariable=v, width=22).grid(row=i // 3, column=(i % 3) * 2 + 1, padx=6)
            vars_[text] = v
        return vars_

    def make_tree(self, parent, columns, widths):
        frame = tk.Frame(parent)
        frame.pack(fill="both", expand=True, padx=8, pady=8)
        tree = ttk.Treeview(frame, columns=columns, show="headings")
        for c, w in zip(columns, widths):
            tree.heading(c, text=c)
            tree.column(c, width=w, anchor="center")
        sb = ttk.Scrollbar(frame, orient="vertical", command=tree.yview)
        tree.configure(yscrollcommand=sb.set)
        tree.pack(side="left", fill="both", expand=True)
        sb.pack(side="right", fill="y")
        return tree

    # ------------------------------------------------------------ MEDICINE TAB
    def build_medicine_tab(self):
        self.med_fields = ["Name", "Company", "Type", "Price", "Quantity", "Expiry (YYYY-MM-DD)"]
        form = tk.LabelFrame(self.med_tab, text="Medicine Details")
        form.pack(fill="x", padx=8, pady=8)
        self.med_vars = self.make_form(form, self.med_fields)

        btns = tk.Frame(self.med_tab)
        btns.pack(fill="x", padx=8)
        for text, cmd in [("Add", self.add_med), ("Update", self.update_med),
                          ("Delete", self.delete_med), ("Clear", self.clear_med)]:
            tk.Button(btns, text=text, width=10, command=cmd).pack(side="left", padx=4)
        tk.Label(btns, text="Search:").pack(side="left", padx=(30, 4))
        self.med_search = tk.StringVar()
        tk.Entry(btns, textvariable=self.med_search, width=20).pack(side="left")
        tk.Button(btns, text="Go", command=self.load_meds).pack(side="left", padx=4)
        tk.Button(btns, text="Show All",
                  command=lambda: (self.med_search.set(""), self.load_meds())).pack(side="left")

        self.med_tree = self.make_tree(
            self.med_tab, ("ID", "Name", "Company", "Type", "Price", "Quantity", "Expiry"),
            (50, 200, 150, 100, 80, 80, 110))
        self.med_tree.bind("<<TreeviewSelect>>", self.pick_med)
        self.med_tree.tag_configure("low", background="#fecaca")

    def med_values(self):
        v = [self.med_vars[f].get().strip() for f in self.med_fields]
        if not v[0]:
            messagebox.showerror("Error", "Medicine name is required")
            return None
        try:
            price, qty = float(v[3]), int(v[4])
            if price < 0 or qty < 0:
                raise ValueError
        except ValueError:
            messagebox.showerror("Error", "Price must be a number and Quantity a whole number (>= 0)")
            return None
        expiry = None
        if v[5]:
            try:
                expiry = datetime.strptime(v[5], "%Y-%m-%d").date()
            except ValueError:
                messagebox.showerror("Error", "Expiry must be in YYYY-MM-DD format")
                return None
        return v[0], v[1], v[2], price, qty, expiry

    def add_med(self):
        vals = self.med_values()
        if vals:
            query("INSERT INTO medicine(name,company,type,price,quantity,expiry) "
                  "VALUES(%s,%s,%s,%s,%s,%s)", vals)
            self.clear_med()
            self.refresh_all()
            messagebox.showinfo("Success", "Medicine added")

    def update_med(self):
        sel = self.med_tree.focus()
        if not sel:
            return messagebox.showwarning("Select", "Select a medicine from the table first")
        vals = self.med_values()
        if vals:
            mid = self.med_tree.item(sel)["values"][0]
            query("UPDATE medicine SET name=%s,company=%s,type=%s,price=%s,quantity=%s,expiry=%s "
                  "WHERE id=%s", vals + (mid,))
            self.refresh_all()
            messagebox.showinfo("Success", "Medicine updated")

    def delete_med(self):
        sel = self.med_tree.focus()
        if not sel:
            return messagebox.showwarning("Select", "Select a medicine from the table first")
        mid = self.med_tree.item(sel)["values"][0]
        if messagebox.askyesno("Confirm", "Delete this medicine?"):
            try:
                query("DELETE FROM medicine WHERE id=%s", (mid,))
            except mysql.connector.Error:
                return messagebox.showerror(
                    "Error", "Cannot delete: this medicine is used in sales records.")
            self.clear_med()
            self.refresh_all()

    def clear_med(self):
        for v in self.med_vars.values():
            v.set("")

    def pick_med(self, _=None):
        sel = self.med_tree.focus()
        if sel:
            row = self.med_tree.item(sel)["values"]
            for f, val in zip(self.med_fields, row[1:]):
                self.med_vars[f].set("" if val in (None, "None") else val)

    def load_meds(self):
        self.med_tree.delete(*self.med_tree.get_children())
        key = f"%{self.med_search.get().strip()}%"
        rows = query("SELECT * FROM medicine WHERE name LIKE %s OR company LIKE %s OR type LIKE %s "
                     "ORDER BY id", (key, key, key), fetch=True)
        for r in rows:
            tag = ("low",) if r[5] <= 10 else ()   # red row when stock <= 10
            self.med_tree.insert("", "end", values=r, tags=tag)


    # ------------------------------------------------------------------ COMMON
    def refresh_all(self):
        self.load_meds()


if __name__ == "__main__":
    try:
        init_db()
    except mysql.connector.Error as err:
        root = tk.Tk()
        root.withdraw()
        messagebox.showerror(
            "MySQL connection failed",
            f"{err}\n\nCheck that:\n1. MySQL Server is running\n"
            f"2. DB_PASSWORD at the top of this file is correct")
        raise SystemExit
    LoginWindow().mainloop()
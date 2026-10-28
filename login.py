"""
Pharmacy Management System  |  STEP 4: Database + Login
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
        tk.Label(self, text="Login successful. Database connected.",
                 font=("Arial", 14)).pack(pady=40)


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
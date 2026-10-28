import mysql.connector

DB_PASSWORD = "123456789"      # <-- your MySQL root password

try:
    con = mysql.connector.connect(host="localhost", user="root", password=DB_PASSWORD)
    print("SUCCESS: connected to MySQL, server version", con.get_server_info())
    con.close()
except mysql.connector.Error as err:
    print("FAILED:", err)
import os
from datetime import date, timedelta
from decimal import Decimal
from flask import Flask, render_template, request, redirect, flash, jsonify, abort
import mysql.connector

app = Flask(__name__)
app.secret_key = "petcare-dev-key"
app.config["SEND_FILE_MAX_AGE_DEFAULT"] = 0   # always load fresh CSS/JS
DB = dict(host=os.getenv("DB_HOST", "localhost"), user=os.getenv("DB_USER", "root"),
          password=os.getenv("DB_PASSWORD", "123456789"), database="petcare_db")


def run(sql, args=None, commit=False):
    cn = mysql.connector.connect(**DB)
    cur = cn.cursor(dictionary=True)
    try:
        cur.execute(sql, args or None)
        if commit:
            cn.commit()
            return cur.lastrowid
        return cur.fetchall()
    finally:
        cur.close()
        cn.close()


LK_OWNER = "SELECT owner_id v, CONCAT(first_name,' ',last_name) l FROM owner ORDER BY l"
LK_PET = "SELECT p.pet_id v, CONCAT(p.name,' (',o.first_name,')') l FROM pet p JOIN owner o ON o.owner_id=p.owner_id ORDER BY l"
LK_VET = "SELECT vet_id v, full_name l FROM veterinarian ORDER BY l"
LK_APPT = ("SELECT a.appointment_id v, CONCAT('#',a.appointment_id,' ',p.name,' - ',a.appt_date) l FROM appointment a "
           "JOIN pet p ON p.pet_id=a.pet_id WHERE a.status<>'Cancelled' "
           "AND a.appointment_id NOT IN (SELECT appointment_id FROM treatment)")
LK_TREAT = "SELECT treatment_id v, CONCAT('#',treatment_id,' ',diagnosis) l FROM treatment"
LK_TREAT_NB = LK_TREAT + " WHERE treatment_id NOT IN (SELECT treatment_id FROM bill)"
LK_MED = "SELECT medicine_id v, CONCAT(name,' (stock ',stock_qty,')') l FROM medicine ORDER BY name"

# field = (column, label, input-type, extra)   types: text/email/number/date/time/tel/select(sql)/enum(list)
E = {
    "owners": dict(title="Owners", icon="👤", table="owner", pk="owner_id",
        sql="""SELECT o.owner_id ID, CONCAT(o.first_name,' ',o.last_name) Name, o.email Email,
               GROUP_CONCAT(p.phone SEPARATOR ', ') Phones, o.address Address
               FROM owner o LEFT JOIN owner_phone p ON p.owner_id=o.owner_id GROUP BY o.owner_id""",
        fields=[("first_name", "First name", "text", None), ("last_name", "Last name", "text", None),
                ("email", "Email", "email", None), ("address", "Address", "text", None),
                ("phone", "Phone", "tel", None)]),
    "pets": dict(title="Pets", icon="🐶", table="pet", pk="pet_id",
        sql="""SELECT p.pet_id ID, p.name Name, p.species Species, p.breed Breed, p.gender Gender,
               fn_pet_age(p.birth_date) `Age (yrs)`, p.weight_kg `Weight (kg)`,
               CONCAT(o.first_name,' ',o.last_name) Owner
               FROM pet p JOIN owner o ON o.owner_id=p.owner_id ORDER BY p.pet_id""",
        fields=[("owner_id", "Owner", "select", LK_OWNER), ("name", "Pet name", "text", None),
                ("species", "Species", "enum", ["Dog", "Cat", "Rabbit", "Bird", "Hamster", "Turtle"]),
                ("breed", "Breed", "text", None), ("gender", "Gender", "enum", ["Male", "Female"]),
                ("birth_date", "Birth date", "date", None), ("weight_kg", "Weight (kg)", "number", None)]),
    "vets": dict(title="Veterinarians", icon="🩺", table="veterinarian", pk="vet_id",
        sql="""SELECT vet_id ID, full_name Name, specialization Specialization, email Email,
               phone Phone, consultation_fee `Fee` FROM veterinarian""",
        fields=[("full_name", "Full name", "text", None), ("specialization", "Specialization", "text", None),
                ("email", "Email", "email", None), ("phone", "Phone", "tel", None),
                ("consultation_fee", "Fee", "number", None)]),
    "appointments": dict(title="Appointments", icon="📅", table="appointment", pk="appointment_id",
        sql="""SELECT appointment_id ID, appt_date Day, appt_time Slot, pet_name Pet, owner_name Owner,
               vet_name Vet, reason Reason, status Status FROM vw_appointment_details
               ORDER BY appt_date DESC, appt_time""",
        fields=[("pet_id", "Pet", "select", LK_PET), ("vet_id", "Veterinarian", "select", LK_VET),
                ("appt_date", "Date", "date", None), ("appt_time", "Time", "time", None),
                ("reason", "Reason", "text", None)]),
    "treatments": dict(title="Treatments", icon="💉", table="treatment", pk="treatment_id",
        sql="""SELECT t.treatment_id ID, p.name Pet, t.diagnosis Diagnosis, t.procedure_name `Procedure`,
               t.procedure_cost Cost, t.treated_on Treated
               FROM treatment t JOIN appointment a ON a.appointment_id=t.appointment_id
               JOIN pet p ON p.pet_id=a.pet_id ORDER BY t.treatment_id""",
        fields=[("appointment_id", "Appointment", "select", LK_APPT), ("diagnosis", "Diagnosis", "text", None),
                ("procedure_name", "Procedure", "text", None), ("procedure_cost", "Cost", "number", None),
                ("treated_on", "Date", "date", None)]),
    "prescriptions": dict(title="Prescriptions", icon="📝", table="treatment_medicine", pk=None,
        sql="""SELECT tm.treatment_id Treatment, m.name Medicine, tm.quantity Qty, tm.dosage Dosage,
               m.stock_qty `Stock left` FROM treatment_medicine tm
               JOIN medicine m ON m.medicine_id=tm.medicine_id ORDER BY tm.treatment_id""",
        fields=[("treatment_id", "Treatment", "select", LK_TREAT), ("medicine_id", "Medicine", "select", LK_MED),
                ("quantity", "Quantity", "number", None), ("dosage", "Dosage", "text", None)]),
    "medicines": dict(title="Medicines", icon="💊", table="medicine", pk="medicine_id",
        sql="""SELECT medicine_id ID, name Name, category Category, unit_price Price, stock_qty Stock,
               reorder_level `Reorder at`, expiry_date Expiry FROM medicine""",
        fields=[("name", "Name", "text", None), ("category", "Category", "text", None),
                ("unit_price", "Unit price", "number", None), ("stock_qty", "Stock", "number", None),
                ("reorder_level", "Reorder level", "number", None), ("expiry_date", "Expiry", "date", None)]),
    "bills": dict(title="Billing", icon="🧾", table="bill", pk="bill_id",
        sql="""SELECT b.bill_id ID, p.name Pet, CONCAT(o.first_name,' ',o.last_name) Owner, b.bill_date Billed,
               b.consultation_fee Consult, b.procedure_cost `Procedure fee`, b.medicine_cost Medicine,
               b.total_amount Total, b.payment_status Status, b.payment_method Method
               FROM bill b JOIN treatment t ON t.treatment_id=b.treatment_id
               JOIN appointment a ON a.appointment_id=t.appointment_id
               JOIN pet p ON p.pet_id=a.pet_id JOIN owner o ON o.owner_id=p.owner_id ORDER BY b.bill_id""",
        fields=[("treatment_id", "Treatment", "select", LK_TREAT_NB)]),
}


@app.context_processor
def inject_nav():
    return dict(nav=[("/", "🏠", "Dashboard")] + [(f"/{k}", v["icon"], v["title"]) for k, v in E.items()]
                + [("/reports", "📊", "Reports")])


def ent(name):
    return E.get(name) or abort(404)


def field(f):
    col, label, typ, extra = f
    d = dict(col=col, label=label, type=typ, opts=extra)
    if typ == "select":
        d["opts"] = run(extra)
    return d


@app.route("/")
def dashboard():
    s = run("""SELECT (SELECT COUNT(*) FROM owner) owners, (SELECT COUNT(*) FROM pet) pets,
        (SELECT COUNT(*) FROM appointment WHERE status='Scheduled') upcoming,
        (SELECT COALESCE(SUM(total_amount),0) FROM bill WHERE payment_status='Paid') revenue,
        (SELECT COALESCE(SUM(total_amount),0) FROM bill WHERE payment_status='Unpaid') pending,
        (SELECT COUNT(*) FROM vw_low_stock) lowstock""")[0]
    upcoming = run("SELECT * FROM vw_appointment_details WHERE status='Scheduled' ORDER BY appt_date, appt_time LIMIT 6")
    low = run("SELECT name, stock_qty, reorder_level FROM vw_low_stock ORDER BY stock_qty")
    unpaid = run("SELECT bill_id, owner_name, pet_name, total_amount FROM vw_unpaid_bills ORDER BY bill_date")
    return render_template("dashboard.html", s=s, upcoming=upcoming, low=low, unpaid=unpaid, title="Dashboard")


@app.route("/api/charts")
def charts():
    return jsonify(
        species=run("SELECT species label, COUNT(*) value FROM pet GROUP BY species"),
        status=run("SELECT status label, COUNT(*) value FROM appointment GROUP BY status"),
        revenue=run("SELECT DATE_FORMAT(bill_date,'%Y-%m') label, SUM(total_amount) value FROM bill GROUP BY label ORDER BY label"),
        meds=run("""SELECT m.name label, SUM(tm.quantity) value FROM treatment_medicine tm
                    JOIN medicine m ON m.medicine_id=tm.medicine_id GROUP BY m.medicine_id, m.name
                    ORDER BY value DESC LIMIT 5"""))


@app.route("/<name>")
def listing(name):
    e = ent(name)
    rows = run(e["sql"])
    return render_template("table.html", name=name, e=e, rows=rows, title=e["title"],
                           cols=list(rows[0].keys()) if rows else [], fields=[field(f) for f in e["fields"]])


def attempt(fn, ok):
    try:
        fn()
        flash(ok, "ok")
    except mysql.connector.Error as ex:
        flash(ex.msg, "error")


@app.post("/<name>/add")
def add(name):
    e, f = ent(name), request.form

    def go():
        if name == "appointments":
            run("CALL sp_book_appointment(%s,%s,%s,%s,%s)",
                (f["pet_id"], f["vet_id"], f["appt_date"], f["appt_time"], f["reason"]), commit=True)
            return
        cols = [c for c, _, t, _ in e["fields"] if t != "tel" or name == "vets"]
        vals = [f[c] or None for c in cols]
        new_id = run(f"INSERT INTO {e['table']} ({','.join(cols)}) VALUES ({','.join(['%s'] * len(cols))})",
                     vals, commit=True)
        if name == "owners":
            run("INSERT INTO owner_phone(owner_id,phone) VALUES (%s,%s)", (new_id, f["phone"]), commit=True)

    attempt(go, "Record added successfully")
    return redirect(f"/{name}")


@app.post("/<name>/delete/<int:rid>")
def delete(name, rid):
    e = ent(name)
    if not e["pk"]:
        abort(405)
    attempt(lambda: run(f"DELETE FROM {e['table']} WHERE {e['pk']}=%s", (rid,), commit=True), "Record deleted")
    return redirect(f"/{name}")


@app.post("/appointments/<int:rid>/cancel")
def cancel(rid):
    attempt(lambda: run("UPDATE appointment SET status='Cancelled' WHERE appointment_id=%s AND status='Scheduled'",
                        (rid,), commit=True), "Appointment cancelled")
    return redirect("/appointments")


@app.post("/bills/<int:rid>/pay")
def pay(rid):
    attempt(lambda: run("CALL sp_pay_bill(%s,%s)", (rid, request.form["method"]), commit=True), "Payment recorded")
    return redirect("/bills")



def clean(v):
    if isinstance(v, timedelta):
        t = int(v.total_seconds())
        return f"{t // 3600:02d}:{t % 3600 // 60:02d}"
    if isinstance(v, date):
        return v.isoformat()
    if isinstance(v, Decimal):
        return float(v)
    return v


@app.get("/api/<name>/<int:rid>")
def api_row(name, rid):
    e = ent(name)
    if not e["pk"]:
        abort(404)
    r = run(f"SELECT * FROM {e['table']} WHERE {e['pk']}=%s", (rid,))
    if not r:
        abort(404)
    return jsonify({k: clean(v) for k, v in r[0].items()})


@app.post("/<name>/edit/<int:rid>")
def edit(name, rid):
    e, f = ent(name), request.form
    if not e["pk"] or name == "bills":
        abort(405)
    cols = [c for c, _, t, _ in e["fields"] if c in f and (t != "tel" or name == "vets")]

    def go():
        run(f"UPDATE {e['table']} SET {','.join(c + '=%s' for c in cols)} WHERE {e['pk']}=%s",
            [f[c] or None for c in cols] + [rid], commit=True)

    attempt(go, "Record updated successfully")
    return redirect(f"/{name}")


@app.route("/owners/<int:rid>")
def owner_profile(rid):
    o = run("SELECT o.*, fn_owner_due(o.owner_id) due FROM owner o WHERE owner_id=%s", (rid,))
    if not o:
        abort(404)
    o = o[0]
    phones = run("SELECT phone, phone_type FROM owner_phone WHERE owner_id=%s", (rid,))
    sections = [
        ("Pets", run("""SELECT pet_id ID, name Pet, species Species, breed Breed, fn_pet_age(birth_date) `Age (yrs)`,
                        weight_kg `Weight (kg)` FROM pet WHERE owner_id=%s""", (rid,)), "/pets/"),
        ("Appointments", run("""SELECT a.appt_date Day, a.appt_time Slot, p.name Pet, v.full_name Vet, a.reason Reason, a.status Status
                        FROM appointment a JOIN pet p ON p.pet_id=a.pet_id JOIN veterinarian v ON v.vet_id=a.vet_id
                        WHERE p.owner_id=%s ORDER BY a.appt_date DESC""", (rid,)), None),
        ("Bills", run("""SELECT b.bill_id Bill, p.name Pet, b.bill_date Billed, b.total_amount Total, b.payment_status Status
                        FROM bill b JOIN treatment t ON t.treatment_id=b.treatment_id
                        JOIN appointment a ON a.appointment_id=t.appointment_id JOIN pet p ON p.pet_id=a.pet_id
                        WHERE p.owner_id=%s ORDER BY b.bill_date DESC""", (rid,)), None)]
    info = [("Email", o["email"]), ("Address", o["address"]), ("Registered", o["registered_on"]),
            ("Phones", ", ".join(f"{x['phone']} ({x['phone_type']})" for x in phones) or "—"),
            ("Amount due", f"₹{o['due']}")]
    return render_template("profile.html", title=o["first_name"], kind="Owner", back="/owners",
                           name=f"{o['first_name']} {o['last_name']}", initials=o["first_name"][0] + o["last_name"][0],
                           info=info, sections=sections)


@app.route("/pets/<int:rid>")
def pet_profile(rid):
    p = run("""SELECT p.*, fn_pet_age(p.birth_date) age, CONCAT(o.first_name,' ',o.last_name) owner_name
               FROM pet p JOIN owner o ON o.owner_id=p.owner_id WHERE p.pet_id=%s""", (rid,))
    if not p:
        abort(404)
    p = p[0]
    sections = [
        ("Visit history", run("""SELECT a.appt_date Day, v.full_name Vet, a.reason Reason, t.diagnosis Diagnosis,
                        t.procedure_name `Procedure`, a.status Status
                        FROM appointment a JOIN veterinarian v ON v.vet_id=a.vet_id
                        LEFT JOIN treatment t ON t.appointment_id=a.appointment_id
                        WHERE a.pet_id=%s ORDER BY a.appt_date DESC""", (rid,)), None),
        ("Medicines given", run("""SELECT t.treated_on Date, m.name Medicine, tm.quantity Qty, tm.dosage Dosage
                        FROM treatment_medicine tm JOIN treatment t ON t.treatment_id=tm.treatment_id
                        JOIN appointment a ON a.appointment_id=t.appointment_id
                        JOIN medicine m ON m.medicine_id=tm.medicine_id
                        WHERE a.pet_id=%s ORDER BY t.treated_on DESC""", (rid,)), None)]
    info = [("Species", p["species"]), ("Breed", p["breed"]), ("Gender", p["gender"]), ("Age", f"{p['age']} yrs"),
            ("Weight", f"{p['weight_kg']} kg"), ("Owner", p["owner_name"]), ("Microchip", p["microchip_no"] or "—")]
    return render_template("profile.html", title=p["name"], kind="Pet", back="/pets", name=p["name"],
                           initials=p["name"][:2].upper(), info=info, sections=sections)


@app.route("/bills/<int:rid>/invoice")
def invoice(rid):
    b = run("""SELECT b.*, p.name pet_name, p.species, CONCAT(o.first_name,' ',o.last_name) owner_name, o.email, o.address,
               v.full_name vet_name, t.diagnosis, t.procedure_name
               FROM bill b JOIN treatment t ON t.treatment_id=b.treatment_id
               JOIN appointment a ON a.appointment_id=t.appointment_id JOIN pet p ON p.pet_id=a.pet_id
               JOIN owner o ON o.owner_id=p.owner_id JOIN veterinarian v ON v.vet_id=a.vet_id
               WHERE b.bill_id=%s""", (rid,))
    if not b:
        abort(404)
    items = run("""SELECT m.name, tm.quantity, m.unit_price, tm.quantity*m.unit_price amount
                   FROM treatment_medicine tm JOIN medicine m ON m.medicine_id=tm.medicine_id
                   WHERE tm.treatment_id=%s""", (b[0]["treatment_id"],))
    return render_template("invoice.html", b=b[0], items=items)


REPORTS = [
    ("Revenue by veterinarian", "VIEW + aggregate", "SELECT full_name AS Veterinarian, appointments AS Appointments, paid_revenue AS `Paid revenue (₹)` FROM vw_vet_revenue ORDER BY paid_revenue DESC"),
    ("Unpaid bills", "VIEW", "SELECT bill_id AS Bill, owner_name AS Owner, pet_name AS Pet, total_amount AS `Amount (₹)`, bill_date AS Billed FROM vw_unpaid_bills ORDER BY bill_date"),
    ("Low-stock medicines", "VIEW", "SELECT name AS Medicine, stock_qty AS Stock, reorder_level AS `Reorder at` FROM vw_low_stock ORDER BY stock_qty"),
    ("Owners with more than one pet", "GROUP BY + HAVING", "SELECT CONCAT(o.first_name,' ',o.last_name) AS Owner, COUNT(*) AS Pets FROM owner o JOIN pet p ON p.owner_id=o.owner_id GROUP BY o.owner_id, o.first_name, o.last_name HAVING COUNT(*) > 1"),
    ("Medicines priced above average", "SUBQUERY", "SELECT name AS Medicine, category AS Category, unit_price AS Price FROM medicine WHERE unit_price > (SELECT AVG(unit_price) FROM medicine) ORDER BY unit_price DESC"),
    ("Pets never treated", "LEFT JOIN", "SELECT p.name AS Pet, p.species AS Species FROM pet p LEFT JOIN appointment a ON a.pet_id=p.pet_id AND a.status='Completed' LEFT JOIN treatment t ON t.appointment_id=a.appointment_id WHERE t.treatment_id IS NULL"),
    ("Outstanding dues per owner", "STORED FUNCTION", "SELECT d.Owner, d.Due AS `Amount due (₹)` FROM (SELECT CONCAT(first_name,' ',last_name) AS Owner, fn_owner_due(owner_id) AS Due FROM owner) d WHERE d.Due > 0 ORDER BY d.Due DESC"),
    ("Vets with no cancelled appointments", "NOT EXISTS", "SELECT full_name AS Veterinarian, specialization AS Specialization FROM veterinarian v WHERE NOT EXISTS (SELECT 1 FROM appointment a WHERE a.vet_id=v.vet_id AND a.status='Cancelled')"),
]


@app.route("/reports")
def reports():
    data = []
    for title, tag, sql in REPORTS:
        try:
            data.append((title, tag, sql, run(sql)))
        except mysql.connector.Error as ex:
            data.append((title, tag, sql, []))
            flash(f"{title}: {ex.msg}", "error")
    return render_template("reports.html", data=data, title="Reports")


if __name__ == "__main__":
    app.run(debug=True)

from flask import Flask, render_template, request, redirect, url_for, session, flash
import mysql.connector
from mysql.connector import Error
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps

app = Flask(__name__)
app.secret_key = 'change-this-secret-key'

DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': '123456789',
    'database': 'campus_skill_exchange'
}

def get_db():
    return mysql.connector.connect(**DB_CONFIG)

def login_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        if 'student_id' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return wrapper

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        name = request.form['name'].strip()
        email = request.form['email'].strip().lower()
        phone = request.form['phone'].strip()
        department = request.form['department'].strip()
        year = request.form['year']
        division = request.form['division'].strip()
        password = request.form['password']

        if not all([name, email, department, year, division, password]):
            flash('Please fill all required fields.', 'danger')
            return redirect(url_for('register'))

        try:
            db = get_db(); cur = db.cursor()
            cur.execute('SELECT student_id FROM student WHERE email=%s', (email,))
            if cur.fetchone():
                flash('Email already registered.', 'danger')
                cur.close(); db.close()
                return redirect(url_for('register'))
            cur.execute('''INSERT INTO student(name,email,phone,department,year,division,password_hash)
                           VALUES(%s,%s,%s,%s,%s,%s,%s)''',
                        (name,email,phone,department,year,division,generate_password_hash(password)))
            db.commit(); cur.close(); db.close()
            flash('Registration successful. Please login.', 'success')
            return redirect(url_for('login'))
        except Error as e:
            flash(f'Database error: {e}', 'danger')
    return render_template('register.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form['email'].strip().lower()
        password = request.form['password']
        try:
            db = get_db(); cur = db.cursor(dictionary=True)
            cur.execute('SELECT * FROM student WHERE email=%s', (email,))
            user = cur.fetchone(); cur.close(); db.close()
            if user and check_password_hash(user['password_hash'], password):
                session['student_id'] = user['student_id']
                session['name'] = user['name']
                return redirect(url_for('dashboard'))
            flash('Invalid email or password.', 'danger')
        except Error as e:
            flash(f'Database error: {e}', 'danger')
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.clear(); return redirect(url_for('index'))

@app.route('/dashboard')
@login_required
def dashboard():
    db = get_db(); cur = db.cursor(dictionary=True)
    sid = session['student_id']
    cur.execute('SELECT * FROM student WHERE student_id=%s', (sid,)); student = cur.fetchone()
    cur.execute('''SELECT sk.skill_name, st.level FROM student_teaches st JOIN skill sk ON st.skill_id=sk.skill_id
                   WHERE st.student_id=%s ORDER BY sk.skill_name''', (sid,)); teaches = cur.fetchall()
    cur.execute('''SELECT sk.skill_name, sl.desired_level FROM student_learns sl JOIN skill sk ON sl.skill_id=sk.skill_id
                   WHERE sl.student_id=%s ORDER BY sk.skill_name''', (sid,)); learns = cur.fetchall()
    cur.execute('''SELECT COUNT(*) total FROM learning_request WHERE receiver_id=%s AND status='Pending' ''', (sid,)); pending = cur.fetchone()['total']
    cur.close(); db.close()
    return render_template('dashboard.html', student=student, teaches=teaches, learns=learns, pending=pending)

@app.route('/skills', methods=['GET','POST'])
@login_required
def skills():
    sid = session['student_id']; db = get_db(); cur = db.cursor(dictionary=True)
    if request.method == 'POST':
        skill_id = request.form['skill_id']; kind = request.form['kind']; level = request.form.get('level','Beginner')
        table = 'student_teaches' if kind == 'teach' else 'student_learns'
        col = 'level' if kind == 'teach' else 'desired_level'
        try:
            cur.execute(f'SELECT 1 FROM {table} WHERE student_id=%s AND skill_id=%s', (sid,skill_id))
            if cur.fetchone():
                flash('That skill is already in your list.', 'warning')
            else:
                cur.execute(f'INSERT INTO {table}(student_id,skill_id,{col}) VALUES(%s,%s,%s)', (sid,skill_id,level))
                db.commit(); flash('Skill added.', 'success')
        except Error as e: flash(f'Could not add skill: {e}', 'danger')
        cur.close(); db.close(); return redirect(url_for('skills'))
    cur.execute('SELECT * FROM skill ORDER BY skill_name'); all_skills = cur.fetchall()
    cur.execute('''SELECT st.skill_id, sk.skill_name, st.level FROM student_teaches st JOIN skill sk ON st.skill_id=sk.skill_id WHERE st.student_id=%s''',(sid,)); teaches=cur.fetchall()
    cur.execute('''SELECT sl.skill_id, sk.skill_name, sl.desired_level FROM student_learns sl JOIN skill sk ON sl.skill_id=sk.skill_id WHERE sl.student_id=%s''',(sid,)); learns=cur.fetchall()
    cur.close(); db.close()
    return render_template('skills.html', skills=all_skills, teaches=teaches, learns=learns)

@app.route('/skills/delete/<kind>/<int:skill_id>')
@login_required
def delete_skill(kind, skill_id):
    table = 'student_teaches' if kind == 'teach' else 'student_learns'
    db=get_db(); cur=db.cursor()
    cur.execute(f'DELETE FROM {table} WHERE student_id=%s AND skill_id=%s',(session['student_id'],skill_id)); db.commit(); cur.close(); db.close()
    return redirect(url_for('skills'))

@app.route('/matches')
@login_required
def matches():
    sid=session['student_id']; db=get_db(); cur=db.cursor(dictionary=True)
    # Match: people who teach something current user wants to learn.
    cur.execute('''SELECT DISTINCT s.student_id, s.name, s.department, s.year, sk.skill_name, st.level,
                   COALESCE(AVG(f.rating),0) rating
                   FROM student_learns me
                   JOIN student_teaches st ON st.skill_id=me.skill_id AND st.student_id<>me.student_id
                   JOIN student s ON s.student_id=st.student_id
                   JOIN skill sk ON sk.skill_id=st.skill_id
                   LEFT JOIN session se ON se.teacher_id=s.student_id AND se.skill_id=sk.skill_id
                   LEFT JOIN feedback f ON f.session_id=se.session_id
                   WHERE me.student_id=%s
                   GROUP BY s.student_id, s.name, s.department, s.year, sk.skill_name, st.level
                   ORDER BY rating DESC, s.name''',(sid,)); matches=cur.fetchall()
    cur.close(); db.close()
    return render_template('matches.html', matches=matches)

@app.route('/request/<int:receiver_id>/<int:skill_id>', methods=['POST'])
@login_required
def send_request(receiver_id, skill_id):
    sid=session['student_id']; message=request.form.get('message','')
    db=get_db(); cur=db.cursor()
    cur.execute('''SELECT request_id FROM learning_request WHERE sender_id=%s AND receiver_id=%s AND skill_id=%s AND status='Pending' ''',(sid,receiver_id,skill_id))
    if cur.fetchone():
        flash('You already have a pending request for this skill.', 'warning')
    else:
        cur.execute('''INSERT INTO learning_request(sender_id,receiver_id,skill_id,message,status) VALUES(%s,%s,%s,%s,'Pending')''',(sid,receiver_id,skill_id,message)); db.commit(); flash('Learning request sent.', 'success')
    cur.close(); db.close(); return redirect(url_for('matches'))

@app.route('/requests')
@login_required
def requests():
    sid=session['student_id']; db=get_db(); cur=db.cursor(dictionary=True)
    cur.execute('''SELECT lr.*, s1.name sender_name, s2.name receiver_name, sk.skill_name
                   FROM learning_request lr JOIN student s1 ON lr.sender_id=s1.student_id
                   JOIN student s2 ON lr.receiver_id=s2.student_id JOIN skill sk ON lr.skill_id=sk.skill_id
                   WHERE lr.sender_id=%s OR lr.receiver_id=%s ORDER BY lr.request_date DESC''',(sid,sid)); rows=cur.fetchall()
    cur.close(); db.close(); return render_template('requests.html', requests=rows, sid=sid)

@app.route('/request/<int:request_id>/<action>')
@login_required
def request_action(request_id, action):
    sid=session['student_id']; new_status={'accept':'Accepted','reject':'Rejected'}.get(action)
    if not new_status: return redirect(url_for('requests'))
    db=get_db(); cur=db.cursor()
    cur.execute('UPDATE learning_request SET status=%s WHERE request_id=%s AND receiver_id=%s AND status="Pending"',(new_status,request_id,sid)); db.commit(); cur.close(); db.close()
    return redirect(url_for('requests'))

@app.route('/sessions', methods=['GET','POST'])
@login_required
def sessions():
    sid=session['student_id']; db=get_db(); cur=db.cursor(dictionary=True)
    if request.method=='POST':
        rid=request.form['request_id']; date=request.form['session_date']; start=request.form['start_time']; duration=request.form['duration']; mode=request.form['mode']; link=request.form.get('meeting_link','')
        cur.execute('SELECT sender_id,receiver_id,skill_id FROM learning_request WHERE request_id=%s AND status="Accepted"',(rid,)); r=cur.fetchone()
        if r and sid in (r['sender_id'],r['receiver_id']):
            teacher=r['receiver_id']; learner=r['sender_id']
            cur.execute('''INSERT INTO session(request_id,teacher_id,learner_id,skill_id,session_date,start_time,duration,mode,meeting_link,status)
                           VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,'Scheduled')''',(rid,teacher,learner,r['skill_id'],date,start,duration,mode,link)); db.commit(); flash('Session scheduled.','success')
        else: flash('Invalid accepted request.','danger')
        cur.close(); db.close(); return redirect(url_for('sessions'))
    cur.execute('''SELECT lr.request_id, s.name partner_name, sk.skill_name FROM learning_request lr
                   JOIN student s ON s.student_id=IF(lr.sender_id=%s,lr.receiver_id,lr.sender_id)
                   JOIN skill sk ON sk.skill_id=lr.skill_id WHERE (lr.sender_id=%s OR lr.receiver_id=%s) AND lr.status='Accepted' ''',(sid,sid,sid)); accepted=cur.fetchall()
    cur.execute('''SELECT se.*, sk.skill_name, t.name teacher_name, l.name learner_name FROM session se JOIN skill sk ON se.skill_id=sk.skill_id
                   JOIN student t ON se.teacher_id=t.student_id JOIN student l ON se.learner_id=l.student_id
                   WHERE se.teacher_id=%s OR se.learner_id=%s ORDER BY se.session_date DESC,se.start_time DESC''',(sid,sid)); rows=cur.fetchall()
    cur.close(); db.close(); return render_template('sessions.html', accepted=accepted, sessions=rows)

@app.route('/feedback/<int:session_id>', methods=['POST'])
@login_required
def feedback(session_id):
    rating=int(request.form['rating']); comment=request.form.get('comment','').strip(); sid=session['student_id']
    db=get_db(); cur=db.cursor()
    cur.execute('SELECT 1 FROM session WHERE session_id=%s AND (teacher_id=%s OR learner_id=%s)',(session_id,sid,sid))
    if cur.fetchone():
        cur.execute('SELECT feedback_id FROM feedback WHERE session_id=%s AND student_id=%s',(session_id,sid))
        if not cur.fetchone():
            cur.execute('INSERT INTO feedback(session_id,student_id,rating,comment) VALUES(%s,%s,%s,%s)',(session_id,sid,rating,comment)); db.commit(); flash('Feedback submitted.','success')
    cur.close(); db.close(); return redirect(url_for('sessions'))

if __name__ == '__main__':
    app.run(debug=True)

/**
 * Student Survival System - Relational Database Engine & Seed Data
 * Department of Computer Science and Business Systems, JSPM's RSCOE Pune
 * Academic Year 2026-27 | DBMS Project
 * Authors: Vaidehi Pravin Jirwankar (RBT25CB054) & Manaswi Kadu (RBT25CB055)
 */

const STORAGE_KEY = 'sss_dbms_database_v1';

// Default initial relational database schema & seed data
const DEFAULT_DATABASE = {
  students: [
    {
      student_id: 1,
      prn: 'RBT25CB054',
      name: 'Vaidehi Pravin Jirwankar',
      email: 'vaidehi.jirwankar@rscoe.jspm.edu.in',
      branch: 'Computer Science and Business Systems',
      semester: 4,
      avatar: '👩‍🎓'
    },
    {
      student_id: 2,
      prn: 'RBT25CB055',
      name: 'Manaswi Kadu',
      email: 'manaswi.kadu@rscoe.jspm.edu.in',
      branch: 'Computer Science and Business Systems',
      semester: 4,
      avatar: '👩‍💻'
    }
  ],

  subjects: [
    { subject_id: 1, subject_code: 'CSBS401', subject_name: 'Operating Systems', credits: 4, semester: 4, faculty: 'Prof. R. Sharma' },
    { subject_id: 2, subject_code: 'CSBS402', subject_name: 'Engineering Mathematics', credits: 4, semester: 4, faculty: 'Dr. V. Kulkarni' },
    { subject_id: 3, subject_code: 'CSBS403', subject_name: 'Data Structures', credits: 4, semester: 4, faculty: 'Prof. A. Patil' },
    { subject_id: 4, subject_code: 'CSBS404', subject_name: 'Database Management System', credits: 4, semester: 4, faculty: 'Prof. Rutuja S. Bachhav' },
    { subject_id: 5, subject_code: 'CSBS405', subject_name: 'Software Engineering', credits: 3, semester: 4, faculty: 'Prof. S. Joshi' },
    { subject_id: 6, subject_code: 'CSBS406', subject_name: 'Business Communication', credits: 2, semester: 4, faculty: 'Prof. M. Deshmukh' }
  ],

  // Attendance records
  // We'll generate realistic attendance series matching slide 9 sample data:
  // Subject 1 (OS): 17 Present out of 25 = 68.00%
  // Subject 2 (Engg Maths): 22 Present out of 28 = ~79.00%
  // Subject 3 (Data Structures): 13 Present out of 20 = ~66.50% (approx 13.3/20)
  // Subject 4 (DBMS): 22 Present out of 25 = 88.00%
  // Subject 5 (Software Eng): 19 Present out of 22 = 86.36%
  // Subject 6 (Business Comm): 18 Present out of 20 = 90.00%
  attendance: [],

  // Assignments
  assignments: [
    {
      assignment_id: 1,
      student_id: 1,
      subject_id: 4,
      title: 'ER Diagram & Relational Schema Modeling for Survival System',
      due_date: '2026-10-24',
      submitted_on: '2026-10-20',
      status: 'Submitted',
      max_score: 25,
      score: 24
    },
    {
      assignment_id: 2,
      student_id: 1,
      subject_id: 1,
      title: 'Process Synchronization & Semaphore Implementation in C',
      due_date: '2026-10-26',
      submitted_on: null,
      status: 'Pending',
      max_score: 25,
      score: null
    },
    {
      assignment_id: 3,
      student_id: 1,
      subject_id: 3,
      title: 'B-Trees and AVL Trees Balancing Simulator Assignment',
      due_date: '2026-10-28',
      submitted_on: null,
      status: 'Pending',
      max_score: 25,
      score: null
    },
    {
      assignment_id: 4,
      student_id: 1,
      subject_id: 2,
      title: 'Fourier Transform & Partial Differential Equations Problem Set',
      due_date: '2026-10-22',
      submitted_on: null,
      status: 'Pending',
      max_score: 25,
      score: null
    },
    {
      assignment_id: 5,
      student_id: 1,
      subject_id: 5,
      title: 'Agile Sprint Planning & User Story Mapping Report',
      due_date: '2026-11-02',
      submitted_on: '2026-10-18',
      status: 'Submitted',
      max_score: 25,
      score: 23
    },
    {
      assignment_id: 6,
      student_id: 1,
      subject_id: 6,
      title: 'Case Analysis: Business Ethics in Autonomous Systems',
      due_date: '2026-11-05',
      submitted_on: '2026-10-15',
      status: 'Submitted',
      max_score: 25,
      score: 25
    },
    // Seed for Student 2 (Manaswi)
    {
      assignment_id: 7,
      student_id: 2,
      subject_id: 4,
      title: 'ER Diagram & Relational Schema Modeling for Survival System',
      due_date: '2026-10-24',
      submitted_on: '2026-10-20',
      status: 'Submitted',
      max_score: 25,
      score: 25
    },
    {
      assignment_id: 8,
      student_id: 2,
      subject_id: 1,
      title: 'Process Synchronization & Semaphore Implementation in C',
      due_date: '2026-10-26',
      submitted_on: null,
      status: 'Pending',
      max_score: 25,
      score: null
    },
    {
      assignment_id: 9,
      student_id: 2,
      subject_id: 3,
      title: 'B-Trees and AVL Trees Balancing Simulator Assignment',
      due_date: '2026-10-28',
      submitted_on: '2026-10-21',
      status: 'Submitted',
      max_score: 25,
      score: 22
    }
  ],

  // Exams
  exams: [
    { exam_id: 1, subject_id: 1, exam_type: 'In-Sem Exam', exam_date: '2026-09-15', max_marks: 30 },
    { exam_id: 2, subject_id: 1, exam_type: 'Unit Test 1', exam_date: '2026-08-20', max_marks: 20 },
    { exam_id: 3, subject_id: 2, exam_type: 'In-Sem Exam', exam_date: '2026-09-17', max_marks: 30 },
    { exam_id: 4, subject_id: 2, exam_type: 'Unit Test 1', exam_date: '2026-08-22', max_marks: 20 },
    { exam_id: 5, subject_id: 3, exam_type: 'In-Sem Exam', exam_date: '2026-09-19', max_marks: 30 },
    { exam_id: 6, subject_id: 3, exam_type: 'Unit Test 1', exam_date: '2026-08-25', max_marks: 20 },
    { exam_id: 7, subject_id: 4, exam_type: 'In-Sem Exam', exam_date: '2026-09-22', max_marks: 30 },
    { exam_id: 8, subject_id: 4, exam_type: 'Unit Test 1', exam_date: '2026-08-28', max_marks: 20 },
    { exam_id: 9, subject_id: 5, exam_type: 'In-Sem Exam', exam_date: '2026-09-24', max_marks: 30 },
    { exam_id: 10, subject_id: 6, exam_type: 'In-Sem Exam', exam_date: '2026-09-26', max_marks: 30 }
  ],

  // Marks obtained by students
  // Matching slide 9:
  // OS (Sub 1): marks_pct = 55.00% (In-Sem 16.5/30, Unit Test 11/20 -> total 27.5/50 = 55.00%)
  // Engg Maths (Sub 2): marks_pct = 34.00% (In-Sem 10.2/30, Unit Test 6.8/20 -> total 17/50 = 34.00%)
  // Data Structures (Sub 3): marks_pct = 38.00% (In-Sem 11.4/30, Unit Test 7.6/20 -> total 19/50 = 38.00%)
  // DBMS (Sub 4): marks_pct = 82.00% (In-Sem 25/30, Unit Test 16/20 -> total 41/50 = 82.00%)
  // Software Eng (Sub 5): marks_pct = 76.67% (In-Sem 23/30)
  // Business Comm (Sub 6): marks_pct = 86.67% (In-Sem 26/30)
  marks: [
    // Student 1 (Vaidehi)
    { mark_id: 1, student_id: 1, exam_id: 1, marks_obtained: 16.5 },
    { mark_id: 2, student_id: 1, exam_id: 2, marks_obtained: 11.0 },
    { mark_id: 3, student_id: 1, exam_id: 3, marks_obtained: 10.2 },
    { mark_id: 4, student_id: 1, exam_id: 4, marks_obtained: 6.8 },
    { mark_id: 5, student_id: 1, exam_id: 5, marks_obtained: 11.4 },
    { mark_id: 6, student_id: 1, exam_id: 6, marks_obtained: 7.6 },
    { mark_id: 7, student_id: 1, exam_id: 7, marks_obtained: 25.0 },
    { mark_id: 8, student_id: 1, exam_id: 8, marks_obtained: 16.0 },
    { mark_id: 9, student_id: 1, exam_id: 9, marks_obtained: 23.0 },
    { mark_id: 10, student_id: 1, exam_id: 10, marks_obtained: 26.0 },

    // Student 2 (Manaswi) - Good academic standing
    { mark_id: 11, student_id: 2, exam_id: 1, marks_obtained: 24.0 },
    { mark_id: 12, student_id: 2, exam_id: 2, marks_obtained: 17.0 },
    { mark_id: 13, student_id: 2, exam_id: 3, marks_obtained: 22.0 },
    { mark_id: 14, student_id: 2, exam_id: 4, marks_obtained: 15.0 },
    { mark_id: 15, student_id: 2, exam_id: 5, marks_obtained: 26.0 },
    { mark_id: 16, student_id: 2, exam_id: 6, marks_obtained: 18.0 },
    { mark_id: 17, student_id: 2, exam_id: 7, marks_obtained: 27.0 },
    { mark_id: 18, student_id: 2, exam_id: 8, marks_obtained: 18.0 },
    { mark_id: 19, student_id: 2, exam_id: 9, marks_obtained: 25.0 },
    { mark_id: 20, student_id: 2, exam_id: 10, marks_obtained: 28.0 }
  ]
};

// Populate attendance records programmatically to hit exact target percentages
function generateAttendanceSeed() {
  const records = [];
  let attId = 1;

  // Student 1 targets:
  // Sub 1 (OS): 17 Present, 8 Absent (Total 25) -> 68.00%
  // Sub 2 (Engg Maths): 22 Present, 6 Absent (Total 28) -> 78.57% ~ 79.00%
  // Sub 3 (Data Structures): 13 Present, 7 Absent (Total 20) -> 65.00% ~ 66.50%
  // Sub 4 (DBMS): 22 Present, 3 Absent (Total 25) -> 88.00%
  // Sub 5 (Software Eng): 19 Present, 3 Absent (Total 22) -> 86.36%
  // Sub 6 (Business Comm): 18 Present, 2 Absent (Total 20) -> 90.00%
  const student1Config = [
    { subId: 1, total: 25, present: 17 },
    { subId: 2, total: 28, present: 22 },
    { subId: 3, total: 20, present: 13 },
    { subId: 4, total: 25, present: 22 },
    { subId: 5, total: 22, present: 19 },
    { subId: 6, total: 20, present: 18 }
  ];

  const startDate = new Date('2026-08-01');

  student1Config.forEach(cfg => {
    let pCount = 0;
    for (let day = 0; day < cfg.total; day++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + day * 3);
      const dateStr = d.toISOString().split('T')[0];
      const isPresent = (pCount < cfg.present);
      pCount++;
      records.push({
        attendance_id: attId++,
        student_id: 1,
        subject_id: cfg.subId,
        lecture_date: dateStr,
        status: isPresent ? 'Present' : 'Absent'
      });
    }
  });

  // Student 2 (Manaswi) config: all above 80%
  const student2Config = [
    { subId: 1, total: 25, present: 21 }, // 84%
    { subId: 2, total: 28, present: 24 }, // 85.7%
    { subId: 3, total: 20, present: 17 }, // 85%
    { subId: 4, total: 25, present: 23 }, // 92%
    { subId: 5, total: 22, present: 20 }, // 90.9%
    { subId: 6, total: 20, present: 19 }  // 95%
  ];

  student2Config.forEach(cfg => {
    let pCount = 0;
    for (let day = 0; day < cfg.total; day++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + day * 3);
      const dateStr = d.toISOString().split('T')[0];
      const isPresent = (pCount < cfg.present);
      pCount++;
      records.push({
        attendance_id: attId++,
        student_id: 2,
        subject_id: cfg.subId,
        lecture_date: dateStr,
        status: isPresent ? 'Present' : 'Absent'
      });
    }
  });

  return records;
}

DEFAULT_DATABASE.attendance = generateAttendanceSeed();

/**
 * DBMS Relational Database Engine class
 */
class StudentSurvivalDB {
  constructor() {
    this.data = this.load();
  }

  load() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to load from localStorage:', e);
    }
    const fresh = JSON.parse(JSON.stringify(DEFAULT_DATABASE));
    this.save(fresh);
    return fresh;
  }

  save(dataToSave) {
    if (dataToSave) this.data = dataToSave;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  }

  reset() {
    localStorage.removeItem(STORAGE_KEY);
    this.data = JSON.parse(JSON.stringify(DEFAULT_DATABASE));
    this.save();
    return this.data;
  }

  // --- SQL Views Implementations ---

  /**
   * CREATE VIEW vw_attendance_summary AS
   * SELECT student_id, subject_id,
   *   ROUND(SUM(status = 'Present') * 100 / COUNT(*), 2) AS attendance_pct,
   *   SUM(status = 'Present') AS attended_lectures,
   *   COUNT(*) AS total_lectures
   * FROM Attendance
   * GROUP BY student_id, subject_id;
   */
  getViewAttendanceSummary(studentId = null) {
    const map = {};
    const attList = this.data.attendance.filter(a => !studentId || a.student_id === Number(studentId));

    attList.forEach(att => {
      const key = `${att.student_id}_${att.subject_id}`;
      if (!map[key]) {
        map[key] = {
          student_id: att.student_id,
          subject_id: att.subject_id,
          total_lectures: 0,
          attended_lectures: 0,
          absent_lectures: 0
        };
      }
      map[key].total_lectures++;
      if (att.status === 'Present') {
        map[key].attended_lectures++;
      } else {
        map[key].absent_lectures++;
      }
    });

    const result = Object.values(map).map(item => {
      const sub = this.data.subjects.find(s => s.subject_id === item.subject_id) || {};
      const stud = this.data.students.find(s => s.student_id === item.student_id) || {};
      const pct = item.total_lectures > 0 
        ? Math.round((item.attended_lectures * 100 / item.total_lectures) * 100) / 100 
        : 0;

      // Calculate lectures needed to reach 75% or bunkable classes
      // If pct < 75: need (0.75 * (total + x) - attended) / (1 - 0.75) = (3*total - 4*attended)
      let lectures_needed = 0;
      let bunkable = 0;
      if (pct < 75) {
        lectures_needed = Math.max(0, Math.ceil(3 * item.total_lectures - 4 * item.attended_lectures));
      } else {
        // can bunk: floor((attended - 0.75 * total) / 0.75)
        bunkable = Math.max(0, Math.floor((item.attended_lectures - 0.75 * item.total_lectures) / 0.75));
      }

      return {
        ...item,
        subject_name: sub.subject_name || `Subject ${item.subject_id}`,
        subject_code: sub.subject_code || '',
        faculty: sub.faculty || '',
        student_name: stud.name || '',
        attendance_pct: pct,
        is_at_risk: pct < 75,
        lectures_needed,
        bunkable
      };
    });

    return result.sort((a, b) => a.subject_id - b.subject_id);
  }

  /**
   * CREATE VIEW vw_marks_summary AS
   * SELECT m.student_id, e.subject_id,
   *   ROUND(SUM(m.marks_obtained) * 100 / SUM(e.max_marks), 2) AS marks_pct,
   *   SUM(m.marks_obtained) AS total_obtained,
   *   SUM(e.max_marks) AS total_max
   * FROM Marks m
   * JOIN Exams e ON m.exam_id = e.exam_id
   * GROUP BY m.student_id, e.subject_id;
   */
  getViewMarksSummary(studentId = null) {
    const map = {};
    const marksList = this.data.marks.filter(m => !studentId || m.student_id === Number(studentId));

    marksList.forEach(m => {
      const exam = this.data.exams.find(e => e.exam_id === m.exam_id);
      if (!exam) return;
      const key = `${m.student_id}_${exam.subject_id}`;
      if (!map[key]) {
        map[key] = {
          student_id: m.student_id,
          subject_id: exam.subject_id,
          total_obtained: 0,
          total_max: 0,
          exam_details: []
        };
      }
      map[key].total_obtained += Number(m.marks_obtained);
      map[key].total_max += Number(exam.max_marks);
      map[key].exam_details.push({
        exam_id: exam.exam_id,
        exam_type: exam.exam_type,
        marks_obtained: m.marks_obtained,
        max_marks: exam.max_marks,
        exam_date: exam.exam_date
      });
    });

    const result = Object.values(map).map(item => {
      const sub = this.data.subjects.find(s => s.subject_id === item.subject_id) || {};
      const stud = this.data.students.find(s => s.student_id === item.student_id) || {};
      const pct = item.total_max > 0
        ? Math.round((item.total_obtained * 100 / item.total_max) * 100) / 100
        : 0;

      return {
        ...item,
        subject_name: sub.subject_name || `Subject ${item.subject_id}`,
        subject_code: sub.subject_code || '',
        student_name: stud.name || '',
        marks_pct: pct,
        is_at_risk: pct < 40
      };
    });

    return result.sort((a, b) => a.subject_id - b.subject_id);
  }

  /**
   * CREATE VIEW vw_at_risk_subjects AS
   * Combines attendance & marks summaries with risk classification
   */
  getViewAtRiskSubjects(studentId = null, attThreshold = 75, marksThreshold = 40) {
    const attSummary = this.getViewAttendanceSummary(studentId);
    const marksSummary = this.getViewMarksSummary(studentId);

    const subjects = this.data.subjects;
    const atRiskList = [];

    subjects.forEach(sub => {
      const att = attSummary.find(a => a.subject_id === sub.subject_id);
      const mk = marksSummary.find(m => m.subject_id === sub.subject_id);

      const attPct = att ? att.attendance_pct : 0;
      const marksPct = mk ? mk.marks_pct : 0;

      const isLowAtt = attPct < attThreshold;
      const isLowMarks = marksPct < marksThreshold;

      if (isLowAtt || isLowMarks) {
        let riskReason = '';
        let severity = 'warning'; // warning or critical

        if (isLowAtt && isLowMarks) {
          riskReason = 'Attendance & Marks';
          severity = 'critical';
        } else if (isLowAtt) {
          riskReason = 'Low Attendance';
          severity = 'warning';
        } else {
          riskReason = 'Low Marks';
          severity = 'warning';
        }

        atRiskList.push({
          subject_id: sub.subject_id,
          subject_code: sub.subject_code,
          subject_name: sub.subject_name,
          faculty: sub.faculty,
          attendance_pct: attPct,
          marks_pct: marksPct,
          attended_lectures: att ? att.attended_lectures : 0,
          total_lectures: att ? att.total_lectures : 0,
          lectures_needed: att ? att.lectures_needed : 0,
          marks_obtained: mk ? mk.total_obtained : 0,
          max_marks: mk ? mk.total_max : 0,
          risk_reason: riskReason,
          severity
        });
      }
    });

    return atRiskList;
  }

  // --- Stored Procedures Implementations ---

  /**
   * CALL sp_get_at_risk_subjects(student_id, att_threshold, marks_threshold);
   */
  spGetAtRiskSubjects(studentId, attThreshold = 75, marksThreshold = 40) {
    return this.getViewAtRiskSubjects(studentId, attThreshold, marksThreshold);
  }

  /**
   * CALL sp_upcoming_deadlines(student_id, days_ahead);
   */
  spUpcomingDeadlines(studentId, daysAhead = 7) {
    const today = new Date('2026-10-21'); // Current academic reference date
    const targetDate = new Date(today);
    targetDate.setDate(targetDate.getDate() + Number(daysAhead));

    return this.data.assignments
      .filter(a => a.student_id === Number(studentId) && a.status !== 'Submitted')
      .map(a => {
        const sub = this.data.subjects.find(s => s.subject_id === a.subject_id) || {};
        const due = new Date(a.due_date);
        const diffTime = due - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let urgency = 'normal';
        if (diffDays < 0) urgency = 'overdue';
        else if (diffDays <= 2) urgency = 'critical';
        else if (diffDays <= 5) urgency = 'warning';

        return {
          ...a,
          subject_code: sub.subject_code,
          subject_name: sub.subject_name,
          days_left: diffDays,
          urgency
        };
      })
      .filter(a => a.days_left <= Number(daysAhead))
      .sort((a, b) => a.days_left - b.days_left);
  }

  /**
   * CALL sp_mark_attendance(student_id, subject_id, lecture_date, status);
   * Enforces UNIQUE(student_id, subject_id, lecture_date) constraint
   */
  spMarkAttendance(studentId, subjectId, lectureDate, status) {
    studentId = Number(studentId);
    subjectId = Number(subjectId);

    // Check unique constraint
    const existingIndex = this.data.attendance.findIndex(
      a => a.student_id === studentId && a.subject_id === subjectId && a.lecture_date === lectureDate
    );

    if (existingIndex >= 0) {
      // Update existing record
      this.data.attendance[existingIndex].status = status;
      this.save();
      return { success: true, message: `Updated attendance on ${lectureDate} to ${status}.`, updated: true };
    }

    const newId = this.data.attendance.length > 0 
      ? Math.max(...this.data.attendance.map(a => a.attendance_id)) + 1 
      : 1;

    this.data.attendance.push({
      attendance_id: newId,
      student_id: studentId,
      subject_id: subjectId,
      lecture_date: lectureDate,
      status: status
    });

    this.save();
    return { success: true, message: `Logged attendance for subject ${subjectId} on ${lectureDate} as ${status}.`, inserted: true };
  }

  // --- CRUD Helpers with DB Constraints ---

  submitAssignment(assignmentId) {
    const a = this.data.assignments.find(item => item.assignment_id === Number(assignmentId));
    if (a) {
      a.status = 'Submitted';
      a.submitted_on = '2026-10-21';
      this.save();
      return true;
    }
    return false;
  }

  addAssignment({ studentId, subjectId, title, dueDate, maxScore }) {
    const newId = this.data.assignments.length > 0
      ? Math.max(...this.data.assignments.map(a => a.assignment_id)) + 1
      : 1;
    this.data.assignments.push({
      assignment_id: newId,
      student_id: Number(studentId),
      subject_id: Number(subjectId),
      title: title.trim(),
      due_date: dueDate,
      submitted_on: null,
      status: 'Pending',
      max_score: Number(maxScore) || 25,
      score: null
    });
    this.save();
    return newId;
  }

  updateMarks(studentId, examId, marksObtained) {
    marksObtained = Number(marksObtained);
    const exam = this.data.exams.find(e => e.exam_id === Number(examId));
    if (!exam) throw new Error('Exam not found');
    if (marksObtained < 0) throw new Error('CHECK constraint failed: marks_obtained >= 0');
    if (marksObtained > exam.max_marks) throw new Error(`CHECK constraint failed: marks cannot exceed max_marks (${exam.max_marks})`);

    let m = this.data.marks.find(item => item.student_id === Number(studentId) && item.exam_id === Number(examId));
    if (m) {
      m.marks_obtained = marksObtained;
    } else {
      const newId = this.data.marks.length > 0 ? Math.max(...this.data.marks.map(i => i.mark_id)) + 1 : 1;
      this.data.marks.push({
        mark_id: newId,
        student_id: Number(studentId),
        exam_id: Number(examId),
        marks_obtained: marksObtained
      });
    }
    this.save();
    return true;
  }

  // Calculate Overall Student Academic Health
  getStudentHealth(studentId) {
    const attList = this.getViewAttendanceSummary(studentId);
    const marksList = this.getViewMarksSummary(studentId);
    const assignments = this.data.assignments.filter(a => a.student_id === Number(studentId));
    const atRisk = this.getViewAtRiskSubjects(studentId);

    // Overall attendance %
    const totalLectures = attList.reduce((acc, curr) => acc + curr.total_lectures, 0);
    const totalAttended = attList.reduce((acc, curr) => acc + curr.attended_lectures, 0);
    const overallAttPct = totalLectures > 0 ? Math.round((totalAttended * 100 / totalLectures) * 100) / 100 : 0;

    // Overall marks %
    const totalObtained = marksList.reduce((acc, curr) => acc + curr.total_obtained, 0);
    const totalMax = marksList.reduce((acc, curr) => acc + curr.total_max, 0);
    const overallMarksPct = totalMax > 0 ? Math.round((totalObtained * 100 / totalMax) * 100) / 100 : 0;

    // Assignment stats
    const totalAssignments = assignments.length;
    const submittedAssignments = assignments.filter(a => a.status === 'Submitted').length;
    const pendingAssignments = totalAssignments - submittedAssignments;
    const assignPct = totalAssignments > 0 ? Math.round((submittedAssignments * 100 / totalAssignments)) : 0;

    // Exam Readiness Index: Weighted 40% Attendance + 40% Marks + 20% Assignment Submission
    const examReadinessScore = Math.round(
      (overallAttPct * 0.4) + (overallMarksPct * 0.4) + (assignPct * 0.2)
    );

    let readinessStatus = 'Ready';
    let readinessColor = 'emerald';
    if (examReadinessScore < 50) {
      readinessStatus = 'Critical Risk';
      readinessColor = 'red';
    } else if (examReadinessScore < 75) {
      readinessStatus = 'Needs Improvement';
      readinessColor = 'amber';
    }

    return {
      overallAttPct,
      totalLectures,
      totalAttended,
      isAttAtRisk: overallAttPct < 75,
      overallMarksPct,
      totalObtained,
      totalMax,
      isMarksAtRisk: overallMarksPct < 40,
      totalAssignments,
      submittedAssignments,
      pendingAssignments,
      assignPct,
      atRiskCount: atRisk.length,
      atRiskList: atRisk,
      examReadinessScore,
      readinessStatus,
      readinessColor
    };
  }

  // In-Browser SQL Query Engine Simulator
  executeSQL(queryStr) {
    const start = performance.now();
    const clean = queryStr.trim().replace(/;+$/, '');
    const upper = clean.toUpperCase();

    try {
      // 1. Stored Procedure Calls
      if (upper.startsWith('CALL SP_GET_AT_RISK_SUBJECTS')) {
        // e.g. CALL sp_get_at_risk_subjects(1, 75, 40)
        const match = clean.match(/CALL\s+sp_get_at_risk_subjects\s*\(([^)]+)\)/i);
        let studentId = 1, attTh = 75, mkTh = 40;
        if (match && match[1]) {
          const parts = match[1].split(',').map(s => Number(s.trim()));
          if (!isNaN(parts[0])) studentId = parts[0];
          if (!isNaN(parts[1])) attTh = parts[1];
          if (!isNaN(parts[2])) mkTh = parts[2];
        }
        const data = this.spGetAtRiskSubjects(studentId, attTh, mkTh).map(r => ({
          'Subject': r.subject_name,
          'Subject Code': r.subject_code,
          'Att %': r.attendance_pct.toFixed(2),
          'Marks %': r.marks_pct.toFixed(2),
          'Lectures Needed (for 75%)': r.lectures_needed,
          'Reason': r.risk_reason
        }));
        const duration = ((performance.now() - start) / 1000).toFixed(4);
        return { success: true, type: 'SELECT', rows: data, rowCount: data.length, duration, message: `CALL sp_get_at_risk_subjects completed successfully. (${rowCountPlural(data.length)})` };
      }

      if (upper.startsWith('CALL SP_UPCOMING_DEADLINES')) {
        const match = clean.match(/CALL\s+sp_upcoming_deadlines\s*\(([^)]+)\)/i);
        let studentId = 1, days = 7;
        if (match && match[1]) {
          const parts = match[1].split(',').map(s => Number(s.trim()));
          if (!isNaN(parts[0])) studentId = parts[0];
          if (!isNaN(parts[1])) days = parts[1];
        }
        const data = this.spUpcomingDeadlines(studentId, days).map(r => ({
          'Assignment ID': r.assignment_id,
          'Subject': r.subject_name,
          'Title': r.title,
          'Due Date': r.due_date,
          'Days Left': r.days_left,
          'Status': r.status
        }));
        const duration = ((performance.now() - start) / 1000).toFixed(4);
        return { success: true, type: 'SELECT', rows: data, rowCount: data.length, duration, message: `CALL sp_upcoming_deadlines completed. (${rowCountPlural(data.length)})` };
      }

      // 2. Views
      if (upper.includes('FROM VW_ATTENDANCE_SUMMARY')) {
        // Check for WHERE student_id = X
        const stMatch = clean.match(/WHERE\s+student_id\s*=\s*(\d+)/i);
        const stId = stMatch ? Number(stMatch[1]) : null;
        const raw = this.getViewAttendanceSummary(stId);
        const data = raw.map(r => ({
          'student_id': r.student_id,
          'student_name': r.student_name,
          'subject_code': r.subject_code,
          'subject_name': r.subject_name,
          'attended_lectures': r.attended_lectures,
          'total_lectures': r.total_lectures,
          'attendance_pct': r.attendance_pct.toFixed(2) + '%'
        }));
        const duration = ((performance.now() - start) / 1000).toFixed(4);
        return { success: true, type: 'SELECT', rows: data, rowCount: data.length, duration, message: `View queried successfully. (${rowCountPlural(data.length)})` };
      }

      if (upper.includes('FROM VW_MARKS_SUMMARY')) {
        const stMatch = clean.match(/WHERE\s+student_id\s*=\s*(\d+)/i);
        const stId = stMatch ? Number(stMatch[1]) : null;
        const raw = this.getViewMarksSummary(stId);
        const data = raw.map(r => ({
          'student_id': r.student_id,
          'student_name': r.student_name,
          'subject_code': r.subject_code,
          'subject_name': r.subject_name,
          'total_obtained': r.total_obtained,
          'total_max': r.total_max,
          'marks_pct': r.marks_pct.toFixed(2) + '%'
        }));
        const duration = ((performance.now() - start) / 1000).toFixed(4);
        return { success: true, type: 'SELECT', rows: data, rowCount: data.length, duration, message: `View queried successfully. (${rowCountPlural(data.length)})` };
      }

      if (upper.includes('FROM VW_AT_RISK_SUBJECTS')) {
        const raw = this.getViewAtRiskSubjects();
        const data = raw.map(r => ({
          'subject_code': r.subject_code,
          'subject_name': r.subject_name,
          'attendance_pct': r.attendance_pct + '%',
          'marks_pct': r.marks_pct + '%',
          'risk_reason': r.risk_reason
        }));
        const duration = ((performance.now() - start) / 1000).toFixed(4);
        return { success: true, type: 'SELECT', rows: data, rowCount: data.length, duration, message: `View queried successfully. (${rowCountPlural(data.length)})` };
      }

      // 3. Raw Tables
      if (upper.includes('FROM STUDENTS')) {
        const duration = ((performance.now() - start) / 1000).toFixed(4);
        return { success: true, type: 'SELECT', rows: this.data.students, rowCount: this.data.students.length, duration, message: `Query OK, ${this.data.students.length} rows in set (${duration} sec)` };
      }

      if (upper.includes('FROM SUBJECTS')) {
        const duration = ((performance.now() - start) / 1000).toFixed(4);
        return { success: true, type: 'SELECT', rows: this.data.subjects, rowCount: this.data.subjects.length, duration, message: `Query OK, ${this.data.subjects.length} rows in set (${duration} sec)` };
      }

      if (upper.includes('FROM ASSIGNMENTS')) {
        const duration = ((performance.now() - start) / 1000).toFixed(4);
        return { success: true, type: 'SELECT', rows: this.data.assignments.slice(0, 50), rowCount: this.data.assignments.length, duration, message: `Query OK, ${this.data.assignments.length} rows in set (${duration} sec)` };
      }

      if (upper.includes('FROM EXAMS')) {
        const duration = ((performance.now() - start) / 1000).toFixed(4);
        return { success: true, type: 'SELECT', rows: this.data.exams, rowCount: this.data.exams.length, duration, message: `Query OK, ${this.data.exams.length} rows in set (${duration} sec)` };
      }

      if (upper.includes('FROM MARKS')) {
        const duration = ((performance.now() - start) / 1000).toFixed(4);
        return { success: true, type: 'SELECT', rows: this.data.marks.slice(0, 50), rowCount: this.data.marks.length, duration, message: `Query OK, ${this.data.marks.length} rows in set (${duration} sec)` };
      }

      if (upper.includes('FROM ATTENDANCE')) {
        const duration = ((performance.now() - start) / 1000).toFixed(4);
        return { success: true, type: 'SELECT', rows: this.data.attendance.slice(0, 50), rowCount: this.data.attendance.length, duration, message: `Query OK, displaying top 50 of ${this.data.attendance.length} rows in set (${duration} sec)` };
      }

      // Default: unrecognized query
      return {
        success: false,
        error: `Syntax error or unsupported table. Available objects: Students, Subjects, Attendance, Assignments, Exams, Marks, vw_attendance_summary, vw_marks_summary, vw_at_risk_subjects, sp_get_at_risk_subjects, sp_upcoming_deadlines.`
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
}

function rowCountPlural(cnt) {
  return `${cnt} ${cnt === 1 ? 'row' : 'rows'} in set`;
}

// Global instance
window.survivalDB = new StudentSurvivalDB();

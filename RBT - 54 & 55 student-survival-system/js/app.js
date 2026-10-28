/**
 * Student Survival System - Frontend Controller & Application Logic
 * JSPM's RSCOE Pune | Department of Computer Science and Business Systems
 * Academic Year 2026-27 | DBMS Project
 */

// Application State
const state = {
  currentStudentId: 1,
  attThreshold: 75,
  marksThreshold: 40,
  currentSlide: 1,
  totalSlides: 11,
  activeTab: 'pane-dashboard',
  assignmentFilter: 'all',
  attendanceLogFilter: 'all'
};

// DOM Content Loaded Initializer
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initNavigation();
  initStudentSwitcher();
  initModals();
  initAttendanceLog();
  initAssignments();
  initMarks();
  initERDiagram();
  initSQLConsole();
  initPresentation();
  initReport();

  // Initial Full Render
  renderAll();
});

// Toast Notifications Helper
function showToast(message, icon = 'ℹ️') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// -------------------------------------------------------------
// 1. THEME TOGGLER (Light / Dark)
// -------------------------------------------------------------
function initTheme() {
  const toggleBtn = document.getElementById('themeToggleBtn');
  const icon = document.getElementById('themeIcon');
  const label = document.getElementById('themeLabel');
  
  const savedTheme = localStorage.getItem('sss_theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeUI(savedTheme);

  toggleBtn.addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme');
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('sss_theme', next);
    updateThemeUI(next);
    showToast(`Switched to ${next} mode`, next === 'dark' ? '🌙' : '☀️');
  });

  function updateThemeUI(t) {
    if (t === 'dark') {
      icon.textContent = '☀️';
      label.textContent = 'Light';
    } else {
      icon.textContent = '🌙';
      label.textContent = 'Dark';
    }
  }
}

// -------------------------------------------------------------
// 2. TAB NAVIGATION
// -------------------------------------------------------------
function initNavigation() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const panes = document.querySelectorAll('.tab-pane');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-tab');
      if (!targetId) return;

      tabBtns.forEach(b => b.classList.remove('active'));
      panes.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const targetPane = document.getElementById(targetId);
      if (targetPane) targetPane.classList.add('active');

      state.activeTab = targetId;
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // Refresh specific tab contents if needed
      if (targetId === 'pane-slides') {
        renderSlide(state.currentSlide);
      } else if (targetId === 'pane-report') {
        renderReport();
      }
    });
  });

  // Print Report button
  document.getElementById('printAuditBtn').addEventListener('click', () => {
    const reportTab = document.querySelector('[data-tab="pane-report"]');
    if (reportTab) reportTab.click();
    setTimeout(() => window.print(), 300);
  });
}

// -------------------------------------------------------------
// 3. STUDENT SWITCHER & PROFILE SYNC
// -------------------------------------------------------------
function initStudentSwitcher() {
  const sel = document.getElementById('studentSelect');
  sel.addEventListener('change', (e) => {
    state.currentStudentId = Number(e.target.value);
    const stud = window.survivalDB.data.students.find(s => s.student_id === state.currentStudentId);
    showToast(`Switched active profile to ${stud ? stud.name : 'Student'}`, '👤');
    renderAll();
  });
}

function renderStudentBio() {
  const stud = window.survivalDB.data.students.find(s => s.student_id === state.currentStudentId);
  if (!stud) return;

  document.getElementById('bioAvatar').textContent = stud.avatar || '👩‍🎓';
  document.getElementById('bioName').childNodes[0].nodeValue = `${stud.name} `;
  document.getElementById('bioSemester').textContent = `Semester ${stud.semester}`;
  document.getElementById('bioPRN').textContent = stud.prn;
  document.getElementById('bioEmail').textContent = stud.email;
}

// -------------------------------------------------------------
// 4. MAIN DASHBOARD & AT-RISK CENTER RENDERING
// -------------------------------------------------------------
function renderDashboard() {
  const health = window.survivalDB.getStudentHealth(state.currentStudentId);
  const atRiskList = window.survivalDB.spGetAtRiskSubjects(state.currentStudentId, state.attThreshold, state.marksThreshold);

  // 1. KPI Cards
  document.getElementById('kpiAttPct').textContent = `${health.overallAttPct.toFixed(1)}%`;
  document.getElementById('kpiAttRatio').textContent = `${health.totalAttended} / ${health.totalLectures} lectures`;
  
  const kpiAttStatus = document.getElementById('kpiAttStatus');
  if (health.isAttAtRisk) {
    kpiAttStatus.innerHTML = `<span class="status-indicator status-danger"></span> Below 75% Alert!`;
    document.getElementById('navAttRiskBadge').style.display = 'inline-block';
  } else {
    kpiAttStatus.innerHTML = `<span class="status-indicator status-safe"></span> 75% Rule Satisfied`;
    document.getElementById('navAttRiskBadge').style.display = 'none';
  }

  // Pending assignments
  document.getElementById('kpiAssignPending').textContent = health.pendingAssignments;
  document.getElementById('kpiAssignTotal').textContent = `${health.submittedAssignments} of ${health.totalAssignments} submitted`;
  document.getElementById('navAssignBadge').textContent = health.pendingAssignments;

  // Marks Average
  document.getElementById('kpiMarksPct').textContent = `${health.overallMarksPct.toFixed(1)}%`;
  document.getElementById('kpiMarksRatio').textContent = `${health.totalObtained} / ${health.totalMax} marks`;
  const kpiMarksStatus = document.getElementById('kpiMarksStatus');
  if (health.isMarksAtRisk) {
    kpiMarksStatus.innerHTML = `<span class="status-indicator status-danger"></span> Below 40% Pass Standard`;
  } else {
    kpiMarksStatus.innerHTML = `<span class="status-indicator status-safe"></span> 40% Pass Satisfied`;
  }

  // At-Risk Count
  document.getElementById('kpiRiskCount').textContent = atRiskList.length;

  // Exam Readiness
  const readinessEl = document.getElementById('kpiReadinessScore');
  readinessEl.textContent = `${health.examReadinessScore}%`;
  document.getElementById('kpiReadinessLabel').textContent = health.readinessStatus;
  if (health.readinessStatus === 'Critical Risk') {
    readinessEl.style.color = 'var(--danger)';
  } else if (health.readinessStatus === 'Needs Improvement') {
    readinessEl.style.color = 'var(--warning)';
  } else {
    readinessEl.style.color = 'var(--success)';
  }

  // 2. Render At-Risk Cards Banner
  const container = document.getElementById('atRiskCardsContainer');
  container.innerHTML = '';

  if (atRiskList.length === 0) {
    container.innerHTML = `
      <div style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:var(--radius-md);padding:1.5rem;text-align:center;grid-column:1/-1;">
        <span style="font-size:2rem;">🎉</span>
        <h4 style="color:var(--success);margin-top:0.5rem;font-weight:700;">All Subjects Safe & On Track!</h4>
        <p style="font-size:0.82rem;color:var(--text-muted);">Attendance is above ${state.attThreshold}% and marks are above ${state.marksThreshold}% for all courses.</p>
      </div>
    `;
  } else {
    atRiskList.forEach(item => {
      let badgeClass = 'both';
      if (item.risk_reason === 'Low Attendance') badgeClass = 'attendance';
      if (item.risk_reason === 'Low Marks') badgeClass = 'marks';

      let adviceText = '';
      if (item.risk_reason === 'Attendance & Marks') {
        adviceText = `Must attend next <strong>${item.lectures_needed}</strong> lectures & score > 40% in upcoming test!`;
      } else if (item.risk_reason === 'Low Attendance') {
        adviceText = `Need to attend next <strong>${item.lectures_needed}</strong> consecutive lectures to reach 75%.`;
      } else {
        adviceText = `Focus on revision: Current marks average is below 40% passing standard.`;
      }

      const card = document.createElement('div');
      card.className = 'risk-card';
      card.innerHTML = `
        <div class="risk-card-top">
          <div class="risk-card-sub">
            <h4>${item.subject_name}</h4>
            <span>${item.subject_code} • ${item.faculty || 'Dept. of CSBS'}</span>
          </div>
          <span class="risk-badge ${badgeClass}">${item.risk_reason}</span>
        </div>
        <div class="risk-stats-row">
          <div>Att: <strong style="color:${item.attendance_pct < state.attThreshold ? 'var(--danger)' : 'var(--success)'};">${item.attendance_pct.toFixed(1)}%</strong> (${item.attended_lectures}/${item.total_lectures})</div>
          <div>Marks: <strong style="color:${item.marks_pct < state.marksThreshold ? 'var(--danger)' : 'var(--success)'};">${item.marks_pct.toFixed(1)}%</strong></div>
        </div>
        <div class="risk-recovery-advice">
          <span>💡</span> <span>${adviceText}</span>
        </div>
      `;
      container.appendChild(card);
    });
  }

  // 3. Render Dashboard Subjects Table
  const attSummary = window.survivalDB.getViewAttendanceSummary(state.currentStudentId);
  const marksSummary = window.survivalDB.getViewMarksSummary(state.currentStudentId);
  const tbody = document.getElementById('dashboardSubjectsBody');
  tbody.innerHTML = '';

  window.survivalDB.data.subjects.forEach(sub => {
    const att = attSummary.find(a => a.subject_id === sub.subject_id);
    const mk = marksSummary.find(m => m.subject_id === sub.subject_id);

    const attPct = att ? att.attendance_pct : 0;
    const mkPct = mk ? mk.marks_pct : 0;
    const isAttRisk = attPct < state.attThreshold;
    const isMkRisk = mkPct < state.marksThreshold;

    let statusPill = `<span class="badge-tag" style="background:var(--success);">Safe</span>`;
    if (isAttRisk && isMkRisk) {
      statusPill = `<span class="badge-tag" style="background:var(--danger);">Critical Both</span>`;
    } else if (isAttRisk) {
      statusPill = `<span class="badge-tag" style="background:#f97316;">Low Att</span>`;
    } else if (isMkRisk) {
      statusPill = `<span class="badge-tag" style="background:#eab308;color:#000;">Low Marks</span>`;
    }

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <strong>${sub.subject_name}</strong>
        <div style="font-size:0.75rem;color:var(--text-muted);">${sub.subject_code} (${sub.credits} Credits)</div>
      </td>
      <td>${sub.faculty || 'Faculty'}</td>
      <td>
        <span style="font-weight:700;color:${isAttRisk ? 'var(--danger)' : 'var(--success)'}">${attPct.toFixed(1)}%</span>
        <div class="progress-bar-wrap">
          <div class="progress-fill ${isAttRisk ? 'red' : 'green'}" style="width:${Math.min(attPct, 100)}%;"></div>
        </div>
      </td>
      <td>
        <span style="font-weight:700;color:${isMkRisk ? 'var(--danger)' : 'var(--text-main)'}">${mkPct.toFixed(1)}%</span>
      </td>
      <td>${statusPill}</td>
      <td>
        <div style="display:flex;gap:0.35rem;">
          <button class="att-quick-btn present" onclick="quickLogAttendance(${sub.subject_id}, 'Present')">+ P</button>
          <button class="att-quick-btn absent" onclick="quickLogAttendance(${sub.subject_id}, 'Absent')">+ A</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // 4. Render Upcoming Deadlines List in Widget
  const deadlines = window.survivalDB.spUpcomingDeadlines(state.currentStudentId, 10);
  const dlContainer = document.getElementById('dashboardDeadlinesList');
  dlContainer.innerHTML = '';

  if (deadlines.length === 0) {
    dlContainer.innerHTML = `
      <p style="font-size:0.85rem;color:var(--text-muted);padding:1rem 0;text-align:center;">
        No pending deadlines due in the next 10 days! 🎉
      </p>
    `;
  } else {
    deadlines.forEach(item => {
      let badgeClass = 'normal';
      let badgeText = `${item.days_left}d left`;
      if (item.days_left < 0) {
        badgeClass = 'critical';
        badgeText = 'Overdue!';
      } else if (item.days_left <= 2) {
        badgeClass = 'critical';
        badgeText = item.days_left === 0 ? 'Due Today!' : item.days_left === 1 ? 'Due Tomorrow' : `${item.days_left} days left`;
      } else if (item.days_left <= 5) {
        badgeClass = 'warning';
      }

      const div = document.createElement('div');
      div.className = `deadline-item ${item.days_left <= 2 ? 'urgent' : ''}`;
      div.innerHTML = `
        <div class="deadline-item-info">
          <h4>${item.title}</h4>
          <p>${item.subject_name} (${item.subject_code}) • Due: ${item.due_date}</p>
        </div>
        <div style="display:flex;align-items:center;gap:0.5rem;">
          <span class="deadline-badge ${badgeClass}">${badgeText}</span>
          <button class="att-quick-btn present" style="font-size:0.75rem;" onclick="submitAssignmentAction(${item.assignment_id})" title="Mark Completed">✓</button>
        </div>
      `;
      dlContainer.appendChild(div);
    });
  }
}

// -------------------------------------------------------------
// 5. ATTENDANCE TRACKER TAB
// -------------------------------------------------------------
function initAttendanceLog() {
  const filterSelect = document.getElementById('filterAttSubject');
  filterSelect.innerHTML = '<option value="all">All Subjects</option>';
  window.survivalDB.data.subjects.forEach(s => {
    filterSelect.innerHTML += `<option value="${s.subject_id}">${s.subject_name} (${s.subject_code})</option>`;
  });

  filterSelect.addEventListener('change', (e) => {
    state.attendanceLogFilter = e.target.value;
    renderAttendanceTab();
  });

  document.getElementById('btnLogAttendanceModal').addEventListener('click', () => {
    openModal('modalAttendance');
  });

  document.getElementById('btnQuickAttendance').addEventListener('click', () => {
    openModal('modalAttendance');
  });
}

function renderAttendanceTab() {
  const attSummary = window.survivalDB.getViewAttendanceSummary(state.currentStudentId);
  const grid = document.getElementById('attSubjectCardsGrid');
  grid.innerHTML = '';

  attSummary.forEach(item => {
    const isRisk = item.attendance_pct < state.attThreshold;

    let adviceText = '';
    if (isRisk) {
      adviceText = `<span style="color:var(--danger);font-weight:700;">⚠️ Need ${item.lectures_needed} more consecutive classes to reach 75%</span>`;
    } else {
      adviceText = `<span style="color:var(--success);font-weight:600;">✅ Bunk safe: You can miss up to ${item.bunkable} lectures</span>`;
    }

    const card = document.createElement('div');
    card.className = 'schema-table-card';
    card.innerHTML = `
      <div class="schema-table-header" style="background:${isRisk ? '#991b1b' : '#1e293b'};">
        <span>${item.subject_name}</span>
        <span class="badge-tag" style="background:#ffffff;color:#000;">${item.subject_code}</span>
      </div>
      <div style="padding:1rem;">
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:0.5rem;">
          <span style="font-size:1.8rem;font-weight:800;color:${isRisk ? 'var(--danger)' : 'var(--success)'};">${item.attendance_pct.toFixed(1)}%</span>
          <span style="font-size:0.8rem;color:var(--text-muted);">${item.attended_lectures} / ${item.total_lectures} Lectures</span>
        </div>
        <div class="progress-bar-wrap" style="height:10px;margin-bottom:0.75rem;">
          <div class="progress-fill ${isRisk ? 'red' : 'green'}" style="width:${Math.min(item.attendance_pct, 100)}%;"></div>
        </div>
        <div style="font-size:0.78rem;margin-bottom:0.75rem;">
          ${adviceText}
        </div>
        <div style="display:flex;gap:0.5rem;">
          <button class="action-btn" style="flex:1;font-size:0.75rem;padding:0.4rem;" onclick="quickLogAttendance(${item.subject_id}, 'Present')">+ Present</button>
          <button class="action-btn secondary" style="flex:1;font-size:0.75rem;padding:0.4rem;" onclick="quickLogAttendance(${item.subject_id}, 'Absent')">+ Absent</button>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });

  // Render log rows
  const tbody = document.getElementById('attendanceLogsBody');
  tbody.innerHTML = '';

  let logs = window.survivalDB.data.attendance
    .filter(a => a.student_id === state.currentStudentId)
    .sort((a, b) => new Date(b.lecture_date) - new Date(a.lecture_date));

  if (state.attendanceLogFilter !== 'all') {
    logs = logs.filter(a => a.subject_id === Number(state.attendanceLogFilter));
  }

  logs.slice(0, 50).forEach(log => {
    const sub = window.survivalDB.data.subjects.find(s => s.subject_id === log.subject_id) || {};
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>#${log.attendance_id}</td>
      <td><strong>${sub.subject_name}</strong> <span style="font-size:0.75rem;color:var(--text-muted);">(${sub.subject_code})</span></td>
      <td>${log.lecture_date}</td>
      <td>
        <span class="badge-tag" style="background:${log.status === 'Present' ? 'var(--success)' : 'var(--danger)'};">
          ${log.status}
        </span>
      </td>
      <td style="font-family:monospace;font-size:0.72rem;color:var(--text-muted);">UNIQUE(student, subject, date)</td>
      <td>
        <button class="att-quick-btn" style="background:var(--bg-subtle);border-color:var(--border-color);color:var(--text-main);" onclick="toggleAttendanceStatus(${log.attendance_id})">
          Toggle
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function quickLogAttendance(subjectId, status) {
  const todayStr = new Date('2026-10-21').toISOString().split('T')[0];
  const res = window.survivalDB.spMarkAttendance(state.currentStudentId, subjectId, todayStr, status);
  showToast(res.message, status === 'Present' ? '✅' : '❌');
  renderAll();
}

function toggleAttendanceStatus(attId) {
  const rec = window.survivalDB.data.attendance.find(a => a.attendance_id === attId);
  if (rec) {
    rec.status = (rec.status === 'Present') ? 'Absent' : 'Present';
    window.survivalDB.save();
    showToast(`Updated Log #${attId} to ${rec.status}`, '🔄');
    renderAll();
  }
}

// -------------------------------------------------------------
// 6. ASSIGNMENTS TAB
// -------------------------------------------------------------
function initAssignments() {
  document.getElementById('filterAssignAll').addEventListener('click', () => {
    state.assignmentFilter = 'all';
    updateAssignFilterUI('filterAssignAll');
    renderAssignmentsTab();
  });
  document.getElementById('filterAssignPending').addEventListener('click', () => {
    state.assignmentFilter = 'pending';
    updateAssignFilterUI('filterAssignPending');
    renderAssignmentsTab();
  });
  document.getElementById('filterAssignSubmitted').addEventListener('click', () => {
    state.assignmentFilter = 'submitted';
    updateAssignFilterUI('filterAssignSubmitted');
    renderAssignmentsTab();
  });

  function updateAssignFilterUI(btnId) {
    ['filterAssignAll', 'filterAssignPending', 'filterAssignSubmitted'].forEach(id => {
      document.getElementById(id).classList.toggle('active', id === btnId);
    });
  }

  document.getElementById('btnAddAssignmentModal').addEventListener('click', () => {
    openModal('modalAssignment');
  });

  document.getElementById('btnAddAssignDash').addEventListener('click', () => {
    openModal('modalAssignment');
  });
}

function renderAssignmentsTab() {
  const tbody = document.getElementById('assignmentsTableBody');
  tbody.innerHTML = '';

  let list = window.survivalDB.data.assignments
    .filter(a => a.student_id === state.currentStudentId);

  if (state.assignmentFilter === 'pending') {
    list = list.filter(a => a.status !== 'Submitted');
  } else if (state.assignmentFilter === 'submitted') {
    list = list.filter(a => a.status === 'Submitted');
  }

  const today = new Date('2026-10-21');

  list.forEach(a => {
    const sub = window.survivalDB.data.subjects.find(s => s.subject_id === a.subject_id) || {};
    const due = new Date(a.due_date);
    const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));

    let countdownBadge = '';
    if (a.status === 'Submitted') {
      countdownBadge = `<span class="deadline-badge" style="background:var(--success-bg);color:var(--success);">Completed</span>`;
    } else if (diffDays < 0) {
      countdownBadge = `<span class="deadline-badge critical">Overdue (${Math.abs(diffDays)}d ago)</span>`;
    } else if (diffDays <= 2) {
      countdownBadge = `<span class="deadline-badge critical">Due in ${diffDays}d ⚠️</span>`;
    } else {
      countdownBadge = `<span class="deadline-badge warning">${diffDays} days left</span>`;
    }

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>#${a.assignment_id}</td>
      <td><strong>${sub.subject_name}</strong> <div style="font-size:0.75rem;color:var(--text-muted);">${sub.subject_code}</div></td>
      <td>${a.title}</td>
      <td>${a.due_date}</td>
      <td>${countdownBadge}</td>
      <td>
        <span class="badge-tag" style="background:${a.status === 'Submitted' ? 'var(--success)' : '#f59e0b'};">
          ${a.status}
        </span>
      </td>
      <td>${a.score !== null ? `${a.score} / ${a.max_score}` : `${a.max_score} marks`}</td>
      <td>
        ${a.status !== 'Submitted' 
          ? `<button class="action-btn" style="font-size:0.75rem;padding:0.35rem 0.65rem;" onclick="submitAssignmentAction(${a.assignment_id})">Mark Submitted</button>`
          : `<span style="font-size:0.78rem;color:var(--success);font-weight:700;">✅ Submitted</span>`}
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function submitAssignmentAction(assignId) {
  const success = window.survivalDB.submitAssignment(assignId);
  if (success) {
    showToast(`Assignment #${assignId} marked as Submitted!`, '🎉');
    renderAll();
  }
}

// -------------------------------------------------------------
// 7. MARKS & EXAM READINESS TAB
// -------------------------------------------------------------
function initMarks() {
  document.getElementById('btnUpdateMarksModal').addEventListener('click', () => {
    openModal('modalMarks');
  });
}

function renderMarksTab() {
  const marksSummary = window.survivalDB.getViewMarksSummary(state.currentStudentId);
  const tbody = document.getElementById('marksTableBody');
  tbody.innerHTML = '';

  window.survivalDB.data.subjects.forEach(sub => {
    const summary = marksSummary.find(m => m.subject_id === sub.subject_id);
    const details = summary ? summary.exam_details : [];

    const inSem = details.find(d => d.exam_type === 'In-Sem Exam');
    const unitTest = details.find(d => d.exam_type === 'Unit Test 1');

    const inSemScore = inSem ? `${inSem.marks_obtained} / ${inSem.max_marks}` : 'N/A';
    const utScore = unitTest ? `${unitTest.marks_obtained} / ${unitTest.max_marks}` : 'N/A';

    const totalObtained = summary ? summary.total_obtained : 0;
    const totalMax = summary ? summary.total_max : 0;
    const marksPct = summary ? summary.marks_pct : 0;
    const isPass = marksPct >= state.marksThreshold;

    let readinessStatus = 'Ready';
    let readinessColor = 'var(--success)';
    if (marksPct < 40) {
      readinessStatus = 'Fail Risk';
      readinessColor = 'var(--danger)';
    } else if (marksPct < 60) {
      readinessStatus = 'Average';
      readinessColor = 'var(--warning)';
    }

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <strong>${sub.subject_name}</strong>
        <div style="font-size:0.75rem;color:var(--text-muted);">${sub.subject_code}</div>
      </td>
      <td>${sub.credits}</td>
      <td>${inSemScore}</td>
      <td>${utScore}</td>
      <td><strong>${totalObtained}</strong> / ${totalMax}</td>
      <td>
        <strong style="color:${isPass ? 'var(--text-main)' : 'var(--danger)'};">${marksPct.toFixed(1)}%</strong>
      </td>
      <td>
        <span class="badge-tag" style="background:${isPass ? 'var(--success)' : 'var(--danger)'};">
          ${isPass ? 'PASS' : 'FAIL RISK'}
        </span>
      </td>
      <td>
        <span style="font-size:0.8rem;font-weight:700;color:${readinessColor};">${readinessStatus}</span>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// -------------------------------------------------------------
// 8. ER DIAGRAM & SCHEMA EXPLORER
// -------------------------------------------------------------
function initERDiagram() {
  const btnERD = document.getElementById('btnViewERD');
  const btnArch = document.getElementById('btnViewArch');
  const btnCards = document.getElementById('btnViewSchemaCards');

  const imgBox = document.getElementById('diagramImgBox');
  const activeImg = document.getElementById('activeDiagramImg');
  const cardsContainer = document.getElementById('schemaTablesContainer');

  btnERD.addEventListener('click', () => {
    setActive(btnERD);
    imgBox.style.display = 'flex';
    cardsContainer.style.display = 'none';
    activeImg.src = 'assets/er-diagram.png';
    activeImg.alt = 'Database ER Diagram';
  });

  btnArch.addEventListener('click', () => {
    setActive(btnArch);
    imgBox.style.display = 'flex';
    cardsContainer.style.display = 'none';
    activeImg.src = 'assets/system-architecture.png';
    activeImg.alt = 'System Architecture 2-Tier Diagram';
  });

  btnCards.addEventListener('click', () => {
    setActive(btnCards);
    imgBox.style.display = 'none';
    cardsContainer.style.display = 'grid';
  });

  function setActive(activeBtn) {
    [btnERD, btnArch, btnCards].forEach(b => b.classList.remove('active'));
    activeBtn.classList.add('active');
  }
}

// -------------------------------------------------------------
// 9. LIVE SQL QUERY CONSOLE
// -------------------------------------------------------------
function initSQLConsole() {
  const textarea = document.getElementById('sqlQueryInput');
  const btnRun = document.getElementById('btnRunSQL');
  const presetBtns = document.querySelectorAll('.sql-preset-btn');

  presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const sql = btn.getAttribute('data-sql');
      textarea.value = sql;
      runSQLQuery();
    });
  });

  btnRun.addEventListener('click', () => {
    runSQLQuery();
  });

  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      runSQLQuery();
    }
  });

  // Run initial query
  runSQLQuery();
}

function runSQLQuery() {
  const queryStr = document.getElementById('sqlQueryInput').value;
  const statusEl = document.getElementById('sqlExecutionStatus');
  const countEl = document.getElementById('sqlResultCount');
  const timeEl = document.getElementById('sqlResultTime');
  const container = document.getElementById('sqlResultTableContainer');

  statusEl.textContent = 'Executing...';

  const res = window.survivalDB.executeSQL(queryStr);

  if (res.success) {
    statusEl.textContent = 'Query OK';
    countEl.textContent = `${res.rowCount} row${res.rowCount === 1 ? '' : 's'} in set`;
    timeEl.textContent = `${res.duration} sec`;

    if (!res.rows || res.rows.length === 0) {
      container.innerHTML = `<p style="padding:1rem;color:var(--text-muted);">Empty set (${res.duration} sec)</p>`;
      return;
    }

    const columns = Object.keys(res.rows[0]);
    let tableHtml = `<table class="data-table"><thead><tr>`;
    columns.forEach(col => {
      tableHtml += `<th>${col}</th>`;
    });
    tableHtml += `</tr></thead><tbody>`;

    res.rows.forEach(row => {
      tableHtml += `<tr>`;
      columns.forEach(col => {
        tableHtml += `<td>${row[col] !== null && row[col] !== undefined ? row[col] : 'NULL'}</td>`;
      });
      tableHtml += `</tr>`;
    });
    tableHtml += `</tbody></table>`;
    container.innerHTML = tableHtml;
  } else {
    statusEl.textContent = 'Error';
    countEl.textContent = '0 rows';
    timeEl.textContent = '0.0000 sec';
    container.innerHTML = `
      <div style="background:var(--danger-bg);color:var(--danger);border:1px solid var(--danger-border);padding:1rem;border-radius:var(--radius-md);font-family:monospace;font-size:0.85rem;">
        <strong>MySQL Error:</strong> ${res.error}
      </div>
    `;
  }
}

// -------------------------------------------------------------
// 10. PRESENTATION MODE (11 SLIDES SLIDE DECK)
// -------------------------------------------------------------
const SLIDES_DATA = [
  // Slide 1: Title
  {
    num: 1,
    title: 'Project Title & Institutional Affiliation',
    render: () => `
      <div style="text-align:center;padding:1.5rem 0;">
        <div style="display:flex;justify-content:center;align-items:center;gap:2rem;margin-bottom:1.5rem;">
          <img src="assets/jspm-logo.png" style="height:85px;" alt="JSPM">
          <img src="assets/rscoe-logo.jpeg" style="height:85px;" alt="RSCOE">
        </div>
        <h2 style="font-size:1.45rem;color:var(--primary);font-weight:800;line-height:1.3;">
          JSPM’s Rajarshi Shahu College of Engineering, Tathawade, Pune
        </h2>
        <p style="font-size:0.92rem;color:var(--text-sub);margin-top:0.25rem;">
          (An Autonomous Institute affiliated to Savitribai Phule Pune University)
        </p>
        <p style="font-weight:700;font-size:1rem;color:var(--text-main);margin-top:0.5rem;">
          Department of Computer Science and Business Systems • Academic Year: 2026-27
        </p>

        <div style="margin:2.5rem auto;background:linear-gradient(135deg, #1e293b 0%, #0f172a 100%);color:#fff;padding:2rem;border-radius:12px;max-width:850px;box-shadow:var(--shadow-md);">
          <span style="background:var(--primary);color:#fff;font-size:0.75rem;padding:0.25rem 0.6rem;border-radius:4px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">
            PROJECT TITLE
          </span>
          <h1 style="font-size:2.2rem;font-weight:800;margin:0.75rem 0 0.5rem;letter-spacing:-0.5px;">
            Student Survival System
          </h1>
          <p style="font-size:1.05rem;color:#94a3b8;font-weight:400;">
            A DBMS dashboard for attendance, assignments, marks, deadlines and exam readiness
          </p>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:2rem;max-width:850px;margin:0 auto;text-align:left;background:var(--bg-subtle);padding:1.5rem;border-radius:10px;border:1px solid var(--border-color);">
          <div>
            <h4 style="font-size:0.8rem;text-transform:uppercase;color:var(--text-muted);letter-spacing:0.5px;margin-bottom:0.4rem;">Submitted By</h4>
            <div style="font-size:0.95rem;font-weight:700;">Vaidehi Pravin Jirwankar <span style="font-size:0.8rem;color:var(--text-muted);font-weight:500;">(PRN: RBT25CB054)</span></div>
            <div style="font-size:0.95rem;font-weight:700;margin-top:0.25rem;">Manaswi Kadu <span style="font-size:0.8rem;color:var(--text-muted);font-weight:500;">(PRN: RBT25CB055)</span></div>
          </div>
          <div>
            <h4 style="font-size:0.8rem;text-transform:uppercase;color:var(--text-muted);letter-spacing:0.5px;margin-bottom:0.4rem;">Course & Guide</h4>
            <div style="font-size:0.95rem;font-weight:700;">Course: Database Management System</div>
            <div style="font-size:0.95rem;font-weight:700;margin-top:0.25rem;">Coordinator: Prof. Rutuja S. Bachhav</div>
          </div>
        </div>
      </div>
    `
  },

  // Slide 2: Index
  {
    num: 2,
    title: 'Presentation Index',
    render: () => `
      <div style="padding:1rem 0;">
        <h2 style="font-size:1.8rem;font-weight:800;color:var(--primary);margin-bottom:1.5rem;">Index</h2>
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:1rem;">
          ${[
            { num: 1, title: 'Introduction / Background', icon: '📖' },
            { num: 2, title: 'Problem Definition & Objectives', icon: '🎯' },
            { num: 3, title: 'Literature Survey', icon: '🔍' },
            { num: 4, title: 'Feasibility Study', icon: '⚙️' },
            { num: 5, title: 'System Design & Architecture', icon: '🏛️' },
            { num: 6, title: 'Database Design & ER Diagram', icon: '🗄️' },
            { num: 7, title: 'SQL Implementation & Results', icon: '💻' },
            { num: 8, title: 'Conclusion & Future Scope', icon: '🚀' },
            { num: 9, title: 'References', icon: '📚' }
          ].map(item => `
            <div style="background:var(--bg-subtle);border:1px solid var(--border-color);border-radius:10px;padding:1.25rem;display:flex;align-items:center;gap:1rem;box-shadow:var(--shadow-sm);">
              <span style="font-size:1.5rem;background:#fff;width:45px;height:45px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:1px solid var(--border-color);">${item.icon}</span>
              <div>
                <span style="font-size:0.75rem;font-weight:800;color:var(--primary);">SECTION ${item.num}</span>
                <h4 style="font-size:1rem;font-weight:700;">${item.title}</h4>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `
  },

  // Slide 3: Introduction / Background
  {
    num: 3,
    title: 'Introduction & Background',
    render: () => `
      <div>
        <h2 style="font-size:1.8rem;font-weight:800;color:var(--primary);margin-bottom:1.5rem;">Introduction / Background</h2>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;margin-bottom:2rem;">
          <div style="background:var(--bg-subtle);border-left:4px solid var(--primary);padding:1.25rem;border-radius:8px;">
            <h3 style="font-size:1.1rem;font-weight:700;margin-bottom:0.4rem;">Definition</h3>
            <p style="font-size:0.95rem;color:var(--text-sub);line-height:1.6;">
              A database-driven dashboard that tracks attendance, assignments, marks, deadlines and exam readiness in one unified place.
            </p>
          </div>
          <div style="background:var(--bg-subtle);border-left:4px solid var(--accent);padding:1.25rem;border-radius:8px;">
            <h3 style="font-size:1.1rem;font-weight:700;margin-bottom:0.4rem;">Overview</h3>
            <p style="font-size:0.95rem;color:var(--text-sub);line-height:1.6;">
              Six related tables store the data; SQL views and stored procedures turn raw entries into percentages, deadlines and automatic risk alerts.
            </p>
          </div>
          <div style="background:var(--bg-subtle);border-left:4px solid #f59e0b;padding:1.25rem;border-radius:8px;">
            <h3 style="font-size:1.1rem;font-weight:700;margin-bottom:0.4rem;">Background</h3>
            <p style="font-size:0.95rem;color:var(--text-sub);line-height:1.6;">
              Tracking has historically moved from paper registers to spreadsheets and ERP portals, which serve administrators rather than helping the student.
            </p>
          </div>
          <div style="background:var(--bg-subtle);border-left:4px solid #10b981;padding:1.25rem;border-radius:8px;">
            <h3 style="font-size:1.1rem;font-weight:700;margin-bottom:0.4rem;">Motivation</h3>
            <p style="font-size:0.95rem;color:var(--text-sub);line-height:1.6;">
              With strict 75% attendance and 40% pass-mark rules, an unspotted shortfall found late can cost exam eligibility. Early warning is essential.
            </p>
          </div>
        </div>

        <!-- 3 Highlight Metric Pills matching slide 3 -->
        <div style="display:flex;justify-content:center;gap:3rem;text-align:center;">
          <div style="background:#fff;border:1px solid var(--border-color);border-radius:12px;padding:1.25rem 2.5rem;box-shadow:var(--shadow-sm);">
            <div style="font-size:2.4rem;font-weight:800;color:var(--primary);">6</div>
            <div style="font-size:0.85rem;color:var(--text-muted);font-weight:600;">Related Relational Tables</div>
          </div>
          <div style="background:#fff;border:1px solid var(--border-color);border-radius:12px;padding:1.25rem 2.5rem;box-shadow:var(--shadow-sm);">
            <div style="font-size:2.4rem;font-weight:800;color:#f97316;">75%</div>
            <div style="font-size:0.85rem;color:var(--text-muted);font-weight:600;">Minimum Attendance Rule</div>
          </div>
          <div style="background:#fff;border:1px solid var(--border-color);border-radius:12px;padding:1.25rem 2.5rem;box-shadow:var(--shadow-sm);">
            <div style="font-size:2.4rem;font-weight:800;color:#10b981;">40%</div>
            <div style="font-size:0.85rem;color:var(--text-muted);font-weight:600;">Minimum Marks to Pass</div>
          </div>
        </div>
      </div>
    `
  },

  // Slide 4: Problem Definition & Objectives
  {
    num: 4,
    title: 'Problem Definition & Objectives',
    render: () => `
      <div>
        <h2 style="font-size:1.8rem;font-weight:800;color:var(--primary);margin-bottom:1.5rem;">Problem Definition & Objectives</h2>
        <div style="background:var(--danger-bg);border:1px solid var(--danger-border);border-left:5px solid var(--danger);padding:1.25rem 1.5rem;border-radius:8px;margin-bottom:2rem;">
          <h3 style="color:var(--danger);font-size:1.1rem;font-weight:800;margin-bottom:0.4rem;">Problem Definition</h3>
          <p style="font-size:0.95rem;color:var(--text-main);line-height:1.6;">
            Students have no single place that combines attendance, assignments, marks and exam dates, and no automatic way to know which subjects are at risk. Manual percentage calculation is slow and error-prone, and deadlines are easily missed.
          </p>
          <div style="margin-top:0.75rem;padding-top:0.75rem;border-top:1px dashed var(--danger-border);font-weight:600;font-size:0.9rem;">
            Problem Statement: Design a normalized relational database, with views and stored procedures, that reports at-risk subjects, upcoming deadlines and exam readiness for every student.
          </div>
        </div>

        <h3 style="font-size:1.15rem;font-weight:800;margin-bottom:1rem;">Project Objectives</h3>
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(320px, 1fr));gap:1rem;">
          ${[
            { num: 1, text: 'Design a normalized schema with six tables' },
            { num: 2, text: 'Enforce integrity with PK, FK, NOT NULL, UNIQUE, CHECK and DEFAULT' },
            { num: 3, text: 'Calculate attendance and marks % with GROUP BY and HAVING' },
            { num: 4, text: 'Build views for attendance, marks and at-risk summaries' },
            { num: 5, text: 'Create stored procedures for attendance, deadlines and risk' },
            { num: 6, text: 'Flag subjects with attendance below 75% or marks below 40%' }
          ].map(obj => `
            <div style="background:var(--bg-subtle);border:1px solid var(--border-color);border-radius:8px;padding:1rem;display:flex;align-items:center;gap:0.75rem;">
              <span style="background:var(--primary);color:#fff;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:0.85rem;flex-shrink:0;">${obj.num}</span>
              <span style="font-size:0.9rem;font-weight:600;">${obj.text}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `
  },

  // Slide 5: Literature Survey
  {
    num: 5,
    title: 'Literature Survey',
    render: () => `
      <div>
        <h2 style="font-size:1.8rem;font-weight:800;color:var(--primary);margin-bottom:1.5rem;">Literature Survey</h2>
        <div class="table-responsive" style="margin-bottom:1.5rem;">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width:25%;">Existing Approach</th>
                <th style="width:35%;">What It Does</th>
                <th style="width:40%;">Identified Gap</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Registers & Spreadsheets</strong></td>
                <td>Faculty record attendance and marks by hand</td>
                <td>Percentages calculated manually; no link between attendance and marks</td>
              </tr>
              <tr>
                <td><strong>ERP / Attendance Portals</strong></td>
                <td>Central, accurate records for administrators</td>
                <td>Overall figures only; no subject-wise warning for the student</td>
              </tr>
              <tr>
                <td><strong>Learning Platforms (Classroom, Moodle)</strong></td>
                <td>Assignment posting, submission and deadlines</td>
                <td>No attendance or marks risk analysis</td>
              </tr>
              <tr>
                <td><strong>To-Do & Calendar Apps</strong></td>
                <td>Reminders for deadlines</td>
                <td>Hold no academic data; everything entered manually</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style="background:#fffbeb;border:1px solid #fde68a;border-left:5px solid #f59e0b;padding:1rem 1.5rem;border-radius:8px;font-size:0.95rem;">
          <strong>Common Gap:</strong> No existing system joins attendance, assignments and marks per subject, or warns the student automatically.
        </div>
      </div>
    `
  },

  // Slide 6: Feasibility Study
  {
    num: 6,
    title: 'Feasibility Study',
    render: () => `
      <div>
        <h2 style="font-size:1.8rem;font-weight:800;color:var(--primary);margin-bottom:1.5rem;">Feasibility Study</h2>
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:1.5rem;">
          
          <div style="background:var(--bg-subtle);border:1px solid var(--border-color);border-radius:12px;padding:1.5rem;box-shadow:var(--shadow-sm);">
            <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1rem;">
              <span style="font-size:1.8rem;">⚙️</span>
              <h3 style="font-size:1.15rem;font-weight:800;">Technical Feasibility</h3>
            </div>
            <ul style="font-size:0.9rem;color:var(--text-sub);padding-left:1.2rem;line-height:1.7;">
              <li>MySQL 8.0 is free and widely supported</li>
              <li>Needs only standard SQL: constraints, views, stored procedures</li>
              <li>Runs smoothly on an ordinary laptop or college lab PC</li>
            </ul>
          </div>

          <div style="background:var(--bg-subtle);border:1px solid var(--border-color);border-radius:12px;padding:1.5rem;box-shadow:var(--shadow-sm);">
            <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1rem;">
              <span style="font-size:1.8rem;">💰</span>
              <h3 style="font-size:1.15rem;font-weight:800;">Financial / Business</h3>
            </div>
            <ul style="font-size:0.9rem;color:var(--text-sub);padding-left:1.2rem;line-height:1.7;">
              <li>Open-source tools, so zero licence cost</li>
              <li>Saves students and faculty the time spent on manual calculation</li>
              <li>Scales to more subjects and semesters without redesign</li>
            </ul>
          </div>

          <div style="background:var(--bg-subtle);border:1px solid var(--border-color);border-radius:12px;padding:1.5rem;box-shadow:var(--shadow-sm);">
            <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1rem;">
              <span style="font-size:1.8rem;">👥</span>
              <h3 style="font-size:1.15rem;font-weight:800;">Operational Feasibility</h3>
            </div>
            <ul style="font-size:0.9rem;color:var(--text-sub);padding-left:1.2rem;line-height:1.7;">
              <li>Attendance and marks are already recorded by the college</li>
              <li>Dashboard only calls ready-made views and procedures</li>
              <li>Students need no training to read the results</li>
            </ul>
          </div>

        </div>
      </div>
    `
  },

  // Slide 7: System Design & Architecture
  {
    num: 7,
    title: 'System Design & Architecture',
    render: () => `
      <div>
        <h2 style="font-size:1.8rem;font-weight:800;color:var(--primary);margin-bottom:1rem;">System Design & Architecture</h2>
        <div style="background:#fff;border:1px solid var(--border-color);padding:1rem;border-radius:10px;text-align:center;margin-bottom:1.5rem;">
          <img src="assets/system-architecture.png" style="max-height:360px;max-width:100%;object-fit:contain;" alt="Architecture Diagram">
        </div>
        <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:1rem;text-align:center;">
          <div style="background:var(--bg-subtle);padding:0.75rem;border-radius:8px;border:1px solid var(--border-color);">
            <div style="font-weight:800;font-size:1.1rem;color:var(--primary);">Step 1</div>
            <div style="font-size:0.8rem;color:var(--text-sub);">Student opens the dashboard (Tier 1 Client)</div>
          </div>
          <div style="background:var(--bg-subtle);padding:0.75rem;border-radius:8px;border:1px solid var(--border-color);">
            <div style="font-weight:800;font-size:1.1rem;color:var(--primary);">Step 2</div>
            <div style="font-size:0.8rem;color:var(--text-sub);">Client sends SQL queries and CALL statements</div>
          </div>
          <div style="background:var(--bg-subtle);padding:0.75rem;border-radius:8px;border:1px solid var(--border-color);">
            <div style="font-weight:800;font-size:1.1rem;color:var(--primary);">Step 3</div>
            <div style="font-size:0.8rem;color:var(--text-sub);">MySQL (Tier 2) executes constraints, views & SPs</div>
          </div>
          <div style="background:var(--bg-subtle);padding:0.75rem;border-radius:8px;border:1px solid var(--border-color);">
            <div style="font-weight:800;font-size:1.1rem;color:var(--primary);">Step 4</div>
            <div style="font-size:0.8rem;color:var(--text-sub);">Calculations stay in DB, ensuring absolute consistency</div>
          </div>
        </div>
      </div>
    `
  },

  // Slide 8: Database Design & ER Diagram
  {
    num: 8,
    title: 'Database Design & ER Diagram',
    render: () => `
      <div>
        <h2 style="font-size:1.8rem;font-weight:800;color:var(--primary);margin-bottom:1rem;">Database Design & ER Diagram</h2>
        <div style="display:grid;grid-template-columns:1.2fr 1fr;gap:1.5rem;align-items:center;">
          <div style="background:#fff;border:1px solid var(--border-color);padding:0.75rem;border-radius:10px;text-align:center;">
            <img src="assets/er-diagram.png" style="max-height:360px;max-width:100%;object-fit:contain;" alt="ER Diagram">
          </div>
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr><th>Table</th><th>Keys & Constraints</th></tr>
              </thead>
              <tbody>
                <tr><td><strong>Students</strong></td><td>PK: student_id; UNIQUE: prn, email; CHECK: semester (1..8)</td></tr>
                <tr><td><strong>Subjects</strong></td><td>PK: subject_id; UNIQUE: subject_code; CHECK: credits > 0</td></tr>
                <tr><td><strong>Attendance</strong></td><td>FK: student, subject; UNIQUE per lecture date; ON DELETE CASCADE</td></tr>
                <tr><td><strong>Assignments</strong></td><td>FK: student, subject; status DEFAULT 'Pending'</td></tr>
                <tr><td><strong>Exams</strong></td><td>FK: subject; CHECK: max_marks > 0</td></tr>
                <tr><td><strong>Marks</strong></td><td>FK: student, exam; UNIQUE pair; CHECK: marks >= 0</td></tr>
              </tbody>
            </table>
            <p style="font-size:0.75rem;color:var(--text-muted);margin-top:0.6rem;">
              * All relationships are 1-to-Many (1:N); foreign keys enforce ON DELETE CASCADE.
            </p>
          </div>
        </div>
      </div>
    `
  },

  // Slide 9: SQL Implementation & Results
  {
    num: 9,
    title: 'SQL Implementation & Results',
    render: () => `
      <div>
        <h2 style="font-size:1.8rem;font-weight:800;color:var(--primary);margin-bottom:1rem;">SQL Implementation & Results</h2>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;margin-bottom:1.5rem;">
          
          <div>
            <h4 style="font-size:0.85rem;color:var(--primary);font-weight:700;margin-bottom:0.4rem;">View: Attendance Percentage per Subject</h4>
            <pre style="background:#0f172a;color:#38bdf8;padding:0.85rem;border-radius:8px;font-size:0.78rem;line-height:1.5;overflow-x:auto;">
CREATE VIEW vw_attendance_summary AS
SELECT student_id, subject_id,
  ROUND(SUM(status = 'Present') * 100
  / COUNT(*), 2) AS attendance_pct
FROM Attendance
GROUP BY student_id, subject_id;</pre>

            <h4 style="font-size:0.85rem;color:var(--primary);font-weight:700;margin:0.8rem 0 0.4rem;">Risk Rule inside sp_get_at_risk_subjects</h4>
            <pre style="background:#0f172a;color:#a7f3d0;padding:0.85rem;border-radius:8px;font-size:0.78rem;line-height:1.5;overflow-x:auto;">
CASE
  WHEN att.attendance_pct < 75 AND mk.marks_pct < 40
    THEN 'Attendance & Marks'
  WHEN att.attendance_pct < 75
    THEN 'Low Attendance'
  ELSE 'Low Marks'
END AS risk_reason</pre>
          </div>

          <div>
            <h4 style="font-size:0.85rem;color:var(--primary);font-weight:700;margin-bottom:0.4rem;">Sample Output: CALL sp_get_at_risk_subjects(1, 75, 40)</h4>
            <table class="data-table">
              <thead>
                <tr><th>Subject</th><th>Att %</th><th>Marks %</th><th>Reason</th></tr>
              </thead>
              <tbody>
                <tr><td>Operating Systems</td><td style="color:var(--danger);font-weight:700;">68.00</td><td>55.00</td><td><span class="risk-badge attendance">Low Attendance</span></td></tr>
                <tr><td>Engineering Mathematics</td><td>79.00</td><td style="color:var(--danger);font-weight:700;">34.00</td><td><span class="risk-badge marks">Low Marks</span></td></tr>
                <tr><td>Data Structures</td><td style="color:var(--danger);font-weight:700;">66.50</td><td style="color:var(--danger);font-weight:700;">38.00</td><td><span class="risk-badge both">Attendance & Marks</span></td></tr>
              </tbody>
            </table>
            <div style="background:var(--bg-subtle);padding:0.75rem;border-radius:6px;border:1px solid var(--border-color);margin-top:0.75rem;font-size:0.78rem;color:var(--text-sub);">
              * Views provide instant aggregation; integrity constraints successfully block duplicate attendance and negative marks.
            </div>
          </div>

        </div>
      </div>
    `
  },

  // Slide 10: Conclusion & Future Scope
  {
    num: 10,
    title: 'Conclusion & Future Scope',
    render: () => `
      <div>
        <h2 style="font-size:1.8rem;font-weight:800;color:var(--primary);margin-bottom:1.5rem;">Conclusion & Future Scope</h2>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:2rem;">
          
          <div style="background:var(--bg-subtle);border:1px solid var(--border-color);border-radius:12px;padding:1.5rem;">
            <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1rem;">
              <span style="font-size:1.8rem;">✅</span>
              <h3 style="font-size:1.2rem;font-weight:800;">Summary</h3>
            </div>
            <ul style="font-size:0.95rem;color:var(--text-sub);padding-left:1.2rem;line-height:1.8;">
              <li>Six constrained normalized tables, three SQL views, and three stored procedures</li>
              <li>A single, unified dashboard for attendance, assignments, exams and marks</li>
              <li>Subjects at risk are flagged automatically, along with the precise reason</li>
              <li>Hands-on practical mastery of schema design, constraints, aggregation, views, and procedures</li>
            </ul>
          </div>

          <div style="background:var(--bg-subtle);border:1px solid var(--border-color);border-radius:12px;padding:1.5rem;">
            <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1rem;">
              <span style="font-size:1.8rem;">🚀</span>
              <h3 style="font-size:1.2rem;font-weight:800;">Future Scope</h3>
            </div>
            <ul style="font-size:0.95rem;color:var(--text-sub);padding-left:1.2rem;line-height:1.8;">
              <li>Triggers to validate marks boundaries and automatically tag late assignments</li>
              <li>Authentication & role-based access control for students and faculty</li>
              <li>Automated WhatsApp / Email alert notifications for impending deadlines and risk</li>
              <li>Native mobile app integration and ML-based CGPA prediction engine</li>
            </ul>
          </div>

        </div>
      </div>
    `
  },

  // Slide 11: References
  {
    num: 11,
    title: 'Academic References',
    render: () => `
      <div>
        <h2 style="font-size:1.8rem;font-weight:800;color:var(--primary);margin-bottom:1.5rem;">References</h2>
        <div style="display:flex;flex-direction:column;gap:1rem;">
          ${[
            { num: 1, text: 'R. Elmasri and S. B. Navathe, Fundamentals of Database Systems, 7th ed., Pearson, 2016.' },
            { num: 2, text: 'A. Silberschatz, H. F. Korth and S. Sudarshan, Database System Concepts, 7th ed., McGraw-Hill, 2019.' },
            { num: 3, text: 'R. Ramakrishnan and J. Gehrke, Database Management Systems, 3rd ed., McGraw-Hill, 2003.' },
            { num: 4, text: 'Oracle Corporation, MySQL 8.0 Reference Manual. Available: https://dev.mysql.com/doc/refman/8.0/en/' },
            { num: 5, text: 'W3Schools, SQL Tutorial & Comprehensive Reference. Available: https://www.w3schools.com/sql/' }
          ].map(r => `
            <div style="background:var(--bg-subtle);border:1px solid var(--border-color);border-radius:8px;padding:1rem 1.25rem;display:flex;align-items:flex-start;gap:1rem;">
              <span style="background:var(--primary);color:#fff;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:0.75rem;flex-shrink:0;">${r.num}</span>
              <span style="font-size:0.95rem;color:var(--text-main);">${r.text}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `
  }
];

function initPresentation() {
  const pillsContainer = document.getElementById('slidePillsContainer');
  pillsContainer.innerHTML = '';

  for (let i = 1; i <= state.totalSlides; i++) {
    const pill = document.createElement('button');
    pill.className = `slide-pill-btn ${i === 1 ? 'active' : ''}`;
    pill.textContent = i;
    pill.addEventListener('click', () => {
      goToSlide(i);
    });
    pillsContainer.appendChild(pill);
  }

  document.getElementById('btnPrevSlide').addEventListener('click', () => {
    if (state.currentSlide > 1) goToSlide(state.currentSlide - 1);
  });

  document.getElementById('btnNextSlide').addEventListener('click', () => {
    if (state.currentSlide < state.totalSlides) goToSlide(state.currentSlide + 1);
  });

  document.getElementById('btnSlideFullscreen').addEventListener('click', () => {
    const canvas = document.getElementById('slideCanvas');
    if (canvas.requestFullscreen) {
      canvas.requestFullscreen();
    }
  });

  // Keyboard Navigation
  window.addEventListener('keydown', (e) => {
    if (state.activeTab !== 'pane-slides') return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown') {
      if (state.currentSlide < state.totalSlides) goToSlide(state.currentSlide + 1);
    } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
      if (state.currentSlide > 1) goToSlide(state.currentSlide - 1);
    }
  });
}

function goToSlide(slideNum) {
  state.currentSlide = slideNum;
  document.getElementById('slideCounterText').textContent = `Slide ${slideNum} of ${state.totalSlides}`;
  
  const pills = document.querySelectorAll('.slide-pill-btn');
  pills.forEach((p, idx) => {
    p.classList.toggle('active', idx + 1 === slideNum);
  });

  renderSlide(slideNum);
}

function renderSlide(slideNum) {
  const canvas = document.getElementById('slideCanvas');
  const slide = SLIDES_DATA[slideNum - 1];
  if (slide) {
    canvas.innerHTML = slide.render();
  }
}

// -------------------------------------------------------------
// 11. ACADEMIC AUDIT REPORT TAB
// -------------------------------------------------------------
function initReport() {
  // Setup handled by navigation
}

function renderReport() {
  const stud = window.survivalDB.data.students.find(s => s.student_id === state.currentStudentId);
  if (!stud) return;

  const health = window.survivalDB.getStudentHealth(state.currentStudentId);
  const attSummary = window.survivalDB.getViewAttendanceSummary(state.currentStudentId);
  const marksSummary = window.survivalDB.getViewMarksSummary(state.currentStudentId);

  document.getElementById('repName').textContent = stud.name;
  document.getElementById('repPRN').textContent = stud.prn;
  document.getElementById('repAttPct').textContent = `${health.overallAttPct.toFixed(1)}%`;
  document.getElementById('repMarksPct').textContent = `${health.overallMarksPct.toFixed(1)}%`;
  document.getElementById('repAssignPct').textContent = `${health.assignPct}%`;
  document.getElementById('repReadiness').textContent = `${health.examReadinessScore}%`;

  const tbody = document.getElementById('reportSubjectsTableBody');
  tbody.innerHTML = '';

  window.survivalDB.data.subjects.forEach(sub => {
    const att = attSummary.find(a => a.subject_id === sub.subject_id);
    const mk = marksSummary.find(m => m.subject_id === sub.subject_id);

    const attPct = att ? att.attendance_pct : 0;
    const mkPct = mk ? mk.marks_pct : 0;
    const isAttRisk = attPct < state.attThreshold;
    const isMkRisk = mkPct < state.marksThreshold;

    let riskReason = 'Safe';
    if (isAttRisk && isMkRisk) riskReason = 'Attendance & Marks';
    else if (isAttRisk) riskReason = 'Low Attendance';
    else if (isMkRisk) riskReason = 'Low Marks';

    let eligibility = (attPct >= 75) ? 'ELIGIBLE' : 'DEBARRED RISK (< 75%)';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${sub.subject_code}</strong></td>
      <td>${sub.subject_name}</td>
      <td>${att ? `${att.attended_lectures} / ${att.total_lectures}` : '0/0'}</td>
      <td style="font-weight:700;color:${isAttRisk ? '#dc2626' : '#16a34a'};">${attPct.toFixed(1)}%</td>
      <td>${mk ? `${mk.total_obtained} / ${mk.total_max}` : '0/0'}</td>
      <td style="font-weight:700;color:${isMkRisk ? '#dc2626' : '#0f172a'};">${mkPct.toFixed(1)}%</td>
      <td><strong>${riskReason}</strong></td>
      <td><span style="font-weight:800;color:${attPct >= 75 ? '#16a34a' : '#dc2626'};">${eligibility}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

// -------------------------------------------------------------
// 12. MODALS & FORMS
// -------------------------------------------------------------
function initModals() {
  // Populate dropdowns in modals
  const attSubSel = document.getElementById('attSubjectSelect');
  const assignSubSel = document.getElementById('assignSubjectSelect');
  const examSel = document.getElementById('marksExamSelect');

  window.survivalDB.data.subjects.forEach(s => {
    attSubSel.innerHTML += `<option value="${s.subject_id}">${s.subject_name} (${s.subject_code})</option>`;
    assignSubSel.innerHTML += `<option value="${s.subject_id}">${s.subject_name} (${s.subject_code})</option>`;
  });

  window.survivalDB.data.exams.forEach(e => {
    const sub = window.survivalDB.data.subjects.find(s => s.subject_id === e.subject_id) || {};
    examSel.innerHTML += `<option value="${e.exam_id}" data-max="${e.max_marks}">${sub.subject_name} — ${e.exam_type} (Max: ${e.max_marks})</option>`;
  });

  // Threshold sliders
  const attSlider = document.getElementById('threshAttSlider');
  const marksSlider = document.getElementById('threshMarksSlider');
  const lblAtt = document.getElementById('valThreshAtt');
  const lblMarks = document.getElementById('valThreshMarks');

  attSlider.addEventListener('input', (e) => {
    state.attThreshold = Number(e.target.value);
    lblAtt.textContent = `${state.attThreshold}%`;
    renderAll();
  });

  marksSlider.addEventListener('input', (e) => {
    state.marksThreshold = Number(e.target.value);
    lblMarks.textContent = `${state.marksThreshold}%`;
    renderAll();
  });

  document.getElementById('btnResetThresholds').addEventListener('click', () => {
    state.attThreshold = 75;
    state.marksThreshold = 40;
    attSlider.value = 75;
    marksSlider.value = 40;
    lblAtt.textContent = '75%';
    lblMarks.textContent = '40%';
    renderAll();
    showToast('Reset thresholds to default 75% attendance & 40% marks', '🔄');
  });

  document.getElementById('btnAdjustThresholds').addEventListener('click', () => {
    openModal('modalThresholds');
  });

  // Modal 1: Form Mark Attendance Submit
  document.getElementById('formMarkAttendance').addEventListener('submit', (e) => {
    e.preventDefault();
    const subId = Number(document.getElementById('attSubjectSelect').value);
    const dateStr = document.getElementById('attLectureDate').value;
    const status = document.querySelector('input[name="attStatusRadio"]:checked').value;

    const res = window.survivalDB.spMarkAttendance(state.currentStudentId, subId, dateStr, status);
    closeAllModals();
    showToast(res.message, '✅');
    renderAll();
  });

  // Modal 2: Form Add Assignment Submit
  document.getElementById('formAddAssignment').addEventListener('submit', (e) => {
    e.preventDefault();
    const subId = Number(document.getElementById('assignSubjectSelect').value);
    const title = document.getElementById('assignTitleInput').value;
    const dueDate = document.getElementById('assignDueDateInput').value;
    const maxScore = Number(document.getElementById('assignMaxScoreInput').value);

    const newId = window.survivalDB.addAssignment({
      studentId: state.currentStudentId,
      subjectId: subId,
      title,
      dueDate,
      maxScore
    });

    closeAllModals();
    showToast(`Added Assignment #${newId}!`, '📝');
    renderAll();
  });

  // Modal 3: Form Update Marks Submit
  document.getElementById('formUpdateMarks').addEventListener('submit', (e) => {
    e.preventDefault();
    const examId = Number(document.getElementById('marksExamSelect').value);
    const marksObt = Number(document.getElementById('marksObtainedInput').value);

    try {
      window.survivalDB.updateMarks(state.currentStudentId, examId, marksObt);
      closeAllModals();
      showToast('Marks successfully saved to database!', '🏆');
      renderAll();
    } catch (err) {
      alert(`Constraint Violation: ${err.message}`);
    }
  });
}

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add('open');
}

function closeAllModals() {
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('open'));
}

// Global modal close on ESC or background click
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeAllModals();
});

document.querySelectorAll('.modal-overlay').forEach(m => {
  m.addEventListener('click', (e) => {
    if (e.target === m) closeAllModals();
  });
});

// -------------------------------------------------------------
// 13. MASTER RENDER CONTROLLER
// -------------------------------------------------------------
function renderAll() {
  renderStudentBio();
  renderDashboard();
  renderAttendanceTab();
  renderAssignmentsTab();
  renderMarksTab();
  renderReport();
}

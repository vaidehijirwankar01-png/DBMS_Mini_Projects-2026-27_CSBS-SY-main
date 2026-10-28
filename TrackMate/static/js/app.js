/**
 * TrackMate Vanilla JS Frontend
 * Connects directly to Flask API endpoints:
 * - /api/subjects
 * - /api/study-sessions (GET, POST, PUT, DELETE)
 * - /api/habits (GET, POST, PUT, DELETE)
 * - /api/habit-logs (GET, POST, PUT, DELETE)
 * - /api/study-stats
 * - /api/habit-progress
 * - /api/weekly-report
 * - /api/tasks
 * - /api/exams
 * - /api/goals-progress
 * - /api/calendar-activity
 */

let state = {
    subjects: [],
    sessions: [],
    habits: [],
    tasks: [],
    exams: [],
    selectedDate: new Date().toISOString().split('T')[0],
    editingSessionId: null,
    pomo: {
        timer: null,
        mode: 'focus', // focus, shortBreak, longBreak
        timeLeft: 25 * 60,
        isRunning: false,
    }
};

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initDatePicker();
    initSessionForm();
    initHabitModal();
    initTaskModal();
    initExamModal();
    initPomodoro();
    initExportBtn();

    // Initial data fetch
    fetchInitialData();
});

function getTodayString() {
    return new Date().toISOString().split('T')[0];
}

// -------------------------------------------------------------
// NAVIGATION
// -------------------------------------------------------------
function initNavigation() {
    const navButtons = document.querySelectorAll('.nav-item');
    const tabPanes = document.querySelectorAll('.tab-pane');

    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            navButtons.forEach(b => b.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));

            btn.classList.add('active');
            const targetPane = document.getElementById(`tab-${tabName}`);
            if (targetPane) targetPane.classList.add('active');

            if (tabName === 'analytics') renderSubjectAnalytics();
            if (tabName === 'calendar') loadCalendar();
            if (tabName === 'goals') loadGoalsAndBadges();
        });
    });

    const viewAllBtn = document.getElementById('linkViewAllSessions');
    if (viewAllBtn) {
        viewAllBtn.addEventListener('click', () => {
            const sessionsNav = document.querySelector('.nav-item[data-tab="sessions"]');
            if (sessionsNav) sessionsNav.click();
        });
    }

    const openNewBtn = document.getElementById('btnOpenNewSession');
    if (openNewBtn) {
        openNewBtn.addEventListener('click', () => {
            const sessionsNav = document.querySelector('.nav-item[data-tab="sessions"]');
            if (sessionsNav) sessionsNav.click();
            document.getElementById('sessionTopic')?.focus();
        });
    }
}

// -------------------------------------------------------------
// CURRENT USER & INITIAL DATA FETCH
// -------------------------------------------------------------
async function fetchCurrentUser() {
    try {
        const res = await fetch('/api/auth/me');
        if (res.status === 401) {
            window.location.href = '/login';
            return null;
        }
        if (!res.ok) return null;
        const user = await res.json();
        state.currentUser = user;

        const nameEl = document.getElementById('sidebarUserName');
        const emailEl = document.getElementById('sidebarUserEmail');
        const avatarEl = document.getElementById('sidebarUserAvatar');
        const greetingEl = document.getElementById('headerGreeting');

        if (nameEl && user.name) nameEl.textContent = user.name;
        if (emailEl && user.email) emailEl.textContent = user.email;
        if (avatarEl && user.name) {
            const initials = user.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
            avatarEl.textContent = initials || 'ST';
        }
        if (greetingEl && user.name) {
            greetingEl.textContent = `Welcome back, ${user.name.split(' ')[0]}`;
        }
        return user;
    } catch (err) {
        console.warn('Could not load current user profile:', err);
        return null;
    }
}

async function fetchInitialData() {
    await fetchCurrentUser();
    await fetchSubjects();
    await Promise.all([
        fetchDashboardStats(),
        fetchHabitsAndLogs(),
        fetchStudySessions(),
        fetchTasks(),
        fetchExams(),
        loadWeeklyReport()
    ]);
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// -------------------------------------------------------------
// SUBJECTS
// -------------------------------------------------------------
async function fetchSubjects() {
    try {
        const res = await fetch('/api/subjects');
        if (!res.ok) throw new Error('Failed to load subjects');
        state.subjects = await res.json();
        populateSubjectDropdowns();
    } catch (err) {
        console.error('Error fetching subjects:', err);
    }
}

function populateSubjectDropdowns() {
    const selects = [
        document.getElementById('sessionSubjectSelect'),
        document.getElementById('filterSessionSubject'),
        document.getElementById('pomoSubjectSelect'),
        document.getElementById('modalTaskSubject'),
        document.getElementById('modalExamSubject')
    ];

    selects.forEach(select => {
        if (!select) return;
        const currentVal = select.value;
        const isFilter = select.id === 'filterSessionSubject';
        select.innerHTML = isFilter ? '<option value="">All Subjects</option>' : '<option value="">Select subject...</option>';

        state.subjects.forEach(sub => {
            const opt = document.createElement('option');
            opt.value = sub.subject_id;
            opt.textContent = sub.subject_name;
            select.appendChild(opt);
        });

        if (currentVal) select.value = currentVal;
    });
}

// -------------------------------------------------------------
// STUDY SESSIONS (CRUD)
// -------------------------------------------------------------
async function fetchStudySessions() {
    try {
        const res = await fetch('/api/study-sessions');
        if (!res.ok) throw new Error('Failed to fetch study sessions');
        state.sessions = await res.json();
        renderRecentSessions();
        renderAllSessions();
    } catch (err) {
        console.error(err);
    }
}

function renderRecentSessions() {
    const tbody = document.getElementById('recentSessionsTableBody');
    if (!tbody) return;

    const recent = state.sessions.slice(0, 5);
    if (recent.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No study sessions recorded yet.</td></tr>';
        return;
    }

    tbody.innerHTML = recent.map(s => `
        <tr>
            <td>${s.study_date}</td>
            <td><strong>${escapeHtml(s.subject_name)}</strong></td>
            <td>${escapeHtml(s.topic)}</td>
            <td><span class="badge badge-lavender">${s.duration_minutes} min</span></td>
            <td>
                <button class="btn-subtle btn-sm" onclick="editSession(${s.session_id})">Edit</button>
            </td>
        </tr>
    `).join('');
}

function renderAllSessions() {
    const tbody = document.getElementById('allSessionsTableBody');
    if (!tbody) return;

    const searchTerm = (document.getElementById('filterSessionSearch')?.value || '').toLowerCase();
    const subjectFilter = document.getElementById('filterSessionSubject')?.value;

    const filtered = state.sessions.filter(s => {
        const matchesSearch = !searchTerm || s.topic.toLowerCase().includes(searchTerm) || (s.notes && s.notes.toLowerCase().includes(searchTerm));
        const matchesSubject = !subjectFilter || String(s.subject_id) === String(subjectFilter);
        return matchesSearch && matchesSubject;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No sessions match your filter.</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map(s => `
        <tr>
            <td>${s.study_date}</td>
            <td>${s.start_time ? s.start_time.slice(0, 5) : '—'}</td>
            <td><strong>${escapeHtml(s.subject_name)}</strong></td>
            <td>${escapeHtml(s.topic)}</td>
            <td><span class="badge badge-lavender">${s.duration_minutes} min (${s.duration_hours}h)</span></td>
            <td><small class="text-muted">${escapeHtml(s.notes || '—')}</small></td>
            <td>
                <button class="btn-subtle btn-sm" onclick="editSession(${s.session_id})">Edit</button>
                <button class="btn-subtle btn-sm text-danger" onclick="deleteSession(${s.session_id})">Delete</button>
            </td>
        </tr>
    `).join('');
}

function initSessionForm() {
    const form = document.getElementById('studySessionForm');
    const cancelBtn = document.getElementById('btnCancelEditSession');
    const dateInput = document.getElementById('sessionDate');
    if (dateInput) dateInput.value = getTodayString();

    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            subject_id: parseInt(document.getElementById('sessionSubjectSelect').value, 10),
            topic: document.getElementById('sessionTopic').value.trim(),
            study_date: document.getElementById('sessionDate').value,
            start_time: document.getElementById('sessionStartTime').value || null,
            duration_minutes: parseInt(document.getElementById('sessionDuration').value, 10),
            notes: document.getElementById('sessionNotes').value.trim() || null
        };

        const isEditing = Boolean(state.editingSessionId);
        const url = isEditing ? `/api/study-sessions/${state.editingSessionId}` : '/api/study-sessions';
        const method = isEditing ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to save session');

            showToast(isEditing ? 'Study session updated!' : 'Study session saved!', 'success');
            resetSessionForm();
            await fetchStudySessions();
            await fetchDashboardStats();
            await loadWeeklyReport();
        } catch (err) {
            showToast(err.message, 'danger');
        }
    });

    cancelBtn?.addEventListener('click', resetSessionForm);

    document.getElementById('filterSessionSearch')?.addEventListener('input', renderAllSessions);
    document.getElementById('filterSessionSubject')?.addEventListener('change', renderAllSessions);
}

window.editSession = function(sessionId) {
    const session = state.sessions.find(s => s.session_id === sessionId);
    if (!session) return;

    state.editingSessionId = sessionId;
    document.getElementById('editSessionId').value = sessionId;
    document.getElementById('sessionSubjectSelect').value = session.subject_id;
    document.getElementById('sessionTopic').value = session.topic;
    document.getElementById('sessionDate').value = session.study_date;
    document.getElementById('sessionStartTime').value = session.start_time ? session.start_time.slice(0, 5) : '';
    document.getElementById('sessionDuration').value = session.duration_minutes;
    document.getElementById('sessionNotes').value = session.notes || '';

    document.getElementById('sessionFormHeading').textContent = 'Update Study Session';
    document.getElementById('btnSubmitSession').textContent = 'Update Study Session';
    document.getElementById('btnCancelEditSession').style.display = 'inline-block';

    // Switch to Sessions tab
    document.querySelector('.nav-item[data-tab="sessions"]')?.click();
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

function resetSessionForm() {
    state.editingSessionId = null;
    const form = document.getElementById('studySessionForm');
    form?.reset();
    document.getElementById('editSessionId').value = '';
    document.getElementById('sessionDate').value = getTodayString();
    document.getElementById('sessionFormHeading').textContent = 'Add New Study Session';
    document.getElementById('btnSubmitSession').textContent = 'Save Study Session';
    document.getElementById('btnCancelEditSession').style.display = 'none';
}

window.deleteSession = async function(sessionId) {
    if (!confirm('Are you sure you want to delete this study session? This action cannot be undone.')) return;
    try {
        const res = await fetch(`/api/study-sessions/${sessionId}`, { method: 'DELETE' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to delete');

        showToast('Study session deleted successfully.', 'success');
        await fetchStudySessions();
        await fetchDashboardStats();
        await loadWeeklyReport();
    } catch (err) {
        showToast(err.message, 'danger');
    }
};

// -------------------------------------------------------------
// HABITS & HABIT LOGS
// -------------------------------------------------------------
function initDatePicker() {
    const picker = document.getElementById('habitLogDatePicker');
    if (picker) {
        picker.value = state.selectedDate;
        picker.addEventListener('change', (e) => {
            state.selectedDate = e.target.value;
            fetchHabitsAndLogs();
        });
    }

    document.getElementById('btnTodayHabitDate')?.addEventListener('click', () => {
        state.selectedDate = getTodayString();
        if (picker) picker.value = state.selectedDate;
        fetchHabitsAndLogs();
    });

    document.getElementById('btnPrevHabitDate')?.addEventListener('click', () => {
        changeHabitDate(-1);
    });
    document.getElementById('btnNextHabitDate')?.addEventListener('click', () => {
        changeHabitDate(1);
    });
}

function changeHabitDate(daysDelta) {
    const current = new Date(state.selectedDate + 'T00:00:00');
    current.setDate(current.getDate() + daysDelta);
    state.selectedDate = current.toISOString().split('T')[0];
    const picker = document.getElementById('habitLogDatePicker');
    if (picker) picker.value = state.selectedDate;
    fetchHabitsAndLogs();
}

async function fetchHabitsAndLogs() {
    try {
        const [habitsRes, logsRes] = await Promise.all([
            fetch('/api/habits'),
            fetch(`/api/habit-logs?log_date=${state.selectedDate}`)
        ]);

        state.habits = await habitsRes.json();
        const logs = await logsRes.json();
        const logMap = {};
        logs.forEach(l => { logMap[l.habit_id] = l; });

        renderDashboardHabits(logMap);
        renderFullHabits(logMap);
    } catch (err) {
        console.error('Error fetching habits and logs:', err);
    }
}

function renderDashboardHabits(logMap) {
    const container = document.getElementById('dashboardHabitsList');
    if (!container) return;

    if (state.habits.length === 0) {
        container.innerHTML = '<p class="empty-state">No habits created yet. Click Daily Habits to add one!</p>';
        return;
    }

    container.innerHTML = state.habits.map(h => {
        const isDone = Boolean(logMap[h.habit_id] && logMap[h.habit_id].completed);
        return `
            <div class="habit-row">
                <div class="habit-left">
                    <input type="checkbox" class="habit-checkbox" ${isDone ? 'checked' : ''}
                        onchange="toggleHabitLog(${h.habit_id}, this.checked)">
                    <div>
                        <div class="habit-title ${isDone ? 'text-muted' : ''}">${escapeHtml(h.habit_name)}</div>
                        <div class="habit-desc">${escapeHtml(h.description || '')}</div>
                    </div>
                </div>
                <span class="badge ${isDone ? 'badge-success' : ''}">${isDone ? 'Done' : 'Pending'}</span>
            </div>
        `;
    }).join('');
}

function renderFullHabits(logMap) {
    const container = document.getElementById('habitsFullList');
    if (!container) return;

    let completedCount = 0;
    const itemsHtml = state.habits.map(h => {
        const isDone = Boolean(logMap[h.habit_id] && logMap[h.habit_id].completed);
        if (isDone) completedCount++;
        return `
            <div class="habit-row">
                <div class="habit-left">
                    <input type="checkbox" class="habit-checkbox" ${isDone ? 'checked' : ''}
                        onchange="toggleHabitLog(${h.habit_id}, this.checked)">
                    <div>
                        <div class="habit-title">${escapeHtml(h.habit_name)}</div>
                        <div class="habit-desc">${escapeHtml(h.description || 'No description')}</div>
                    </div>
                </div>
                <div>
                    <span class="badge ${isDone ? 'badge-success' : ''}">${isDone ? 'Completed' : 'Pending'}</span>
                    <button class="btn-subtle btn-sm text-danger" onclick="deleteHabit(${h.habit_id})">Delete</button>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = itemsHtml || '<p class="empty-state">No habits created yet.</p>';

    const pct = state.habits.length > 0 ? Math.round((completedCount / state.habits.length) * 100) : 0;
    const label = document.getElementById('habitDayProgressLabel');
    if (label) label.textContent = `${pct}% Completed (${completedCount}/${state.habits.length})`;
}

window.toggleHabitLog = async function(habitId, completed) {
    try {
        const res = await fetch('/api/habit-logs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                habit_id: habitId,
                log_date: state.selectedDate,
                completed: completed
            })
        });
        if (!res.ok) throw new Error('Could not update habit log');
        await fetchHabitsAndLogs();
        await fetchDashboardStats();
    } catch (err) {
        showToast(err.message, 'danger');
    }
};

window.deleteHabit = async function(habitId) {
    if (!confirm('Are you sure you want to delete this habit and its history?')) return;
    try {
        const res = await fetch(`/api/habits/${habitId}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete habit');
        showToast('Habit deleted.', 'success');
        await fetchHabitsAndLogs();
        await fetchDashboardStats();
    } catch (err) {
        showToast(err.message, 'danger');
    }
};

function initHabitModal() {
    const modal = document.getElementById('habitModal');
    const openBtn = document.getElementById('btnOpenNewHabitModal');
    const form = document.getElementById('habitModalForm');

    openBtn?.addEventListener('click', () => { modal.style.display = 'flex'; });
    modal?.querySelectorAll('.btn-close-modal').forEach(b => {
        b.addEventListener('click', () => { modal.style.display = 'none'; });
    });

    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            habit_name: document.getElementById('modalHabitName').value.trim(),
            description: document.getElementById('modalHabitDesc').value.trim(),
            frequency: 'Daily',
            is_active: 1
        };

        try {
            const res = await fetch('/api/habits', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to create habit');

            showToast('Habit created!', 'success');
            modal.style.display = 'none';
            form.reset();
            await fetchHabitsAndLogs();
            await fetchDashboardStats();
        } catch (err) {
            showToast(err.message, 'danger');
        }
    });
}

// -------------------------------------------------------------
// DASHBOARD STATS & PROGRESS
// -------------------------------------------------------------
async function fetchDashboardStats() {
    const today = getTodayString();
    document.getElementById('headerDateString').textContent = new Date().toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    try {
        const [statsRes, habitsProgressRes, goalsRes] = await Promise.all([
            fetch('/api/study-stats'),
            fetch(`/api/habit-progress?today=${today}`),
            fetch(`/api/goals-progress?today=${today}`)
        ]);

        if (statsRes.ok) {
            const s = await statsRes.json();
            document.getElementById('statTotalSessions').textContent = s.total_sessions || 0;
            document.getElementById('statTotalHours').textContent = `${(s.total_hours || 0).toFixed(1)}h`;
            document.getElementById('statHoursSubtitle').textContent = `${s.total_minutes || 0} min total recorded`;
        }

        if (habitsProgressRes.ok) {
            const hp = await habitsProgressRes.json();
            document.getElementById('statActiveHabits').textContent = hp.total_habits || 0;
            document.getElementById('statHabitsDone').textContent = `${hp.completed_habits || 0} / ${hp.total_habits || 0}`;
            document.getElementById('statHabitPct').textContent = `${hp.completion_percentage || 0}% daily completion`;
            document.getElementById('statHabitProgressFill').style.width = `${hp.completion_percentage || 0}%`;
        }

        if (goalsRes.ok) {
            const g = await goalsRes.json();
            document.getElementById('dashDailyGoalPct').textContent = `${g.daily?.percentage || 0}% (${g.daily?.hours || 0}h / ${g.daily?.target_hours || 4}h)`;
            document.getElementById('dashDailyGoalBar').style.width = `${Math.min(100, g.daily?.percentage || 0)}%`;
            document.getElementById('dashWeeklyGoalPct').textContent = `${g.weekly?.percentage || 0}% (${g.weekly?.hours || 0}h / ${g.weekly?.target_hours || 25}h)`;
            document.getElementById('dashWeeklyGoalBar').style.width = `${Math.min(100, g.weekly?.percentage || 0)}%`;
        }
    } catch (err) {
        console.error('Error fetching dashboard stats:', err);
    }
}

// -------------------------------------------------------------
// WEEKLY REPORT & CHART
// -------------------------------------------------------------
let weeklyChartInstance = null;

async function loadWeeklyReport() {
    try {
        const today = getTodayString();
        const res = await fetch(`/api/weekly-report?today=${today}`);
        if (!res.ok) return;
        const data = await res.json();

        // Build 7-day array
        const daysMap = {};
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dStr = d.toISOString().split('T')[0];
            const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
            daysMap[dStr] = { label: `${dayName} (${dStr.slice(5)})`, hours: 0 };
        }

        data.forEach(item => {
            if (daysMap[item.study_date]) {
                daysMap[item.study_date].hours = item.total_hours;
            }
        });

        const labels = Object.values(daysMap).map(d => d.label);
        const values = Object.values(daysMap).map(d => d.hours);

        const ctx = document.getElementById('weeklyChart');
        if (!ctx) return;

        if (weeklyChartInstance) {
            weeklyChartInstance.destroy();
        }

        weeklyChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Study Hours',
                    data: values,
                    backgroundColor: '#8B5CF6',
                    hoverBackgroundColor: '#A78BFA',
                    borderRadius: 6,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { color: '#A6A0B5' },
                        grid: { color: '#30283D' }
                    },
                    x: {
                        ticks: { color: '#A6A0B5' },
                        grid: { display: false }
                    }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });
    } catch (err) {
        console.error('Error loading weekly report chart:', err);
    }
}

// -------------------------------------------------------------
// TASKS (PLANNER)
// -------------------------------------------------------------
async function fetchTasks() {
    try {
        const res = await fetch('/api/tasks');
        if (!res.ok) return;
        state.tasks = await res.json();
        renderTasks();
    } catch (err) {
        console.error(err);
    }
}

function renderTasks() {
    const pendingList = document.getElementById('pendingTasksList');
    const completedList = document.getElementById('completedTasksList');
    if (!pendingList || !completedList) return;

    const pending = state.tasks.filter(t => t.status === 'Pending');
    const completed = state.tasks.filter(t => t.status === 'Completed');

    document.getElementById('pendingTasksBadge').textContent = pending.length;
    document.getElementById('completedTasksBadge').textContent = completed.length;

    pendingList.innerHTML = pending.length === 0 ? '<p class="empty-state">No pending tasks!</p>' : pending.map(t => `
        <div class="habit-row">
            <div>
                <strong>${escapeHtml(t.title)}</strong>
                <div class="habit-desc">
                    <span class="badge ${t.priority === 'High' ? 'badge-orange' : ''}">${t.priority}</span>
                    ${t.subject_name ? `• ${escapeHtml(t.subject_name)}` : ''}
                    ${t.due_date ? `• Due: ${t.due_date}` : ''}
                </div>
            </div>
            <div>
                <button class="btn-primary btn-sm" onclick="completeTask(${t.task_id})">Complete</button>
                <button class="btn-subtle btn-sm text-danger" onclick="deleteTask(${t.task_id})">✕</button>
            </div>
        </div>
    `).join('');

    completedList.innerHTML = completed.length === 0 ? '<p class="empty-state">No completed tasks.</p>' : completed.map(t => `
        <div class="habit-row">
            <div>
                <strong class="text-muted" style="text-decoration: line-through;">${escapeHtml(t.title)}</strong>
                <div class="habit-desc">${t.subject_name ? escapeHtml(t.subject_name) : ''}</div>
            </div>
            <button class="btn-subtle btn-sm text-danger" onclick="deleteTask(${t.task_id})">✕</button>
        </div>
    `).join('');
}

window.completeTask = async function(taskId) {
    try {
        await fetch(`/api/tasks/${taskId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'Completed' })
        });
        showToast('Task marked as completed!', 'success');
        await fetchTasks();
    } catch (err) {
        showToast(err.message, 'danger');
    }
};

window.deleteTask = async function(taskId) {
    try {
        await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
        showToast('Task deleted', 'info');
        await fetchTasks();
    } catch (err) {
        showToast(err.message, 'danger');
    }
};

function initTaskModal() {
    const modal = document.getElementById('taskModal');
    const openBtn = document.getElementById('btnOpenNewTaskModal');
    const form = document.getElementById('taskModalForm');

    openBtn?.addEventListener('click', () => { modal.style.display = 'flex'; });
    modal?.querySelectorAll('.btn-close-modal').forEach(b => {
        b.addEventListener('click', () => { modal.style.display = 'none'; });
    });

    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            title: document.getElementById('modalTaskTitle').value.trim(),
            subject_id: document.getElementById('modalTaskSubject').value || null,
            due_date: document.getElementById('modalTaskDue').value || null,
            priority: document.getElementById('modalTaskPriority').value
        };

        try {
            const res = await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to create task');

            showToast('Task saved to planner!', 'success');
            modal.style.display = 'none';
            form.reset();
            await fetchTasks();
        } catch (err) {
            showToast(err.message, 'danger');
        }
    });
}

// -------------------------------------------------------------
// EXAMS
// -------------------------------------------------------------
async function fetchExams() {
    try {
        const res = await fetch('/api/exams');
        if (!res.ok) return;
        state.exams = await res.json();
        renderExams();
    } catch (err) {
        console.error(err);
    }
}

function renderExams() {
    const container = document.getElementById('examsCountdownList');
    if (!container) return;

    if (state.exams.length === 0) {
        container.innerHTML = '<p class="empty-state">No exams scheduled.</p>';
        return;
    }

    container.innerHTML = state.exams.map(e => `
        <div class="stat-card">
            <div class="stat-header">
                <span class="badge ${e.days_left <= 5 ? 'badge-orange' : ''}">${e.days_left >= 0 ? `${e.days_left} days left` : 'Completed'}</span>
                <button class="btn-subtle btn-sm text-danger" onclick="deleteExam(${e.exam_id})">✕</button>
            </div>
            <div style="font-size: 16px; font-weight: 700; margin-top: 6px;">${escapeHtml(e.exam_name)}</div>
            <div class="stat-caption">${escapeHtml(e.subject_name || 'General')} • ${e.exam_date}</div>
            ${e.notes ? `<p class="stat-caption" style="margin-top: 4px;">${escapeHtml(e.notes)}</p>` : ''}
        </div>
    `).join('');

    // Update upcoming exam notice on dashboard
    const urgent = state.exams.find(e => e.days_left >= 0);
    const dashNotice = document.getElementById('dashExamNoticeContent');
    if (dashNotice) {
        if (urgent) {
            dashNotice.innerHTML = `
                <strong>Next: ${escapeHtml(urgent.exam_name)}</strong>
                <p>${urgent.days_left} day${urgent.days_left === 1 ? '' : 's'} away (${urgent.exam_date})</p>
            `;
        } else {
            dashNotice.innerHTML = `
                <strong>No upcoming exams scheduled</strong>
                <p>Keep a steady habit of reviewing notes.</p>
            `;
        }
    }
}

window.deleteExam = async function(examId) {
    if (!confirm('Delete this exam?')) return;
    try {
        await fetch(`/api/exams/${examId}`, { method: 'DELETE' });
        showToast('Exam deleted', 'info');
        await fetchExams();
    } catch (err) {
        showToast(err.message, 'danger');
    }
};

function initExamModal() {
    const modal = document.getElementById('examModal');
    const openBtn = document.getElementById('btnOpenNewExamModal');
    const form = document.getElementById('examModalForm');

    openBtn?.addEventListener('click', () => { modal.style.display = 'flex'; });
    modal?.querySelectorAll('.btn-close-modal').forEach(b => {
        b.addEventListener('click', () => { modal.style.display = 'none'; });
    });

    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            exam_name: document.getElementById('modalExamName').value.trim(),
            subject_id: document.getElementById('modalExamSubject').value || null,
            exam_date: document.getElementById('modalExamDate').value,
            notes: document.getElementById('modalExamNotes').value.trim() || null
        };

        try {
            const res = await fetch('/api/exams', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to add exam');

            showToast('Exam added!', 'success');
            modal.style.display = 'none';
            form.reset();
            await fetchExams();
        } catch (err) {
            showToast(err.message, 'danger');
        }
    });
}

// -------------------------------------------------------------
// POMODORO TIMER
// -------------------------------------------------------------
function initPomodoro() {
    const modeButtons = document.querySelectorAll('.timer-mode-btn');
    const startBtn = document.getElementById('btnPomoStart');
    const pauseBtn = document.getElementById('btnPomoPause');
    const resetBtn = document.getElementById('btnPomoReset');

    modeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            modeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            setPomodoroMode(btn.dataset.mode);
        });
    });

    startBtn?.addEventListener('click', startPomodoro);
    pauseBtn?.addEventListener('click', pausePomodoro);
    resetBtn?.addEventListener('click', resetPomodoro);
}

function setPomodoroMode(mode) {
    state.pomo.mode = mode;
    pausePomodoro();

    if (mode === 'focus') state.pomo.timeLeft = 25 * 60;
    else if (mode === 'shortBreak') state.pomo.timeLeft = 5 * 60;
    else if (mode === 'longBreak') state.pomo.timeLeft = 15 * 60;

    const label = document.getElementById('pomodoroModeLabel');
    if (label) label.textContent = mode === 'focus' ? 'Focus Mode' : 'Break Time';

    updateTimerDisplay();
}

function startPomodoro() {
    if (state.pomo.isRunning) return;
    state.pomo.isRunning = true;

    document.getElementById('btnPomoStart').style.display = 'none';
    document.getElementById('btnPomoPause').style.display = 'inline-block';

    state.pomo.timer = setInterval(() => {
        state.pomo.timeLeft--;
        updateTimerDisplay();

        if (state.pomo.timeLeft <= 0) {
            clearInterval(state.pomo.timer);
            state.pomo.isRunning = false;
            document.getElementById('btnPomoStart').style.display = 'inline-block';
            document.getElementById('btnPomoPause').style.display = 'none';
            handlePomodoroComplete();
        }
    }, 1000);
}

function pausePomodoro() {
    state.pomo.isRunning = false;
    clearInterval(state.pomo.timer);
    document.getElementById('btnPomoStart').style.display = 'inline-block';
    document.getElementById('btnPomoPause').style.display = 'none';
}

function resetPomodoro() {
    pausePomodoro();
    setPomodoroMode(state.pomo.mode);
}

function updateTimerDisplay() {
    const minutes = Math.floor(state.pomo.timeLeft / 60);
    const seconds = state.pomo.timeLeft % 60;
    const formatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    const mainDisplay = document.getElementById('pomodoroTimerDisplay');
    if (mainDisplay) mainDisplay.textContent = formatted;

    const topDisplay = document.getElementById('topTimerDisplay');
    if (topDisplay) topDisplay.textContent = formatted;
}

async function handlePomodoroComplete() {
    showToast('Pomodoro focus block finished! Great job!', 'success');

    if (state.pomo.mode === 'focus') {
        const subjectId = document.getElementById('pomoSubjectSelect')?.value;
        const topic = document.getElementById('pomoTopicInput')?.value.trim() || 'Pomodoro Deep Focus Block';

        if (subjectId) {
            try {
                await fetch('/api/study-sessions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        subject_id: parseInt(subjectId, 10),
                        topic,
                        study_date: getTodayString(),
                        duration_minutes: 25,
                        notes: 'Pomodoro timer recorded automatically'
                    })
                });
                showToast('25m logged to Study Sessions!', 'success');
                await fetchStudySessions();
                await fetchDashboardStats();
            } catch (err) {
                console.error(err);
            }
        }
    }
}

// -------------------------------------------------------------
// SUBJECT ANALYTICS
// -------------------------------------------------------------
let subjectPieChartInstance = null;

async function renderSubjectAnalytics() {
    try {
        const res = await fetch('/api/study-stats/subjects');
        if (!res.ok) return;
        const subjects = await res.json();

        const tbody = document.getElementById('subjectAnalyticsTableBody');
        const totalMinutes = subjects.reduce((sum, s) => sum + s.total_minutes, 0);

        if (tbody) {
            tbody.innerHTML = subjects.map(s => {
                const share = totalMinutes > 0 ? ((s.total_minutes / totalMinutes) * 100).toFixed(1) : 0;
                return `
                    <tr>
                        <td><strong>${escapeHtml(s.subject_name)}</strong></td>
                        <td>${s.total_sessions}</td>
                        <td>${s.total_hours}h</td>
                        <td>${share}%</td>
                        <td><span class="badge ${s.total_sessions === 0 ? 'badge-orange' : 'badge-success'}">${s.total_sessions === 0 ? 'Needs Attention' : 'Active'}</span></td>
                    </tr>
                `;
            }).join('');
        }

        const ctx = document.getElementById('subjectPieChart');
        if (!ctx) return;

        if (subjectPieChartInstance) subjectPieChartInstance.destroy();

        const labels = subjects.map(s => s.subject_name);
        const data = subjects.map(s => s.total_minutes);
        const colors = ['#8B5CF6', '#A78BFA', '#C4B5FD', '#4ADE80', '#6366F1', '#FBBF24'];

        subjectPieChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: colors.slice(0, labels.length)
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: '#F5F3FF' }
                    }
                }
            }
        });
    } catch (err) {
        console.error(err);
    }
}

// -------------------------------------------------------------
// CALENDAR ACTIVITY
// -------------------------------------------------------------
async function loadCalendar() {
    const now = new Date();
    try {
        const res = await fetch(`/api/calendar-activity?year=${now.getFullYear()}&month=${now.getMonth() + 1}`);
        if (!res.ok) return;
        const data = await res.json();
        renderCalendarGrid(data);
    } catch (err) {
        console.error(err);
    }
}

function renderCalendarGrid(data) {
    const grid = document.getElementById('calendarGrid');
    if (!grid) return;

    grid.innerHTML = '';
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
        const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const act = data.activity ? data.activity[dStr] : data[dStr];
        const intensity = act ? act.intensity : 0;
        const hours = act ? act.total_hours : 0;

        const cell = document.createElement('div');
        cell.className = `cal-day-cell cal-intensity-${intensity}`;
        cell.innerHTML = `
            <div class="cal-day-number">${day}</div>
            <div style="font-size:11px; color:#A6A0B5; margin-top:4px;">${hours > 0 ? `${hours}h` : ''}</div>
        `;
        cell.addEventListener('click', () => showDayInspector(dStr, act));
        grid.appendChild(cell);
    }
}

function showDayInspector(dateStr, activity) {
    const panel = document.getElementById('dayInspectorPanel');
    const title = document.getElementById('inspectorDateTitle');
    const content = document.getElementById('inspectorDetailsContent');
    if (!panel || !title || !content) return;

    panel.style.display = 'block';
    title.textContent = `Activity Details: ${dateStr}`;

    if (!activity || (activity.sessions === 0 && activity.completed_habits === 0 && (!activity.tasks || activity.tasks.length === 0))) {
        content.innerHTML = '<p class="empty-state">No activity recorded on this date.</p>';
        return;
    }

    content.innerHTML = `
        <div style="display:flex; gap:16px; margin-bottom:12px;">
            <div class="stat-card" style="flex:1;">
                <span class="stat-label">Study Sessions</span>
                <span class="stat-value">${activity.sessions || 0} (${activity.total_hours || 0}h)</span>
            </div>
            <div class="stat-card" style="flex:1;">
                <span class="stat-label">Habits Completed</span>
                <span class="stat-value">${activity.completed_habits || 0}</span>
            </div>
        </div>
    `;

    document.getElementById('btnCloseInspector')?.addEventListener('click', () => {
        panel.style.display = 'none';
    });
}

// -------------------------------------------------------------
// GOALS & BADGES
// -------------------------------------------------------------
async function loadGoalsAndBadges() {
    try {
        const [goalsRes, badgesRes] = await Promise.all([
            fetch('/api/goals-progress'),
            fetch('/api/achievements')
        ]);

        if (goalsRes.ok) {
            const g = await goalsRes.json();
            document.getElementById('goalDailyVal').textContent = `${g.daily?.hours || 0}h`;
            document.getElementById('goalDailyTarget').textContent = `${g.daily?.target_hours || 4}h`;
            document.getElementById('barDailyGoal').style.width = `${Math.min(100, g.daily?.percentage || 0)}%`;
            document.getElementById('goalDailyRemaining').textContent = `${g.daily?.remaining_hours || 0}h remaining today`;

            document.getElementById('goalWeeklyVal').textContent = `${g.weekly?.hours || 0}h`;
            document.getElementById('goalWeeklyTarget').textContent = `${g.weekly?.target_hours || 25}h`;
            document.getElementById('barWeeklyGoal').style.width = `${Math.min(100, g.weekly?.percentage || 0)}%`;
            document.getElementById('goalWeeklyRemaining').textContent = `${g.weekly?.remaining_hours || 0}h remaining this week`;
        }

        if (badgesRes.ok) {
            const b = await badgesRes.json();
            document.getElementById('unlockedBadgesCount').textContent = b.earned_count || 0;
            const grid = document.getElementById('badgesGrid');
            if (grid && b.badges) {
                grid.innerHTML = b.badges.map(badge => `
                    <div class="stat-card ${badge.earned ? 'stat-card-highlight' : ''}" style="text-align:center;">
                        <div style="font-size:32px;">${badge.icon}</div>
                        <strong>${escapeHtml(badge.name)}</strong>
                        <p class="stat-caption">${escapeHtml(badge.description)}</p>
                        <span class="badge ${badge.earned ? 'badge-success' : ''}" style="margin-top:8px;">${badge.earned ? 'Unlocked' : `${badge.progress}/${badge.target}`}</span>
                    </div>
                `).join('');
            }
        }
    } catch (err) {
        console.error(err);
    }
}

// -------------------------------------------------------------
// EXPORT CSV
// -------------------------------------------------------------
function initExportBtn() {
    const btn = document.getElementById('btnExportData');
    const modal = document.getElementById('exportModal');
    if (btn) {
        btn.addEventListener('click', () => {
            if (modal) {
                modal.style.display = 'flex';
            } else {
                window.location.href = '/api/export/habit-logs-past-month.csv';
            }
        });
    }

    // Direct 30-day habit export button in Habits tab
    const btnHabits30d = document.getElementById('btnExportHabits30Days');
    if (btnHabits30d) {
        btnHabits30d.addEventListener('click', () => {
            window.location.href = '/api/export/habit-logs-past-month.csv';
        });
    }

    // Modal dataset choices
    document.querySelectorAll('.btn-export-choice').forEach(choiceBtn => {
        choiceBtn.addEventListener('click', () => {
            const dataset = choiceBtn.getAttribute('data-dataset') || 'habit-logs-past-month';
            if (modal) modal.style.display = 'none';
            window.location.href = `/api/export/${dataset}.csv`;
        });
    });
}

// Helper: Escape HTML
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

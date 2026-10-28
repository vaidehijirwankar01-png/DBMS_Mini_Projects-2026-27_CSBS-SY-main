// ============================================================================
// Antigravity Hospital Management System - Frontend Application Logic (app.js)
// ============================================================================

const API_BASE = '';

// App State
let state = {
    doctors: [],
    departments: [],
    patients: [],
    rooms: [],
    appointments: [],
    bills: [],
    auditLogs: [],
    stats: null
};

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', () => {
    initClock();
    setupTabs();
    setupModals();
    setupVivaConsole();
    setupQuickActions();
    loadAllData();
});

// Live Clock
function initClock() {
    const clockEl = document.getElementById('system-time');
    const updateTime = () => {
        const now = new Date();
        clockEl.textContent = now.toLocaleTimeString();
    };
    updateTime();
    setInterval(updateTime, 1000);
}

// Tab Switching
function setupTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const panes = document.querySelectorAll('.tab-pane');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            panes.forEach(p => p.classList.remove('active'));

            btn.classList.add('active');
            const targetPaneId = btn.getAttribute('data-tab');
            const targetPane = document.getElementById(targetPaneId);
            if (targetPane) targetPane.classList.add('active');
        });
    });
}

// Toast Notifications
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconSvg = '';
    if (type === 'success') {
        iconSvg = `<svg viewBox="0 0 24 24" width="18" height="18" stroke="#10b981" stroke-width="2.5" fill="none"><polyline points="20 6 9 17 4 12"/></svg>`;
    } else if (type === 'error') {
        iconSvg = `<svg viewBox="0 0 24 24" width="18" height="18" stroke="#f43f5e" stroke-width="2.5" fill="none"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;
    } else {
        iconSvg = `<svg viewBox="0 0 24 24" width="18" height="18" stroke="#3b82f6" stroke-width="2.5" fill="none"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
    }

    toast.innerHTML = `${iconSvg} <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 4500);
}

// Data Fetching
async function loadAllData() {
    try {
        await Promise.all([
            fetchStats(),
            fetchDepartments(),
            fetchDoctors(),
            fetchPatients(),
            fetchRooms(),
            fetchAppointments(),
            fetchBills(),
            fetchAuditLog()
        ]);
    } catch (err) {
        console.error("Error loading initial data:", err);
        showToast("Error connecting to MySQL server", "error");
    }
}

async function fetchStats() {
    try {
        const res = await fetch(`${API_BASE}/api/stats`);
        const data = await res.json();
        const stat = Array.isArray(data) ? data[0] : data;
        state.stats = stat;

        document.getElementById('stat-doctors').textContent = stat.total_doctors || '0';
        document.getElementById('stat-patients').textContent = stat.total_patients || '0';
        document.getElementById('stat-appointments').textContent = stat.total_appointments || '0';
        
        const occ = stat.total_rooms > 0 ? Math.round((stat.occupied_rooms / stat.total_rooms) * 100) : 0;
        document.getElementById('stat-occupancy').textContent = `${occ}%`;
        document.getElementById('stat-occupancy-sub').textContent = `${stat.occupied_rooms} of ${stat.total_rooms} beds occupied`;

        const rev = parseFloat(stat.cardiology_revenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
        document.getElementById('stat-revenue').textContent = `₹${rev}`;
    } catch (e) {
        console.error("Failed to fetch stats", e);
    }
}

async function fetchDepartments() {
    const res = await fetch(`${API_BASE}/api/departments`);
    const data = await res.json();
    state.departments = Array.isArray(data) ? data : [data];

    const tbody = document.querySelector('#table-overview-depts tbody');
    tbody.innerHTML = '';
    state.departments.forEach(d => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><code>#${d.department_id}</code></td>
            <td><strong>${escapeHtml(d.department_name)}</strong></td>
            <td>Floor ${d.floor}</td>
            <td>${escapeHtml(d.hod)}</td>
        `;
        tbody.appendChild(tr);
    });
}

async function fetchDoctors() {
    const res = await fetch(`${API_BASE}/api/doctors`);
    const data = await res.json();
    state.doctors = Array.isArray(data) ? data : [data];

    const tbody = document.querySelector('#table-doctors tbody');
    tbody.innerHTML = '';
    state.doctors.forEach(d => {
        const salary = parseFloat(d.salary).toLocaleString('en-IN', { minimumFractionDigits: 2 });
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><code>#${d.doctor_id}</code></td>
            <td><strong>${escapeHtml(d.name)}</strong></td>
            <td><span class="badge badge-info">${escapeHtml(d.specialization)}</span></td>
            <td>${escapeHtml(d.department_name)} (Floor ${d.floor})</td>
            <td>${escapeHtml(d.phone_no)}</td>
            <td>${d.experience} Years</td>
            <td><strong>₹${salary}</strong></td>
        `;
        tbody.appendChild(tr);
    });
}

async function fetchPatients() {
    const res = await fetch(`${API_BASE}/api/patients`);
    const data = await res.json();
    state.patients = Array.isArray(data) ? data : [data];
}

async function fetchRooms() {
    const res = await fetch(`${API_BASE}/api/rooms`);
    const data = await res.json();
    state.rooms = Array.isArray(data) ? data : [data];

    const grid = document.getElementById('room-cards-grid');
    grid.innerHTML = '';

    state.rooms.forEach(r => {
        let badgeClass = 'badge-neutral';
        if (r.availability === 'Available') badgeClass = 'badge-success';
        else if (r.availability === 'Occupied') badgeClass = 'badge-danger';
        else if (r.availability === 'Maintenance') badgeClass = 'badge-warning';

        const charges = parseFloat(r.charges).toLocaleString('en-IN', { minimumFractionDigits: 2 });
        const card = document.createElement('div');
        card.className = 'room-card';
        card.innerHTML = `
            <div class="room-header">
                <span class="room-num">Room ${r.room_no}</span>
                <span class="badge ${badgeClass}">${r.availability}</span>
            </div>
            <div class="room-detail-row">
                <span>Ward Type:</span>
                <strong>${r.room_type}</strong>
            </div>
            <div class="room-detail-row">
                <span>Daily Charges:</span>
                <strong>₹${charges} / day</strong>
            </div>
            <div class="room-occupant">
                ${r.patient_name ? `<span>Occupant: <strong>${escapeHtml(r.patient_name)}</strong> (ID #${r.patient_id})</span>` : `<span style="color:var(--text-muted)">No patient currently admitted</span>`}
            </div>
        `;
        grid.appendChild(card);
    });
}

async function fetchAppointments() {
    const res = await fetch(`${API_BASE}/api/appointments`);
    const data = await res.json();
    state.appointments = Array.isArray(data) ? data : [data];

    const tbody = document.querySelector('#table-appointments tbody');
    tbody.innerHTML = '';

    state.appointments.forEach(a => {
        let badgeClass = 'badge-info';
        if (a.status === 'Completed') badgeClass = 'badge-success';
        else if (a.status === 'Cancelled') badgeClass = 'badge-danger';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><code>#${a.appointment_id}</code></td>
            <td><strong>${a.date}</strong></td>
            <td>${a.time}</td>
            <td><strong>${escapeHtml(a.patient_name)}</strong></td>
            <td>${escapeHtml(a.patient_phone || '-')}</td>
            <td>${escapeHtml(a.doctor_name)}</td>
            <td><span class="badge badge-neutral">${escapeHtml(a.department_name)}</span></td>
            <td><span class="badge ${badgeClass}">${a.status}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

async function fetchBills() {
    const res = await fetch(`${API_BASE}/api/bills`);
    const data = await res.json();
    state.bills = Array.isArray(data) ? data : [data];

    const tbody = document.querySelector('#table-billing tbody');
    tbody.innerHTML = '';

    state.bills.forEach(b => {
        let badgeClass = 'badge-neutral';
        if (b.payment_status === 'Paid') badgeClass = 'badge-success';
        else if (b.payment_status === 'Partially Paid') badgeClass = 'badge-warning';
        else if (b.payment_status === 'Pending') badgeClass = 'badge-danger';

        const amount = parseFloat(b.total_bill_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
        const roomRate = parseFloat(b.daily_room_charges || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

        const isPending = b.payment_status !== 'Paid' && b.bill_id;
        const actionBtn = isPending ? 
            `<button class="btn btn-sm btn-primary" onclick="payBill(${b.bill_id}, '${escapeHtml(b.patient_name)}')">Pay Now</button>` : 
            `<span style="color:var(--accent-emerald); font-size:0.8rem; font-weight:600;">✓ Settled</span>`;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><code>#${b.patient_id}</code></td>
            <td><strong>${escapeHtml(b.patient_name)}</strong></td>
            <td>${escapeHtml(b.phone_no)}</td>
            <td>${b.room_no ? `Room ${b.room_no}` : '<span style="color:var(--text-muted)">Outpatient</span>'}</td>
            <td>${b.room_type || '-'}</td>
            <td>₹${roomRate}</td>
            <td><strong>₹${amount}</strong></td>
            <td>${b.payment_mode || 'Pending'}</td>
            <td><span class="badge ${badgeClass}">${b.payment_status}</span></td>
            <td>${actionBtn}</td>
        `;
        tbody.appendChild(tr);
    });
}

async function fetchAuditLog() {
    const res = await fetch(`${API_BASE}/api/audit-log`);
    const data = await res.json();
    state.auditLogs = Array.isArray(data) ? data : [data];

    const tbody = document.querySelector('#table-audit tbody');
    tbody.innerHTML = '';

    if (state.auditLogs.length === 0 || !state.auditLogs[0].log_id) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="color:var(--text-muted)">No audit log records yet. Update a bill status to fire the trigger!</td></tr>`;
        return;
    }

    state.auditLogs.forEach(l => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><code>#${l.log_id}</code></td>
            <td><span class="badge badge-info">${escapeHtml(l.table_name)}</span></td>
            <td><span class="badge badge-warning">${escapeHtml(l.action_type)}</span></td>
            <td><code>#${l.record_id}</code></td>
            <td>${escapeHtml(l.details)}</td>
            <td><span style="font-family:'JetBrains Mono'; font-size:0.75rem">${l.performed_at}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

// Modals Setup
function setupModals() {
    // Schedule Modal
    const modalSchedule = document.getElementById('modal-schedule');
    const btnOpenSched1 = document.getElementById('btn-open-booking-modal');
    const btnOpenSched2 = document.getElementById('btn-modal-schedule');
    const btnCloseSched = document.getElementById('btn-close-schedule');
    const btnCancelSched = document.getElementById('btn-cancel-schedule');

    const openScheduleModal = () => {
        populateScheduleDropdowns();
        modalSchedule.classList.add('open');
    };
    const closeScheduleModal = () => modalSchedule.classList.remove('open');

    if (btnOpenSched1) btnOpenSched1.addEventListener('click', openScheduleModal);
    if (btnOpenSched2) btnOpenSched2.addEventListener('click', openScheduleModal);
    if (btnCloseSched) btnCloseSched.addEventListener('click', closeScheduleModal);
    if (btnCancelSched) btnCancelSched.addEventListener('click', closeScheduleModal);

    document.getElementById('form-schedule').addEventListener('submit', async (e) => {
        e.preventDefault();
        const patId = document.getElementById('sched-patient').value;
        const docId = document.getElementById('sched-doctor').value;
        const date = document.getElementById('sched-date').value;
        const time = document.getElementById('sched-time').value;

        try {
            const res = await fetch(`${API_BASE}/api/schedule`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ patient_id: patId, doctor_id: docId, date, time })
            });
            const data = await res.json();
            const resultMsg = data.result || (Array.isArray(data) ? data[0]?.result : JSON.stringify(data));

            if (resultMsg && resultMsg.includes('SUCCESS')) {
                showToast(resultMsg, 'success');
                closeScheduleModal();
                fetchAppointments();
                fetchStats();
            } else {
                showToast(resultMsg || 'Booking collision conflict', 'error');
            }
        } catch (err) {
            showToast('Failed to schedule appointment', 'error');
        }
    });

    // Assign Room Modal
    const modalAssign = document.getElementById('modal-assign');
    const btnOpenAssign1 = document.getElementById('btn-open-assign-modal');
    const btnOpenAssign2 = document.getElementById('btn-modal-assign-room');
    const btnCloseAssign = document.getElementById('btn-close-assign');
    const btnCancelAssign = document.getElementById('btn-cancel-assign');

    const openAssignModal = () => {
        populateAssignDropdowns();
        modalAssign.classList.add('open');
    };
    const closeAssignModal = () => modalAssign.classList.remove('open');

    if (btnOpenAssign1) btnOpenAssign1.addEventListener('click', openAssignModal);
    if (btnOpenAssign2) btnOpenAssign2.addEventListener('click', openAssignModal);
    if (btnCloseAssign) btnCloseAssign.addEventListener('click', closeAssignModal);
    if (btnCancelAssign) btnCancelAssign.addEventListener('click', closeAssignModal);

    document.getElementById('form-assign').addEventListener('submit', async (e) => {
        e.preventDefault();
        const patId = document.getElementById('assign-patient').value;
        const roomNo = document.getElementById('assign-room').value;

        try {
            const res = await fetch(`${API_BASE}/api/assign-room`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ patient_id: patId, room_no: roomNo })
            });
            const data = await res.json();
            const resultMsg = data.result || (Array.isArray(data) ? data[0]?.result : JSON.stringify(data));

            if (resultMsg && resultMsg.includes('SUCCESS')) {
                showToast(resultMsg, 'success');
                closeAssignModal();
                fetchRooms();
                fetchPatients();
                fetchBills();
                fetchStats();
            } else {
                showToast(resultMsg || 'Failed to assign room', 'error');
            }
        } catch (err) {
            showToast('Room assignment failed', 'error');
        }
    });
}

function populateScheduleDropdowns() {
    const patSelect = document.getElementById('sched-patient');
    patSelect.innerHTML = '<option value="">Select a patient...</option>';
    state.patients.forEach(p => {
        patSelect.innerHTML += `<option value="${p.patient_id}">${p.name} (ID: ${p.patient_id})</option>`;
    });

    const docSelect = document.getElementById('sched-doctor');
    docSelect.innerHTML = '<option value="">Select a doctor...</option>';
    state.doctors.forEach(d => {
        docSelect.innerHTML += `<option value="${d.doctor_id}">${d.name} (${d.specialization} - ${d.department_name})</option>`;
    });
}

function populateAssignDropdowns() {
    const patSelect = document.getElementById('assign-patient');
    patSelect.innerHTML = '<option value="">Select a patient...</option>';
    state.patients.forEach(p => {
        const hasRoom = p.room_no ? `[Currently in Room ${p.room_no}]` : '[Outpatient - Needs Bed]';
        patSelect.innerHTML += `<option value="${p.patient_id}">${p.name} (ID: ${p.patient_id}) ${hasRoom}</option>`;
    });

    const roomSelect = document.getElementById('assign-room');
    roomSelect.innerHTML = '<option value="">Select an available room...</option>';
    state.rooms.forEach(r => {
        const isAvail = r.availability === 'Available';
        roomSelect.innerHTML += `<option value="${r.room_no}" ${!isAvail ? 'disabled' : ''}>Room ${r.room_no} (${r.room_type} - ₹${r.charges}) - ${r.availability}</option>`;
    });
}

// Payment Settlement Action
window.payBill = async function(billId, patientName) {
    if (!confirm(`Settle bill payment for ${patientName}? This will execute the trigger trg_after_bill_payment_update.`)) {
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/api/pay-bill`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bill_id: billId, payment_mode: 'UPI' })
        });
        const data = await res.json();
        showToast(`Bill #${billId} marked as Paid! Automated trigger logged entry in audit_log.`, 'success');
        fetchBills();
        fetchAuditLog();
        fetchStats();
    } catch (err) {
        showToast('Payment update failed', 'error');
    }
};

// Quick Actions
function setupQuickActions() {
    const btnTriggerTest = document.getElementById('btn-quick-trigger-test');
    if (btnTriggerTest) {
        btnTriggerTest.addEventListener('click', async () => {
            const pendingBill = state.bills.find(b => b.payment_status === 'Pending' && b.bill_id);
            if (pendingBill) {
                payBill(pendingBill.bill_id, pendingBill.patient_name);
            } else {
                showToast("All bills are already paid! Click 'Reset Demo DB' to reload pending bills.", 'info');
            }
        });
    }

    const btnResetDb = document.getElementById('btn-reset-db');
    if (btnResetDb) {
        btnResetDb.addEventListener('click', async () => {
            if (!confirm("Reset database to clean demonstration seed state?")) return;
            btnResetDb.disabled = true;
            btnResetDb.textContent = "Resetting...";
            try {
                const res = await fetch(`${API_BASE}/api/reset-db`, { method: 'POST' });
                const data = await res.json();
                showToast("Database successfully restored to clean demonstration state!", "success");
                loadAllData();
            } catch (err) {
                showToast("Database reset failed", "error");
            } finally {
                btnResetDb.disabled = false;
                btnResetDb.innerHTML = `<svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" stroke-width="2" fill="none"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg> Reset Demo DB`;
            }
        });
    }
}

// Viva SQL Console
function setupVivaConsole() {
    const input = document.getElementById('sql-query-input');
    const runBtn = document.getElementById('btn-run-sql');
    const resultBox = document.getElementById('query-result-box');
    const timerBox = document.getElementById('query-exec-time');
    const presetBtns = document.querySelectorAll('.preset-btn');

    presetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const sql = btn.getAttribute('data-sql');
            input.value = sql;
            executeCustomQuery(sql);
        });
    });

    if (runBtn) {
        runBtn.addEventListener('click', () => {
            const sql = input.value.trim();
            if (!sql) {
                showToast('Please enter a SQL query to execute', 'error');
                return;
            }
            executeCustomQuery(sql);
        });
    }

    async function executeCustomQuery(sql) {
        resultBox.innerHTML = '<div class="empty-state">Executing query on MySQL Server...</div>';
        timerBox.textContent = '';
        const startTime = performance.now();

        try {
            const res = await fetch(`${API_BASE}/api/execute-sql`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: sql })
            });
            const data = await res.json();
            const elapsed = Math.round(performance.now() - startTime);
            timerBox.textContent = `Executed in ${elapsed} ms`;

            if (data.error) {
                resultBox.innerHTML = `<div style="color:var(--accent-rose); font-family:'JetBrains Mono'; font-size:0.85rem; padding:12px; background:rgba(244,63,94,0.1); border-radius:6px;">${escapeHtml(data.error)}</div>`;
                return;
            }

            const rows = Array.isArray(data) ? data : [data];
            if (rows.length === 0 || !rows[0] || Object.keys(rows[0]).length === 0) {
                resultBox.innerHTML = `<div class="empty-state" style="color:var(--accent-emerald)">Query executed successfully. (0 rows returned or statement completed)</div>`;
                return;
            }

            const cols = Object.keys(rows[0]);
            let tableHtml = `<div class="table-responsive"><table class="data-table"><thead><tr>`;
            cols.forEach(c => tableHtml += `<th>${escapeHtml(c)}</th>`);
            tableHtml += `</tr></thead><tbody>`;

            rows.forEach(r => {
                tableHtml += `<tr>`;
                cols.forEach(c => tableHtml += `<td>${escapeHtml(r[c] !== null && r[c] !== undefined ? String(r[c]) : 'NULL')}</td>`);
                tableHtml += `</tr>`;
            });
            tableHtml += `</tbody></table></div>`;
            resultBox.innerHTML = tableHtml;

        } catch (err) {
            resultBox.innerHTML = `<div style="color:var(--accent-rose)">Execution failed: ${err.message}</div>`;
        }
    }
}

// Utility: HTML Escaping
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

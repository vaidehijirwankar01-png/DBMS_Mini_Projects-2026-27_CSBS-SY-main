// =====================================================================
// Hotel Management System - Frontend Application (public/js/app.js)
// Vanilla JavaScript, Single-Page App, REST API integration
// =====================================================================

// Global State
const state = {
  currentPage: 'dashboard',
  employees: [],
  customers: [],
  allReports: [],
  activeReportIndex: 0,
  activeBookingBill: null
};

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
  initClock();
  initNavigation();
  initStaffSession();
  initEventListeners();

  // Load initial data
  loadEmployees().then(() => {
    populateStaffDropdowns();
  });
  loadCustomers();
  navigate(window.location.hash.replace('#', '') || 'dashboard');
});

// Real-time Clock
function initClock() {
  const clockEl = document.getElementById('current-datetime');
  const update = () => {
    const now = new Date();
    clockEl.textContent = now.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  update();
  setInterval(update, 1000);
}

// Navigation Handler
function initNavigation() {
  window.addEventListener('hashchange', () => {
    const page = window.location.hash.replace('#', '') || 'dashboard';
    navigate(page);
  });
}

function navigate(page) {
  const validPages = ['dashboard', 'bookings', 'rooms', 'customers', 'payments', 'employees', 'reports', 'mongo-logs'];
  if (!validPages.includes(page)) page = 'dashboard';

  state.currentPage = page;

  // Update nav links
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.toggle('active', link.dataset.page === page);
  });

  // Update page sections
  document.querySelectorAll('.page-section').forEach(sec => {
    sec.classList.remove('active');
  });

  const activeSection = document.getElementById(`page-${page}`);
  if (activeSection) activeSection.classList.add('active');

  // Update Top Bar titles
  const titles = {
    dashboard: { title: 'Dashboard Overview', sub: 'Front Desk Operations & Performance Metrics' },
    bookings: { title: 'Reservation Management', sub: 'Managed via MySQL sp_create_booking & triggers' },
    rooms: { title: 'Room Directory', sub: 'Composite Primary Key (hotel_id, room_no)' },
    customers: { title: 'Customer Records', sub: 'Guest Directory with Unique Aadhaar & Email' },
    payments: { title: 'Billing & Transactions', sub: 'Validated via sp_add_payment stored procedure' },
    employees: { title: 'Staff & Multivalued Skills', sub: 'Hotel Employees & employee_skill table' },
    reports: { title: 'SQL Implementation & Viva Queries', sub: 'Live Execution of 10 Analytical SQL Queries' },
    'mongo-logs': { title: 'MongoDB Audit Logs & Reviews', sub: 'activity_logs & feedback collections' }
  };

  const t = titles[page] || titles.dashboard;
  document.getElementById('page-title').textContent = t.title;
  document.getElementById('page-subtitle').textContent = t.sub;

  // Trigger page-specific data load
  switch (page) {
    case 'dashboard': loadDashboard(); break;
    case 'bookings': loadBookings(); break;
    case 'rooms': loadRooms(); break;
    case 'customers': loadCustomersTable(); break;
    case 'payments': loadPayments(); break;
    case 'employees': loadEmployeesTable(); break;
    case 'reports': loadReports(); break;
    case 'mongo-logs': 
      loadActivityLogs();
      loadFeedbackList();
      populateFeedbackBookingSelect();
      break;
  }
}

// Staff Session ('Logged in as')
function initStaffSession() {
  const select = document.getElementById('current-user-select');
  const saved = localStorage.getItem('hms_performed_by');
  if (saved) select.value = saved;

  select.addEventListener('change', () => {
    localStorage.setItem('hms_performed_by', select.value);
    showToast(`Active staff set to: ${select.value}`, 'info');
  });
}

function getActiveStaff() {
  const select = document.getElementById('current-user-select');
  return select.value || 'Priya Nair (Receptionist)';
}

function populateStaffDropdowns() {
  const select = document.getElementById('current-user-select');
  const receptionistSelect = document.getElementById('nb-receptionist');

  if (state.employees.length > 0) {
    select.innerHTML = '';
    receptionistSelect.innerHTML = '';

    state.employees.forEach(emp => {
      const opt = document.createElement('option');
      opt.value = `${emp.emp_name} (${emp.role})`;
      opt.textContent = `${emp.emp_name} (${emp.role})`;
      select.appendChild(opt);

      // Only receptionists and managers for handling reservations
      if (emp.role === 'Receptionist' || emp.role === 'Manager') {
        const rOpt = document.createElement('option');
        rOpt.value = emp.emp_id;
        rOpt.textContent = `${emp.emp_name} (${emp.role})`;
        receptionistSelect.appendChild(rOpt);
      }
    });

    const saved = localStorage.getItem('hms_performed_by');
    if (saved && Array.from(select.options).some(o => o.value === saved)) {
      select.value = saved;
    }
  }
}

// Event Listeners
function initEventListeners() {
  document.getElementById('btn-quick-new-booking').addEventListener('click', openNewBookingModal);

  // Filters
  document.getElementById('filter-booking-status').addEventListener('change', () => loadBookings());
  document.getElementById('filter-room-type').addEventListener('change', () => loadRooms());
  document.getElementById('filter-room-status').addEventListener('change', () => loadRooms());

  // Customer search with debounce
  let searchTimeout;
  document.getElementById('customer-search-input').addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      loadCustomersTable(e.target.value.trim());
    }, 250);
  });

  // Forms
  document.getElementById('form-new-booking').addEventListener('submit', handleCreateBooking);
  document.getElementById('form-record-payment').addEventListener('submit', handleRecordPayment);
  document.getElementById('form-room').addEventListener('submit', handleSaveRoom);
  document.getElementById('form-customer').addEventListener('submit', handleSaveCustomer);
  document.getElementById('form-employee').addEventListener('submit', handleSaveEmployee);
  document.getElementById('form-submit-feedback').addEventListener('submit', handleSubmitFeedback);

  // Tabs for MongoDB section
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab).classList.add('active');
    });
  });
}

// API Helper
async function apiRequest(endpoint, method = 'GET', body = null) {
  try {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (body) {
      if (!body.performed_by) body.performed_by = getActiveStaff();
      options.body = JSON.stringify(body);
    }

    const res = await fetch(endpoint, options);
    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Request failed.');
    }
    return data;
  } catch (err) {
    showToast(err.message, 'error');
    throw err;
  }
}

// Toast Notifications
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-msg">${escapeHtml(message)}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
  `;
  container.appendChild(toast);
  setTimeout(() => {
    if (toast.parentElement) toast.remove();
  }, 4500);
}

// =====================================================================
// 1. DASHBOARD LOGIC
// =====================================================================
async function loadDashboard() {
  try {
    const res = await apiRequest('/api/dashboard/stats');
    const data = res.data;

    // KPI 1: Rooms
    document.getElementById('kpi-total-rooms').textContent = data.rooms.total_rooms || 0;
    document.getElementById('kpi-room-breakdown').textContent = 
      `Available: ${data.rooms.available_rooms || 0} | Occupied: ${data.rooms.occupied_rooms || 0} | Maint: ${data.rooms.maintenance_rooms || 0}`;

    // KPI 2: Today's activity
    const totalToday = (parseInt(data.today.todays_checkins || 0) + parseInt(data.today.todays_checkouts || 0));
    document.getElementById('kpi-today-activity').textContent = totalToday;
    document.getElementById('kpi-today-breakdown').textContent = 
      `Check-ins: ${data.today.todays_checkins || 0} | Check-outs: ${data.today.todays_checkouts || 0}`;

    // KPI 3: Revenue
    document.getElementById('kpi-month-revenue').textContent = `₹${parseFloat(data.revenue.revenue_this_month || 0).toLocaleString('en-IN')}`;
    document.getElementById('kpi-total-revenue').textContent = `All-Time Revenue: ₹${parseFloat(data.revenue.total_revenue || 0).toLocaleString('en-IN')}`;

    // KPI 4: Active Bookings
    let checkedInCount = 0;
    let bookedCount = 0;
    data.bookingsByStatus.forEach(s => {
      if (s.status === 'Checked-in') checkedInCount = s.count;
      if (s.status === 'Booked') bookedCount = s.count;
    });
    document.getElementById('kpi-active-bookings').textContent = checkedInCount + bookedCount;
    document.getElementById('kpi-bookings-breakdown').textContent = `Checked-in: ${checkedInCount} | Booked: ${bookedCount}`;

    // Occupancy Bar Chart (Pure CSS/DOM without external libraries)
    const chartContainer = document.getElementById('occupancy-chart');
    chartContainer.innerHTML = '';
    data.roomTypeDistribution.forEach(cat => {
      const total = cat.total_rooms || 1;
      const occ = cat.occupied_count || 0;
      const occPct = ((occ / total) * 100).toFixed(0);

      const bar = document.createElement('div');
      bar.className = 'chart-bar-item';
      bar.innerHTML = `
        <div class="chart-bar-header">
          <span class="chart-bar-label">${cat.room_type} Room</span>
          <span class="chart-bar-stats">${occ} / ${total} occupied (${occPct}%)</span>
        </div>
        <div class="chart-bar-track">
          <div class="chart-bar-fill-occupied" style="width: ${occPct}%;"></div>
          <div class="chart-bar-fill-available" style="width: ${100 - occPct}%;"></div>
        </div>
      `;
      chartContainer.appendChild(bar);
    });

    // Recent Bookings Table
    const tbody = document.querySelector('#table-recent-bookings tbody');
    tbody.innerHTML = '';
    if (data.recentBookings.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty-hint">No bookings yet.</td></tr>';
    } else {
      data.recentBookings.forEach(b => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>#${b.booking_id}</strong></td>
          <td>${escapeHtml(b.cust_name)}</td>
          <td>Room ${b.room_no}</td>
          <td>${b.room_type}</td>
          <td>${getStatusBadge(b.status)}</td>
        `;
        tbody.appendChild(tr);
      });
    }
  } catch (err) {
    console.error('Failed to load dashboard:', err);
  }
}

// =====================================================================
// 2. BOOKINGS LOGIC
// =====================================================================
async function loadBookings() {
  try {
    const status = document.getElementById('filter-booking-status').value;
    const url = status ? `/api/bookings?status=${encodeURIComponent(status)}` : '/api/bookings';
    const res = await apiRequest(url);

    const tbody = document.querySelector('#table-bookings tbody');
    tbody.innerHTML = '';

    if (res.data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="10" class="empty-hint">No bookings match the selected filter.</td></tr>';
      return;
    }

    res.data.forEach(b => {
      const tr = document.createElement('tr');
      const due = parseFloat(b.balance_due || 0);
      const isDue = due > 0;

      // Determine allowed actions
      let actionBtns = '';
      if (b.status === 'Booked') {
        actionBtns += `<button class="btn btn-success btn-sm" onclick="performCheckIn(${b.booking_id})">Check-in</button> `;
        actionBtns += `<button class="btn btn-danger btn-sm" onclick="performCancel(${b.booking_id})">Cancel</button> `;
      } else if (b.status === 'Checked-in') {
        actionBtns += `<button class="btn btn-primary btn-sm" onclick="performCheckOut(${b.booking_id}, ${due})">Check-out</button> `;
      }
      actionBtns += `<button class="btn btn-secondary btn-sm" onclick="viewBill(${b.booking_id})">Bill</button>`;

      tr.innerHTML = `
        <td><strong>#${b.booking_id}</strong></td>
        <td>
          <div style="font-weight:600;">${escapeHtml(b.cust_name)}</div>
          <small class="text-muted">${b.customer_phone}</small>
        </td>
        <td>Room ${b.room_no} <small class="text-muted">(${b.room_type})</small></td>
        <td>
          <div>${formatDate(b.check_in)}</div>
          <small class="text-muted">to ${formatDate(b.check_out)}</small>
        </td>
        <td>${b.nights}</td>
        <td>₹${parseFloat(b.room_charges).toLocaleString('en-IN')}</td>
        <td>₹${parseFloat(b.total_paid).toLocaleString('en-IN')}</td>
        <td class="${isDue ? 'text-danger' : 'text-success'}" style="font-weight:600;">₹${due.toLocaleString('en-IN')}</td>
        <td>${getStatusBadge(b.status)}</td>
        <td class="text-right"><div class="action-buttons">${actionBtns}</div></td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error('Failed to load bookings:', err);
  }
}

// Check-in action (calls sp_check_in)
async function performCheckIn(bookingId) {
  if (!confirm(`Confirm check-in for Booking #${bookingId}? Room will be marked as Occupied.`)) return;
  try {
    const res = await apiRequest(`/api/bookings/${bookingId}/check-in`, 'POST', {});
    showToast(res.message, 'success');
    loadBookings();
    loadDashboard();
  } catch (err) {}
}

// Check-out action (calls sp_check_out)
async function performCheckOut(bookingId, balanceDue) {
  if (balanceDue > 0) {
    showToast(`Cannot check out: Outstanding balance of ₹${balanceDue} must be cleared first.`, 'error');
    viewBill(bookingId);
    return;
  }
  if (!confirm(`Confirm check-out for Booking #${bookingId}? Room will be marked as Available.`)) return;
  try {
    const res = await apiRequest(`/api/bookings/${bookingId}/check-out`, 'POST', {});
    showToast(res.message, 'success');
    loadBookings();
    loadDashboard();
  } catch (err) {}
}

// Cancel action (calls sp_cancel_booking)
async function performCancel(bookingId) {
  if (!confirm(`Are you sure you want to cancel Booking #${bookingId}? Any payments will be marked as Refunded.`)) return;
  try {
    const res = await apiRequest(`/api/bookings/${bookingId}/cancel`, 'POST', {});
    showToast(res.message, 'success');
    loadBookings();
    loadDashboard();
  } catch (err) {}
}

// View Bill & Invoices
async function viewBill(bookingId) {
  try {
    const res = await apiRequest(`/api/bookings/${bookingId}/bill`);
    const { bill, payments } = res.data;
    state.activeBookingBill = bill;

    const content = document.getElementById('bill-details-content');
    const due = parseFloat(bill.balance_due || 0);

    let paymentRows = '';
    if (payments.length > 0) {
      paymentRows = payments.map(p => `
        <div class="bill-row">
          <span>${formatDate(p.payment_date)} - ${p.payment_mode} (${p.transaction_ref})</span>
          <span><strong>₹${parseFloat(p.amount).toLocaleString('en-IN')}</strong></span>
        </div>
      `).join('');
    } else {
      paymentRows = '<div class="bill-row text-muted"><span>No payments received yet.</span><span>₹0.00</span></div>';
    }

    content.innerHTML = `
      <div class="bill-box">
        <div class="bill-header-row">
          <div>
            <div style="font-weight:700; font-size:15px;">Invoice for Booking #${bill.booking_id}</div>
            <div class="text-muted" style="font-size:12px;">Guest: ${escapeHtml(bill.cust_name)}</div>
          </div>
          <div class="text-right">
            <div>${getStatusBadge(bill.booking_status)}</div>
            <div class="text-muted" style="font-size:11px; margin-top:3px;">Room ${bill.room_no} (${bill.room_type})</div>
          </div>
        </div>

        <div class="bill-row">
          <span>Stay Duration</span>
          <span>${formatDate(bill.check_in)} to ${formatDate(bill.check_out)} (${bill.nights} nights)</span>
        </div>
        <div class="bill-row">
          <span>Room Rate / Night</span>
          <span>₹${parseFloat(bill.price_per_night).toLocaleString('en-IN')}</span>
        </div>
        <div class="bill-row bill-total">
          <span>Total Room Charges</span>
          <span>₹${parseFloat(bill.room_charges).toLocaleString('en-IN')}</span>
        </div>

        <div style="padding: 10px 16px 4px; font-weight:600; font-size:12px; background:#f8fafc; border-bottom:1px solid #e2e8f0;">
          PAYMENTS RECORDED
        </div>
        ${paymentRows}

        <div class="bill-row bill-total">
          <span>Total Paid to Date</span>
          <span class="text-success">₹${parseFloat(bill.total_paid).toLocaleString('en-IN')}</span>
        </div>
        <div class="bill-row bill-due">
          <span>Outstanding Balance Due</span>
          <span>₹${due.toLocaleString('en-IN')}</span>
        </div>
      </div>
    `;

    const payBtn = document.getElementById('btn-bill-pay');
    payBtn.style.display = (due > 0 && bill.booking_status !== 'Cancelled') ? 'inline-block' : 'none';

    openModal('modal-bill');
  } catch (err) {}
}

function proceedToPaymentFromBill() {
  if (!state.activeBookingBill) return;
  closeModal('modal-bill');
  openAddPaymentModal(state.activeBookingBill.booking_id);
}

// New Booking Wizard
function openNewBookingModal() {
  // Set default dates: check-in today, check-out tomorrow
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  document.getElementById('nb-checkin').value = today.toISOString().split('T')[0];
  document.getElementById('nb-checkout').value = tomorrow.toISOString().split('T')[0];
  document.getElementById('nb-guests').value = '1';
  document.getElementById('nb-type').value = '';
  document.getElementById('nb-selected-room').value = '';
  document.getElementById('available-rooms-container').innerHTML = 
    '<div class="empty-hint">Set dates and click "Search Available Rooms" above.</div>';

  populateCustomerSelect();
  openModal('modal-new-booking');
}

async function findAvailableRooms() {
  const checkin = document.getElementById('nb-checkin').value;
  const checkout = document.getElementById('nb-checkout').value;
  const guests = document.getElementById('nb-guests').value;
  const type = document.getElementById('nb-type').value;

  if (!checkin || !checkout) {
    showToast('Please specify check-in and check-out dates.', 'error');
    return;
  }
  if (checkout <= checkin) {
    showToast('Check-out date must be strictly after check-in date.', 'error');
    return;
  }

  const container = document.getElementById('available-rooms-container');
  container.innerHTML = '<div class="empty-hint">Searching available rooms...</div>';

  try {
    let url = `/api/rooms/available?check_in=${checkin}&check_out=${checkout}&people=${guests}`;
    if (type) url += `&room_type=${encodeURIComponent(type)}`;

    const res = await apiRequest(url);
    const rooms = res.data;

    container.innerHTML = '';
    document.getElementById('nb-selected-room').value = '';

    if (rooms.length === 0) {
      container.innerHTML = '<div class="empty-hint text-danger">No available rooms match these dates and capacity.</div>';
      return;
    }

    rooms.forEach(r => {
      const card = document.createElement('div');
      card.className = 'room-card-select';
      card.dataset.roomNo = r.room_no;
      card.innerHTML = `
        <div class="rc-room-no">Room ${r.room_no}</div>
        <div class="rc-type">${r.room_type}</div>
        <div class="rc-price">₹${parseFloat(r.price_per_night).toLocaleString('en-IN')}/n</div>
        <div style="font-size:10px; color:#64748b;">Cap: ${r.capacity} pax</div>
      `;

      card.addEventListener('click', () => {
        document.querySelectorAll('.room-card-select').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        document.getElementById('nb-selected-room').value = r.room_no;
      });

      container.appendChild(card);
    });
  } catch (err) {}
}

async function handleCreateBooking(e) {
  e.preventDefault();
  const roomNo = document.getElementById('nb-selected-room').value;
  if (!roomNo) {
    showToast('Please select an available room from the list.', 'error');
    return;
  }

  const custId = document.getElementById('nb-customer').value;
  if (!custId) {
    showToast('Please select a registered guest.', 'error');
    return;
  }

  const empId = document.getElementById('nb-receptionist').value;
  const checkIn = document.getElementById('nb-checkin').value;
  const checkOut = document.getElementById('nb-checkout').value;
  const noOfPeople = parseInt(document.getElementById('nb-guests').value, 10);

  try {
    const res = await apiRequest('/api/bookings', 'POST', {
      cust_id: parseInt(custId, 10),
      hotel_id: 1,
      room_no: roomNo,
      emp_id: parseInt(empId, 10),
      check_in: checkIn,
      check_out: checkOut,
      no_of_people: noOfPeople
    });

    showToast(`Reservation #${res.data.booking_id} confirmed successfully!`, 'success');
    closeModal('modal-new-booking');
    loadBookings();
    loadDashboard();
  } catch (err) {}
}

function toggleQuickCustomerForm() {
  const box = document.getElementById('quick-customer-section');
  box.classList.toggle('d-none');
}

async function saveQuickCustomer() {
  const name = document.getElementById('qc-name').value.trim();
  const phone = document.getElementById('qc-phone').value.trim();
  const email = document.getElementById('qc-email').value.trim();
  const aadhar = document.getElementById('qc-aadhar').value.trim();
  const address = document.getElementById('qc-address').value.trim();

  if (!name || !phone || !email || !aadhar || !address) {
    showToast('Please fill all customer fields.', 'error');
    return;
  }

  if (!/^\d{12}$/.test(aadhar)) {
    showToast('Aadhaar must be exactly 12 digits.', 'error');
    return;
  }

  try {
    const res = await apiRequest('/api/customers', 'POST', {
      cust_name: name,
      phone_no: phone,
      email,
      aadhar_no: aadhar,
      address
    });

    showToast('Guest registered successfully!', 'success');
    await loadCustomers();
    populateCustomerSelect();
    document.getElementById('nb-customer').value = res.data.cust_id;
    toggleQuickCustomerForm();
  } catch (err) {}
}

function populateCustomerSelect() {
  const select = document.getElementById('nb-customer');
  select.innerHTML = '<option value="">-- Choose Registered Guest --</option>';
  state.customers.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.cust_id;
    opt.textContent = `${c.cust_name} (${c.phone_no}) - Aadhaar: ${c.aadhar_no}`;
    select.appendChild(opt);
  });
}

// =====================================================================
// 3. ROOMS LOGIC
// =====================================================================
async function loadRooms() {
  try {
    const type = document.getElementById('filter-room-type').value;
    const status = document.getElementById('filter-room-status').value;

    let url = '/api/rooms?';
    if (type) url += `room_type=${encodeURIComponent(type)}&`;
    if (status) url += `status=${encodeURIComponent(status)}&`;

    const res = await apiRequest(url);
    const tbody = document.querySelector('#table-rooms tbody');
    tbody.innerHTML = '';

    if (res.data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty-hint">No rooms found.</td></tr>';
      return;
    }

    res.data.forEach(r => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>Room ${r.room_no}</strong></td>
        <td>${r.room_type}</td>
        <td>${r.capacity} guests</td>
        <td>₹${parseFloat(r.price_per_night).toLocaleString('en-IN')}</td>
        <td>${getStatusBadge(r.availability)}</td>
        <td class="text-right">
          <div class="action-buttons">
            <button class="btn btn-secondary btn-sm" onclick='openEditRoomModal(${JSON.stringify(r)})'>Edit</button>
            <button class="btn btn-danger btn-sm" onclick="deleteRoom(1, '${r.room_no}')">Delete</button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error('Failed to load rooms:', err);
  }
}

function openAddRoomModal() {
  document.getElementById('room-modal-title').textContent = 'Add Room';
  document.getElementById('room-is-edit').value = '0';
  document.getElementById('room-no').value = '';
  document.getElementById('room-no').disabled = false;
  document.getElementById('room-type-input').value = 'Single';
  document.getElementById('room-price').value = '1500';
  document.getElementById('room-capacity').value = '1';
  document.getElementById('room-availability').value = 'Available';
  openModal('modal-room');
}

function openEditRoomModal(room) {
  document.getElementById('room-modal-title').textContent = `Edit Room ${room.room_no}`;
  document.getElementById('room-is-edit').value = '1';
  document.getElementById('room-no').value = room.room_no;
  document.getElementById('room-no').disabled = true;
  document.getElementById('room-type-input').value = room.room_type;
  document.getElementById('room-price').value = room.price_per_night;
  document.getElementById('room-capacity').value = room.capacity;
  document.getElementById('room-availability').value = room.availability;
  openModal('modal-room');
}

async function handleSaveRoom(e) {
  e.preventDefault();
  const isEdit = document.getElementById('room-is-edit').value === '1';
  const roomNo = document.getElementById('room-no').value.trim();
  const roomType = document.getElementById('room-type-input').value;
  const price = parseFloat(document.getElementById('room-price').value);
  const capacity = parseInt(document.getElementById('room-capacity').value, 10);
  const availability = document.getElementById('room-availability').value;

  try {
    if (isEdit) {
      await apiRequest(`/api/rooms/1/${roomNo}`, 'PUT', {
        room_type: roomType,
        price_per_night: price,
        capacity,
        availability
      });
      showToast(`Room ${roomNo} updated successfully!`, 'success');
    } else {
      await apiRequest('/api/rooms', 'POST', {
        hotel_id: 1,
        room_no: roomNo,
        room_type: roomType,
        price_per_night: price,
        capacity,
        availability
      });
      showToast(`Room ${roomNo} added successfully!`, 'success');
    }
    closeModal('modal-room');
    loadRooms();
    loadDashboard();
  } catch (err) {}
}

async function deleteRoom(hotelId, roomNo) {
  if (!confirm(`Are you sure you want to delete Room ${roomNo}? This will fail if bookings exist.`)) return;
  try {
    await apiRequest(`/api/rooms/${hotelId}/${roomNo}`, 'DELETE');
    showToast(`Room ${roomNo} deleted.`, 'success');
    loadRooms();
    loadDashboard();
  } catch (err) {}
}

// =====================================================================
// 4. CUSTOMERS LOGIC
// =====================================================================
async function loadCustomers() {
  try {
    const res = await apiRequest('/api/customers');
    state.customers = res.data;
  } catch (err) {}
}

async function loadCustomersTable(searchTerm = '') {
  try {
    const url = searchTerm ? `/api/customers?search=${encodeURIComponent(searchTerm)}` : '/api/customers';
    const res = await apiRequest(url);

    const tbody = document.querySelector('#table-customers tbody');
    tbody.innerHTML = '';

    if (res.data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty-hint">No customers found.</td></tr>';
      return;
    }

    res.data.forEach(c => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>#${c.cust_id}</strong></td>
        <td><strong>${escapeHtml(c.cust_name)}</strong></td>
        <td>${escapeHtml(c.phone_no)}</td>
        <td>${escapeHtml(c.email)}</td>
        <td><code>${escapeHtml(c.aadhar_no)}</code></td>
        <td>${escapeHtml(c.address)}</td>
        <td class="text-right">
          <button class="btn btn-secondary btn-sm" onclick='openEditCustomerModal(${JSON.stringify(c)})'>Edit</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error('Failed to load customers table:', err);
  }
}

function openAddCustomerModal() {
  document.getElementById('cust-modal-title').textContent = 'Register Customer';
  document.getElementById('cust-id-input').value = '';
  document.getElementById('cust-name-input').value = '';
  document.getElementById('cust-phone-input').value = '';
  document.getElementById('cust-email-input').value = '';
  document.getElementById('cust-aadhar-input').value = '';
  document.getElementById('cust-address-input').value = '';
  openModal('modal-customer');
}

function openEditCustomerModal(c) {
  document.getElementById('cust-modal-title').textContent = `Edit Customer #${c.cust_id}`;
  document.getElementById('cust-id-input').value = c.cust_id;
  document.getElementById('cust-name-input').value = c.cust_name;
  document.getElementById('cust-phone-input').value = c.phone_no;
  document.getElementById('cust-email-input').value = c.email;
  document.getElementById('cust-aadhar-input').value = c.aadhar_no;
  document.getElementById('cust-address-input').value = c.address;
  openModal('modal-customer');
}

async function handleSaveCustomer(e) {
  e.preventDefault();
  const id = document.getElementById('cust-id-input').value;
  const name = document.getElementById('cust-name-input').value.trim();
  const phone = document.getElementById('cust-phone-input').value.trim();
  const email = document.getElementById('cust-email-input').value.trim();
  const aadhar = document.getElementById('cust-aadhar-input').value.trim();
  const address = document.getElementById('cust-address-input').value.trim();

  if (!/^\d{12}$/.test(aadhar)) {
    showToast('Aadhaar must be exactly 12 digits.', 'error');
    return;
  }

  try {
    if (id) {
      await apiRequest(`/api/customers/${id}`, 'PUT', {
        cust_name: name,
        phone_no: phone,
        email,
        aadhar_no: aadhar,
        address
      });
      showToast(`Customer #${id} updated successfully!`, 'success');
    } else {
      await apiRequest('/api/customers', 'POST', {
        cust_name: name,
        phone_no: phone,
        email,
        aadhar_no: aadhar,
        address
      });
      showToast('Customer registered successfully!', 'success');
    }
    closeModal('modal-customer');
    await loadCustomers();
    loadCustomersTable();
  } catch (err) {}
}

// =====================================================================
// 5. PAYMENTS LOGIC
// =====================================================================
async function loadPayments() {
  try {
    const res = await apiRequest('/api/payments');
    const tbody = document.querySelector('#table-payments tbody');
    tbody.innerHTML = '';

    if (res.data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" class="empty-hint">No payment transactions found.</td></tr>';
      return;
    }

    res.data.forEach(p => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>#${p.payment_id}</strong></td>
        <td>Booking #${p.booking_id}</td>
        <td>${escapeHtml(p.cust_name)}</td>
        <td>Room ${p.room_no} (${p.room_type})</td>
        <td style="font-weight:700;">₹${parseFloat(p.amount).toLocaleString('en-IN')}</td>
        <td><span class="badge badge-gray">${p.payment_mode}</span></td>
        <td>${formatDate(p.payment_date)}</td>
        <td><code>${escapeHtml(p.transaction_ref)}</code></td>
        <td>${getStatusBadge(p.payment_status)}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error('Failed to load payments:', err);
  }
}

async function openAddPaymentModal(preselectedBookingId = null) {
  try {
    // Populate bookings select with active reservations
    const res = await apiRequest('/api/bookings');
    const select = document.getElementById('pay-booking-select');
    select.innerHTML = '<option value="">-- Choose Active Booking --</option>';

    res.data.forEach(b => {
      if (b.status !== 'Cancelled') {
        const opt = document.createElement('option');
        opt.value = b.booking_id;
        opt.textContent = `Booking #${b.booking_id} - ${b.cust_name} (Room ${b.room_no}) [Due: ₹${b.balance_due}]`;
        select.appendChild(opt);
      }
    });

    document.getElementById('pay-amount').value = '';
    document.getElementById('pay-mode').value = 'UPI';
    document.getElementById('pay-txn-ref').value = '';
    document.getElementById('pay-bill-strip').style.display = 'none';

    if (preselectedBookingId) {
      select.value = preselectedBookingId;
      onPaymentBookingChange();
    }

    openModal('modal-payment');
  } catch (err) {}
}

async function onPaymentBookingChange() {
  const bookingId = document.getElementById('pay-booking-select').value;
  const strip = document.getElementById('pay-bill-strip');

  if (!bookingId) {
    strip.style.display = 'none';
    return;
  }

  try {
    const res = await apiRequest(`/api/bookings/${bookingId}/bill`);
    const bill = res.data.bill;
    const due = parseFloat(bill.balance_due || 0);

    document.getElementById('pay-info-charges').textContent = `₹${parseFloat(bill.room_charges).toLocaleString('en-IN')}`;
    document.getElementById('pay-info-paid').textContent = `₹${parseFloat(bill.total_paid).toLocaleString('en-IN')}`;
    document.getElementById('pay-info-due').textContent = `₹${due.toLocaleString('en-IN')}`;
    strip.style.display = 'flex';

    if (due > 0) {
      document.getElementById('pay-amount').value = due;
    }
  } catch (err) {}
}

async function handleRecordPayment(e) {
  e.preventDefault();
  const bookingId = document.getElementById('pay-booking-select').value;
  const amount = parseFloat(document.getElementById('pay-amount').value);
  const mode = document.getElementById('pay-mode').value;
  const txnRef = document.getElementById('pay-txn-ref').value.trim();

  if (!bookingId || isNaN(amount) || amount <= 0) {
    showToast('Please select a booking and enter a valid payment amount.', 'error');
    return;
  }

  try {
    const res = await apiRequest('/api/payments', 'POST', {
      booking_id: parseInt(bookingId, 10),
      amount,
      payment_mode: mode,
      transaction_ref: txnRef || undefined
    });

    showToast(res.message, 'success');
    closeModal('modal-payment');
    loadPayments();
    loadBookings();
    loadDashboard();
  } catch (err) {}
}

// =====================================================================
// 6. EMPLOYEES LOGIC
// =====================================================================
async function loadEmployees() {
  try {
    const res = await apiRequest('/api/employees');
    state.employees = res.data;
  } catch (err) {}
}

async function loadEmployeesTable() {
  await loadEmployees();
  const tbody = document.querySelector('#table-employees tbody');
  tbody.innerHTML = '';

  if (state.employees.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-hint">No employees found.</td></tr>';
    return;
  }

  state.employees.forEach(emp => {
    const tr = document.createElement('tr');
    const skillsHtml = emp.skills.map(s => `<span class="skill-tag">${escapeHtml(s)}</span>`).join('');

    tr.innerHTML = `
      <td><strong>#${emp.emp_id}</strong></td>
      <td><strong>${escapeHtml(emp.emp_name)}</strong></td>
      <td><span class="badge badge-blue">${emp.role}</span></td>
      <td>${escapeHtml(emp.phone_no)}</td>
      <td>${escapeHtml(emp.address)}</td>
      <td>${skillsHtml || '<span class="text-muted">None</span>'}</td>
      <td class="text-right">
        <button class="btn btn-secondary btn-sm" onclick='openEditEmployeeModal(${JSON.stringify(emp)})'>Edit</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function openAddEmployeeModal() {
  document.getElementById('emp-modal-title').textContent = 'Add Staff Member';
  document.getElementById('emp-id-input').value = '';
  document.getElementById('emp-name-input').value = '';
  document.getElementById('emp-phone-input').value = '';
  document.getElementById('emp-role-input').value = 'Receptionist';
  document.getElementById('emp-address-input').value = '';
  document.getElementById('emp-skills-input').value = '';
  openModal('modal-employee');
}

function openEditEmployeeModal(emp) {
  document.getElementById('emp-modal-title').textContent = `Edit Staff #${emp.emp_id}`;
  document.getElementById('emp-id-input').value = emp.emp_id;
  document.getElementById('emp-name-input').value = emp.emp_name;
  document.getElementById('emp-phone-input').value = emp.phone_no;
  document.getElementById('emp-role-input').value = emp.role;
  document.getElementById('emp-address-input').value = emp.address;
  document.getElementById('emp-skills-input').value = emp.skills.join(', ');
  openModal('modal-employee');
}

async function handleSaveEmployee(e) {
  e.preventDefault();
  const id = document.getElementById('emp-id-input').value;
  const name = document.getElementById('emp-name-input').value.trim();
  const phone = document.getElementById('emp-phone-input').value.trim();
  const role = document.getElementById('emp-role-input').value;
  const address = document.getElementById('emp-address-input').value.trim();
  const skillsRaw = document.getElementById('emp-skills-input').value;
  const skills = skillsRaw.split(',').map(s => s.trim()).filter(Boolean);

  try {
    if (id) {
      await apiRequest(`/api/employees/${id}`, 'PUT', {
        emp_name: name,
        phone_no: phone,
        role,
        address,
        skills
      });
      showToast(`Staff member #${id} updated successfully!`, 'success');
    } else {
      await apiRequest('/api/employees', 'POST', {
        hotel_id: 1,
        emp_name: name,
        phone_no: phone,
        role,
        address,
        skills
      });
      showToast('Staff member added successfully!', 'success');
    }
    closeModal('modal-employee');
    await loadEmployeesTable();
    populateStaffDropdowns();
  } catch (err) {}
}

// =====================================================================
// 7. SQL REPORTS LOGIC (10 Viva Analytical Queries)
// =====================================================================
async function loadReports() {
  try {
    const res = await apiRequest('/api/reports');
    state.allReports = res.reports;

    // Render pill navigation
    const navPills = document.getElementById('reports-nav-pills');
    navPills.innerHTML = '';

    state.allReports.forEach((rep, index) => {
      const btn = document.createElement('button');
      btn.className = `report-pill-btn ${index === state.activeReportIndex ? 'active' : ''}`;
      btn.textContent = `Q${rep.id}: ${rep.title}`;
      btn.onclick = () => selectReport(index);
      navPills.appendChild(btn);
    });

    renderActiveReport();
  } catch (err) {
    console.error('Failed to load SQL reports:', err);
  }
}

function selectReport(index) {
  state.activeReportIndex = index;
  document.querySelectorAll('.report-pill-btn').forEach((b, i) => {
    b.classList.toggle('active', i === index);
  });
  renderActiveReport();
}

function renderActiveReport() {
  const rep = state.allReports[state.activeReportIndex];
  if (!rep) return;

  document.getElementById('report-title').textContent = `Query ${rep.id}: ${rep.title}`;
  document.getElementById('report-concept').textContent = `SQL Concepts: ${rep.concept}`;
  document.getElementById('report-description').textContent = rep.description;
  document.getElementById('report-sql').textContent = rep.sql;

  // Render Result Table
  const table = document.getElementById('table-report-results');
  const thead = table.querySelector('thead');
  const tbody = table.querySelector('tbody');
  thead.innerHTML = '';
  tbody.innerHTML = '';

  if (rep.data.length === 0) {
    tbody.innerHTML = '<tr><td class="empty-hint">No rows returned for this query.</td></tr>';
    return;
  }

  const columns = Object.keys(rep.data[0]);
  const headerRow = document.createElement('tr');
  columns.forEach(col => {
    const th = document.createElement('th');
    th.textContent = col.replace(/_/g, ' ').toUpperCase();
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);

  rep.data.forEach(row => {
    const tr = document.createElement('tr');
    columns.forEach(col => {
      const td = document.createElement('td');
      td.textContent = row[col] !== null ? row[col] : '-';
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}

async function refreshCurrentReport() {
  const rep = state.allReports[state.activeReportIndex];
  if (!rep) return;
  try {
    const res = await apiRequest(`/api/reports?id=${rep.id}`);
    state.allReports[state.activeReportIndex] = res.report;
    renderActiveReport();
    showToast(`Query ${rep.id} executed successfully.`, 'info');
  } catch (err) {}
}

// =====================================================================
// 8. MONGODB LOGS & FEEDBACK LOGIC
// =====================================================================
async function loadActivityLogs() {
  try {
    const res = await apiRequest('/api/logs?limit=50');
    const tbody = document.querySelector('#table-mongo-logs tbody');
    tbody.innerHTML = '';

    if (res.data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty-hint">No activity logs recorded.</td></tr>';
      return;
    }

    res.data.forEach(log => {
      const tr = document.createElement('tr');
      const detailsStr = typeof log.details === 'object' ? JSON.stringify(log.details) : String(log.details);

      tr.innerHTML = `
        <td style="font-size:11px; white-space:nowrap;">${formatDate(log.timestamp, true)}</td>
        <td><span class="badge badge-gray">${escapeHtml(log.action)}</span></td>
        <td><code>${escapeHtml(log.entity)}</code></td>
        <td>#${escapeHtml(String(log.entity_id))}</td>
        <td><strong>${escapeHtml(log.performed_by)}</strong></td>
        <td><code style="font-size:11px; color:#475569;">${escapeHtml(detailsStr)}</code></td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error('Failed to load MongoDB logs:', err);
  }
}

async function loadFeedbackList() {
  try {
    const res = await apiRequest('/api/feedback');
    const container = document.getElementById('feedback-feed');
    container.innerHTML = '';

    if (res.data.length === 0) {
      container.innerHTML = '<div class="empty-hint">No guest feedback submitted yet.</div>';
      return;
    }

    res.data.forEach(fb => {
      const card = document.createElement('div');
      card.className = 'feedback-card';
      const stars = '★'.repeat(fb.rating) + '☆'.repeat(5 - fb.rating);

      card.innerHTML = `
        <div class="fb-header">
          <span class="fb-guest">${escapeHtml(fb.cust_name)} ${fb.booking_id ? `<small class="text-muted">(Booking #${fb.booking_id})</small>` : ''}</span>
          <span class="fb-stars">${stars} (${fb.rating}/5)</span>
        </div>
        <div class="fb-comment">${escapeHtml(fb.comment)}</div>
        <div class="fb-date">${formatDate(fb.createdAt, true)}</div>
      `;
      container.appendChild(card);
    });
  } catch (err) {
    console.error('Failed to load feedback list:', err);
  }
}

async function populateFeedbackBookingSelect() {
  try {
    const res = await apiRequest('/api/bookings');
    const select = document.getElementById('fb-booking-select');
    select.innerHTML = '<option value="">-- Select Completed or Checked-in Booking --</option>';

    res.data.forEach(b => {
      if (b.status === 'Checked-out' || b.status === 'Checked-in') {
        const opt = document.createElement('option');
        opt.value = b.booking_id;
        opt.dataset.custId = b.cust_id;
        opt.dataset.custName = b.cust_name;
        opt.textContent = `Booking #${b.booking_id} - ${b.cust_name} (Room ${b.room_no})`;
        select.appendChild(opt);
      }
    });
  } catch (err) {}
}

async function handleSubmitFeedback(e) {
  e.preventDefault();
  const select = document.getElementById('fb-booking-select');
  const selectedOpt = select.options[select.selectedIndex];
  const bookingId = select.value ? parseInt(select.value, 10) : null;
  const custId = selectedOpt && selectedOpt.dataset.custId ? parseInt(selectedOpt.dataset.custId, 10) : null;
  const custName = selectedOpt && selectedOpt.dataset.custName ? selectedOpt.dataset.custName : 'Anonymous Guest';

  const rating = parseInt(document.getElementById('fb-rating').value, 10);
  const comment = document.getElementById('fb-comment').value.trim();

  try {
    await apiRequest('/api/feedback', 'POST', {
      booking_id: bookingId,
      cust_id: custId,
      cust_name: custName,
      rating,
      comment
    });

    showToast('Feedback submitted to MongoDB!', 'success');
    document.getElementById('fb-comment').value = '';
    loadFeedbackList();
  } catch (err) {}
}

// =====================================================================
// UTILITIES & MODAL HELPERS
// =====================================================================
function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('open');
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
}

function getStatusBadge(status) {
  const map = {
    Available: 'badge-green',
    Paid: 'badge-green',
    'Checked-out': 'badge-green',
    Booked: 'badge-amber',
    'Checked-in': 'badge-amber',
    Pending: 'badge-amber',
    Occupied: 'badge-red',
    Maintenance: 'badge-red',
    Cancelled: 'badge-red',
    Refunded: 'badge-gray'
  };
  const cls = map[status] || 'badge-gray';
  return `<span class="badge ${cls}">${escapeHtml(status)}</span>`;
}

function formatDate(dateStr, includeTime = false) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;

  const options = { day: '2-digit', month: 'short', year: 'numeric' };
  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
  }
  return d.toLocaleDateString('en-IN', options);
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// 1-Click Graceful Shutdown from UI
async function stopServerFromUI() {
  if (!confirm('Are you sure you want to stop the Hotel Management System server?')) return;
  try {
    const res = await apiRequest('/api/server/stop', 'POST', {});
    showToast(res.message || 'Server stopped successfully.', 'info');
    document.body.innerHTML = `
      <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; font-family:'IBM Plex Sans',sans-serif; background:#f8fafc; color:#1e293b; text-align:center; padding:20px;">
        <div style="background:#ffffff; border:1px solid #cbd5e1; border-radius:6px; padding:32px 40px; box-shadow:0 4px 12px rgba(0,0,0,0.06); max-width:480px;">
          <h2 style="color:#1F3A5F; margin-bottom:12px; font-size:20px;">Server Stopped</h2>
          <p style="color:#64748b; font-size:14px; margin-bottom:20px; line-height:1.5;">The Node.js backend server has been terminated safely.</p>
          <div style="background:#f1f5f9; border-radius:4px; padding:12px; font-size:13px; color:#334155; text-align:left;">
            To start the server again anytime:<br>
            Double-click <strong>START_HOTEL_SYSTEM.bat</strong> on your Desktop or in your project folder.
          </div>
        </div>
      </div>
    `;
  } catch (err) {}
}

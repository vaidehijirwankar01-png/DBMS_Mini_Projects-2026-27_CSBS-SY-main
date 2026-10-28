/**
 * RAILWAY TICKET BOOKING SYSTEM — CLIENT SCRIPT (STAGES 1–4)
 * Pure Vanilla JavaScript — Flask API integration, no external libraries.
 * Stage 3: Train Search, Train Cards, Seat Selection
 * Stage 4: Passenger Details, Booking Review, Booking Confirmation, My Bookings, PNR Status
 */

document.addEventListener('DOMContentLoaded', () => {

  // ============================================================
  // 1. STATION DATA (fallback; overwritten by live API on load)
  // ============================================================
  let STATIONS = [
    { code: 'NDLS', name: 'New Delhi Railway Station',              city: 'New Delhi',  state: 'Delhi' },
    { code: 'MMCT', name: 'Mumbai Central',                         city: 'Mumbai',     state: 'Maharashtra' },
    { code: 'CSMT', name: 'Chhatrapati Shivaji Maharaj Terminus',   city: 'Mumbai',     state: 'Maharashtra' },
    { code: 'HWH',  name: 'Howrah Junction',                        city: 'Kolkata',    state: 'West Bengal' },
    { code: 'MAS',  name: 'MGR Chennai Central',                    city: 'Chennai',    state: 'Tamil Nadu' },
    { code: 'SBC',  name: 'KSR Bengaluru City Junction',            city: 'Bengaluru',  state: 'Karnataka' },
    { code: 'PNBE', name: 'Patna Junction',                         city: 'Patna',      state: 'Bihar' },
    { code: 'ADI',  name: 'Ahmedabad Junction',                     city: 'Ahmedabad',  state: 'Gujarat' },
    { code: 'HYB',  name: 'Hyderabad Deccan Nampally',              city: 'Hyderabad',  state: 'Telangana' },
    { code: 'BSB',  name: 'Varanasi Junction',                      city: 'Varanasi',   state: 'Uttar Pradesh' },
    { code: 'CNB',  name: 'Kanpur Central',                         city: 'Kanpur',     state: 'Uttar Pradesh' },
    { code: 'LKO',  name: 'Lucknow Charbagh NR',                    city: 'Lucknow',    state: 'Uttar Pradesh' },
    { code: 'JP',   name: 'Jaipur Junction',                        city: 'Jaipur',     state: 'Rajasthan' },
    { code: 'CDG',  name: 'Chandigarh Junction',                    city: 'Chandigarh', state: 'Punjab/Haryana' },
    { code: 'SVDK', name: 'Shri Mata Vaishno Devi Katra',           city: 'Katra',      state: 'J&K' },
    { code: 'GHY',  name: 'Guwahati Railway Station',               city: 'Guwahati',   state: 'Assam' },
    { code: 'BBS',  name: 'Bhubaneswar Railway Station',            city: 'Bhubaneswar',state: 'Odisha' },
    { code: 'MAO',  name: 'Madgaon Junction (Goa)',                  city: 'Goa',        state: 'Goa' }
  ];

  // Load live stations from MySQL via Flask
  fetch('/api/stations')
    .then(r => r.json())
    .then(d => {
      if (d.success && d.stations && d.stations.length > 0) {
        STATIONS = d.stations.map(s => ({
          code: s.Station_ID, name: s.Station_Name,
          city: s.City,       state: s.State
        }));
        console.log(`[RailConnect] ${STATIONS.length} live stations loaded from MySQL.`);
      }
    })
    .catch(() => console.log('[RailConnect] Using fallback station list.'));

  // ============================================================
  // 2. BOOKING STATE (shared across modal steps)
  // ============================================================
  const booking = {
    trainData:    null,  // full train object from search API
    selectedClass: null, // class object { Class, Class_Name, Fare, Coach_IDs, Available_Seats }
    coaches:      [],    // coaches list for selected class
    activeCoach:  null,  // coach object currently shown in seat grid
    selectedSeat: null,  // { Seat_ID, Seat_No, Berth_Type, status }
    passenger:    null,  // filled passenger form data
    confirmedTicket: null // response from POST /api/bookings
  };

  // ============================================================
  // 3. DOM REFERENCES
  // ============================================================
  const fromInput         = document.getElementById('fromStationInput');
  const toInput           = document.getElementById('toStationInput');
  const fromCodePill      = document.getElementById('fromCodePill');
  const toCodePill        = document.getElementById('toCodePill');
  const fromDropdown      = document.getElementById('fromStationDropdown');
  const toDropdown        = document.getElementById('toStationDropdown');
  const swapBtn           = document.getElementById('btnSwapStations');
  const journeyDateInput  = document.getElementById('journeyDateInput');
  const searchTrainsForm  = document.getElementById('searchTrainsForm');
  const classSelect       = document.getElementById('classSelect');
  const quotaSelect       = document.getElementById('quotaSelect');
  const passengerCountSpan= document.getElementById('passengerCountSpan');
  const stepMinusBtn      = document.getElementById('stepMinusBtn');
  const stepPlusBtn       = document.getElementById('stepPlusBtn');
  const toastContainer    = document.getElementById('toastContainer');
  const mobileToggleBtn   = document.getElementById('mobileToggleBtn');
  const mobileNavDrawer   = document.getElementById('mobileNavDrawer');
  const dateQuickPills    = document.querySelectorAll('.date-pill');

  // Stage 3 search results section
  const searchResultsSection = document.getElementById('searchResultsSection');
  const trainResultsList     = document.getElementById('trainResultsList');
  const emptyResultsBox      = document.getElementById('emptyResultsBox');
  const resultsRouteDisplay  = document.getElementById('resultsRouteDisplay');
  const resultsDateDisplay   = document.getElementById('resultsDateDisplay');
  const resultsClassDisplay  = document.getElementById('resultsClassDisplay');

  let passengerCount = 1;

  // ============================================================
  // 4. TOAST NOTIFICATION
  // ============================================================
  window.showToast = function(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type === 'error' ? 'toast-error' : ''}`;
    const icon = type === 'error'
      ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`
      : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(60px)';
      setTimeout(() => toast.remove(), 300);
    }, 3800);
  };

  // ============================================================
  // 5. DATE PICKER SETUP
  // ============================================================
  function formatDateForInput(date) {
    const yyyy = date.getFullYear();
    const mm   = String(date.getMonth() + 1).padStart(2, '0');
    const dd   = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  function formatDateDisplay(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  }

  const today    = new Date();
  const todayStr = formatDateForInput(today);
  journeyDateInput.min   = todayStr;
  journeyDateInput.value = todayStr;

  dateQuickPills.forEach(pill => {
    pill.addEventListener('click', () => {
      dateQuickPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      const offset = parseInt(pill.getAttribute('data-offset') || '0', 10);
      const target = new Date();
      target.setDate(today.getDate() + offset);
      journeyDateInput.value = formatDateForInput(target);
      showToast(`Journey date set to ${pill.textContent.trim()} (${journeyDateInput.value})`);
    });
  });

  journeyDateInput.addEventListener('change', () => {
    dateQuickPills.forEach(p => p.classList.remove('active'));
  });

  // ============================================================
  // 6. PASSENGER STEPPER
  // ============================================================
  stepMinusBtn.addEventListener('click', () => {
    if (passengerCount > 1) { passengerCount--; passengerCountSpan.textContent = passengerCount; }
  });
  stepPlusBtn.addEventListener('click', () => {
    if (passengerCount < 6) { passengerCount++; passengerCountSpan.textContent = passengerCount; }
    else showToast('Maximum 6 passengers per booking.', 'error');
  });

  // ============================================================
  // 7. STATION AUTOCOMPLETE
  // ============================================================
  function setupStationAutocomplete(inputElem, dropdownElem, pillElem) {
    function renderList(query = '') {
      const q = query.toLowerCase();
      const filtered = STATIONS.filter(s =>
        s.city.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q)
      );
      dropdownElem.innerHTML = '';
      if (!filtered.length) {
        dropdownElem.innerHTML = `<div class="station-item" style="cursor:default;color:var(--text-muted)">No stations found for "${query}"</div>`;
        dropdownElem.classList.add('show'); return;
      }
      filtered.forEach(stn => {
        const item = document.createElement('div');
        item.className = 'station-item';
        item.innerHTML = `
          <div>
            <div class="station-item-city">${stn.city}</div>
            <div class="station-item-name">${stn.name}</div>
          </div>
          <span class="station-item-badge">${stn.code}</span>`;
        item.addEventListener('mousedown', e => { e.preventDefault(); selectStation(stn); });
        dropdownElem.appendChild(item);
      });
      dropdownElem.classList.add('show');
    }
    function selectStation(stn) {
      inputElem.value = `${stn.city} (${stn.code})`;
      pillElem.textContent = stn.code;
      dropdownElem.classList.remove('show');
    }
    inputElem.addEventListener('focus', () => renderList(inputElem.value.split(' ')[0] || ''));
    inputElem.addEventListener('input', () => {
      renderList(inputElem.value.trim());
      const up = inputElem.value.trim().toUpperCase();
      const match = STATIONS.find(s => s.code === up || s.city.toUpperCase() === up);
      if (match) pillElem.textContent = match.code;
    });
    inputElem.addEventListener('blur', () => setTimeout(() => dropdownElem.classList.remove('show'), 200));
  }

  setupStationAutocomplete(fromInput, fromDropdown, fromCodePill);
  setupStationAutocomplete(toInput,   toDropdown,   toCodePill);

  // ============================================================
  // 8. SWAP STATIONS
  // ============================================================
  swapBtn.addEventListener('click', () => {
    const tv = fromInput.value,  tc = fromCodePill.textContent;
    fromInput.value          = toInput.value;
    fromCodePill.textContent = toCodePill.textContent;
    toInput.value            = tv;
    toCodePill.textContent   = tc;
    swapBtn.style.transform  = 'rotate(180deg) scale(1.15)';
    setTimeout(() => swapBtn.style.transform = '', 300);
    showToast(`Swapped: ${fromCodePill.textContent} ⇄ ${toCodePill.textContent}`);
  });

  // ============================================================
  // 9. BOOKING WIDGET TABS (Book / PNR / Live Status)
  // ============================================================
  const tabBtns        = document.querySelectorAll('.booking-tab-btn');
  const bookTicketPane = document.getElementById('bookTicketPane');
  const pnrPane        = document.getElementById('pnrPane');
  const liveStatusPane = document.getElementById('liveStatusPane');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.getAttribute('data-tab');
      bookTicketPane.style.display = 'none';
      pnrPane.classList.remove('active');
      liveStatusPane.classList.remove('active');
      if (tab === 'book')   bookTicketPane.style.display = 'block';
      else if (tab === 'pnr')    pnrPane.classList.add('active');
      else if (tab === 'status') liveStatusPane.classList.add('active');
    });
  });

  // ============================================================
  // 10. POPULAR ROUTES FILTER + ONE-CLICK FILL
  // ============================================================
  const routeFilterBtns = document.querySelectorAll('.route-filter-btn');
  const routeCards      = document.querySelectorAll('.route-card');

  routeFilterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      routeFilterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.getAttribute('data-filter');
      routeCards.forEach(c => {
        c.style.display = (filter === 'all' || c.getAttribute('data-category') === filter) ? 'flex' : 'none';
      });
    });
  });

  document.querySelectorAll('.btn-book-route').forEach(button => {
    button.addEventListener('click', e => {
      const card = e.target.closest('.route-card');
      const fromStn = STATIONS.find(s => s.code === card.getAttribute('data-from'));
      const toStn   = STATIONS.find(s => s.code === card.getAttribute('data-to'));
      if (fromStn && toStn) {
        fromInput.value = `${fromStn.city} (${fromStn.code})`;
        fromCodePill.textContent = fromStn.code;
        toInput.value   = `${toStn.city} (${toStn.code})`;
        toCodePill.textContent = toStn.code;
        document.querySelector('[data-tab="book"]')?.click();
        document.getElementById('bookingWidget').scrollIntoView({ behavior: 'smooth', block: 'center' });
        showToast(`Route set: ${fromStn.city} → ${toStn.city}. Pick your date and search!`);
      }
    });
  });

  // Helper for popular route empty-results button
  window.setAndSearchRoute = function(from, to) {
    const f = STATIONS.find(s => s.code === from);
    const t = STATIONS.find(s => s.code === to);
    if (f && t) {
      fromInput.value = `${f.city} (${f.code})`; fromCodePill.textContent = f.code;
      toInput.value   = `${t.city} (${t.code})`;   toCodePill.textContent   = t.code;
      document.querySelector('[data-tab="book"]')?.click();
      document.getElementById('bookingWidget').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // ============================================================
  // 11. PROMO CODE COPY
  // ============================================================
  document.querySelectorAll('.btn-copy-code').forEach(btn => {
    btn.addEventListener('click', () => {
      const code = btn.getAttribute('data-code');
      if (navigator.clipboard) {
        navigator.clipboard.writeText(code).then(() => showToast(`Code "${code}" copied!`));
      } else showToast(`Code: ${code}`);
    });
  });

  // ============================================================
  // 12. MOBILE NAV TOGGLE
  // ============================================================
  mobileToggleBtn.addEventListener('click', () => {
    mobileNavDrawer.classList.toggle('open');
    mobileToggleBtn.setAttribute('aria-expanded', mobileNavDrawer.classList.contains('open'));
  });
  document.querySelectorAll('.mobile-nav-list a').forEach(a => {
    a.addEventListener('click', () => mobileNavDrawer.classList.remove('open'));
  });

  // ============================================================
  // 13. GENERIC MODAL HELPERS
  // ============================================================
  function openModal(id) {
    const el = document.getElementById(id);
    if (el) { el.classList.add('open'); document.body.style.overflow = 'hidden'; }
  }
  function closeModal(id) {
    const el = document.getElementById(id);
    if (el) { el.classList.remove('open'); }
    // Only restore scroll if no other modal is open
    if (!document.querySelector('.modal-overlay.open')) document.body.style.overflow = '';
  }
  function closeAllModals() {
    document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
    document.body.style.overflow = '';
  }

  // Close modal on overlay click
  document.addEventListener('click', e => {
    if (e.target.classList.contains('modal-overlay') && e.target.classList.contains('open')) {
      closeModal(e.target.id);
    }
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeAllModals();
  });

  // ============================================================
  // 14. SEARCH TRAINS — STAGE 3 CORE
  // ============================================================
  searchTrainsForm.addEventListener('submit', async e => {
    e.preventDefault();

    const fromVal = fromInput.value.trim();
    const toVal   = toInput.value.trim();
    const dateVal = journeyDateInput.value;
    const classCode = classSelect.value;
    const className = classSelect.options[classSelect.selectedIndex].text;

    // Frontend validation
    if (!fromVal) { showToast('Please enter an origin station.', 'error'); fromInput.focus(); return; }
    if (!toVal)   { showToast('Please enter a destination station.', 'error'); toInput.focus(); return; }
    if (fromCodePill.textContent === toCodePill.textContent) {
      showToast('Origin and destination cannot be identical!', 'error'); return;
    }
    if (!dateVal) { showToast('Please select a journey date.', 'error'); journeyDateInput.focus(); return; }

    const fromCode = fromCodePill.textContent;
    const toCode   = toCodePill.textContent;

    // Update summary bar in results section
    resultsRouteDisplay.innerHTML = `
      <span>${fromVal}</span>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
      <span>${toVal}</span>`;
    if (resultsDateDisplay)  resultsDateDisplay.textContent  = formatDateDisplay(dateVal);
    if (resultsClassDisplay) resultsClassDisplay.textContent = className || 'All Classes';

    // Show section with loading state
    searchResultsSection.style.display = 'block';
    trainResultsList.innerHTML = `
      <div style="text-align:center;padding:3rem 1rem;color:var(--text-secondary);">
        <div class="loading-spinner" style="margin:0 auto 1rem;"></div>
        <p style="font-size:1rem;font-weight:600;">Searching trains across the network…</p>
        <p style="font-size:0.85rem;color:var(--text-muted);margin-top:0.3rem;">Checking live seat availability from database</p>
      </div>`;
    emptyResultsBox.style.display = 'none';

    // Smooth scroll to results
    searchResultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

    try {
      const url = `/api/trains/search?from=${encodeURIComponent(fromCode)}&to=${encodeURIComponent(toCode)}&date=${encodeURIComponent(dateVal)}&class=${encodeURIComponent(classCode)}`;
      const res  = await fetch(url);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Server returned an error.');
      }

      if (!data.trains || data.trains.length === 0) {
        trainResultsList.innerHTML = '';
        emptyResultsBox.style.display = 'block';
        document.getElementById('emptyResultsText').textContent =
          `No direct trains found between ${fromCode} and ${toCode} on ${formatDateDisplay(dateVal)}.`;
        showToast('No trains found for this route and date.', 'error');
        return;
      }

      // Render real train cards
      renderTrainCards(data.trains, dateVal);
      showToast(`Found ${data.trains.length} train(s) — live data from MySQL`);

    } catch (err) {
      trainResultsList.innerHTML = `
        <div style="text-align:center;padding:3rem;color:var(--error-color,#dc2626);">
          <p style="font-weight:700;font-size:1.05rem;">Could not fetch trains</p>
          <p style="font-size:0.88rem;margin-top:0.4rem;">${err.message}</p>
          <p style="font-size:0.82rem;color:var(--text-muted);margin-top:0.3rem;">Make sure Flask is running on port 5000.</p>
        </div>`;
      showToast(`Search error: ${err.message}`, 'error');
    }
  });

  // ============================================================
  // 15. RENDER TRAIN CARDS
  // ============================================================
  function calcDuration(dep, arr) {
    if (!dep || !arr) return '';
    const [dh, dm] = dep.split(':').map(Number);
    const [ah, am] = arr.split(':').map(Number);
    let mins = (ah * 60 + am) - (dh * 60 + dm);
    if (mins < 0) mins += 24 * 60;
    const h = Math.floor(mins / 60), m = mins % 60;
    return `${h}h ${m.toString().padStart(2,'0')}m`;
  }

  function getAvailBadgeClass(avail) {
    if (avail <= 0)  return 'avail-zero';
    if (avail <= 5)  return 'avail-low';
    return 'avail-ok';
  }

  function renderTrainCards(trains, journeyDate) {
    trainResultsList.innerHTML = '';

    trains.forEach(t => {
      const dep = (t.Departure_Time || '').substring(0, 5);
      const arr = (t.Arrival_Time   || '').substring(0, 5);
      const dur = calcDuration(dep, arr);

      // Build class rows
      const classes = t.Classes || [];
      let classRowsHtml = '';
      if (classes.length === 0) {
        classRowsHtml = `<div class="class-card-item"><span class="class-label">General</span><span class="avail-pill avail-ok">Available</span><span class="class-fare">₹--</span><button class="btn btn-primary btn-sm" disabled>Select Seats</button></div>`;
      } else {
        classes.forEach(cls => {
          const avail     = cls.Available_Seats;
          const badgeCls  = getAvailBadgeClass(avail);
          const availText = avail > 0 ? `${avail} Avail` : 'Waitlist';
          const fareStr   = `₹${Number(cls.Fare).toLocaleString('en-IN')}`;
          const disabled  = avail <= 0 ? 'disabled' : '';
          classRowsHtml += `
            <div class="class-card-item">
              <span class="class-label">${cls.Class}<span class="class-full-name">${cls.Class_Name || ''}</span></span>
              <span class="avail-pill ${badgeCls}">${availText}</span>
              <span class="class-fare">${fareStr}</span>
              <button class="btn btn-primary btn-sm btn-select-class" ${disabled}
                data-train-no="${t.Train_No}"
                data-class='${JSON.stringify(cls)}'
                data-journey-date="${journeyDate}">
                ${avail > 0 ? 'Select Seats' : 'Waitlist'}
              </button>
            </div>`;
        });
      }

      const trainTypeColor = t.Type === 'Superfast' ? 'badge-amber' : t.Type === 'Express' ? 'badge-navy' : 'badge-success';
      const card = document.createElement('div');
      card.className = 'train-card-full';
      card.innerHTML = `
        <div class="tc-header">
          <div class="tc-train-identity">
            <span class="tc-train-no">${t.Train_No}</span>
            <span class="tc-train-name">${t.Train_Name}</span>
            <span class="badge ${trainTypeColor}">${t.Type || 'Train'}</span>
          </div>
          <div class="tc-meta">
            <span class="tc-running-days">${t.Running_Days || ''}</span>
            <button class="btn btn-outline-navy btn-sm" onclick="viewTrainSchedule(${t.Train_No})">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              Schedule
            </button>
          </div>
        </div>
        <div class="tc-timing-row">
          <div class="tc-station dep">
            <div class="tc-time">${dep}</div>
            <div class="tc-stn-code">${t.Source_Station}</div>
            <div class="tc-stn-name">${t.Source_Station_Name || ''}</div>
          </div>
          <div class="tc-route-line">
            <span class="tc-duration">${dur}</span>
            <div class="tc-line-bar"><div class="tc-dot"></div><div class="tc-dash"></div><div class="tc-dot"></div></div>
            <span class="tc-journey-date">${formatDateDisplay(journeyDate)}</span>
          </div>
          <div class="tc-station arr">
            <div class="tc-time">${arr}</div>
            <div class="tc-stn-code">${t.Destination_Station}</div>
            <div class="tc-stn-name">${t.Destination_Station_Name || ''}</div>
          </div>
        </div>
        <div class="tc-classes-section">
          <div class="tc-classes-header">
            <span>Class</span><span>Availability</span><span>Fare</span><span>Action</span>
          </div>
          <div class="tc-classes-body">
            ${classRowsHtml}
          </div>
        </div>`;

      // Wire "Select Seats" buttons
      card.querySelectorAll('.btn-select-class').forEach(btn => {
        btn.addEventListener('click', () => {
          const trainNo    = btn.getAttribute('data-train-no');
          const classData  = JSON.parse(btn.getAttribute('data-class'));
          const jDate      = btn.getAttribute('data-journey-date');
          booking.trainData     = t;
          booking.selectedClass = classData;
          openSeatSelectionModal(trainNo, classData, jDate);
        });
      });

      trainResultsList.appendChild(card);
    });
  }

  // ============================================================
  // 16. TRAIN SCHEDULE MODAL (alert replaced with styled modal)
  // ============================================================
  window.viewTrainSchedule = async function(trainNo) {
    const modal = document.getElementById('scheduleModal');
    const body  = document.getElementById('scheduleModalBody');
    body.innerHTML = `<div style="text-align:center;padding:2rem;"><div class="loading-spinner" style="margin:0 auto;"></div><p style="margin-top:1rem;color:var(--text-secondary);">Loading schedule…</p></div>`;
    openModal('scheduleModal');
    try {
      const res  = await fetch(`/api/schedules/${trainNo}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      document.getElementById('scheduleModalTitle').textContent = `${data.train.Train_No} — ${data.train.Train_Name}`;
      body.innerHTML = `
        <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:1rem;">Running: ${data.train.Running_Days} | Type: ${data.train.Type} | Status: ${data.train.Status}</p>
        <div class="schedule-stops-list">
          ${data.schedule.map((s, i) => `
            <div class="schedule-stop ${i === 0 ? 'first' : i === data.schedule.length - 1 ? 'last' : ''}">
              <div class="stop-dot"></div>
              <div class="stop-details">
                <span class="stop-name">${s.Station_Name} <span class="stop-code">(${s.Station_ID})</span></span>
                <span class="stop-city">${s.City}, ${s.State}</span>
              </div>
              <div class="stop-times">
                <span>Arr: <strong>${s.Arrival_Time || 'Origin'}</strong></span>
                <span>Dep: <strong>${s.Departure_Time || 'Terminus'}</strong></span>
                <span class="stop-pf">PF ${s.Platform_No || '--'}</span>
              </div>
            </div>`).join('')}
        </div>`;
    } catch (err) {
      body.innerHTML = `<div style="color:var(--error-color,#dc2626);padding:1.5rem;text-align:center;">Could not load schedule: ${err.message}</div>`;
    }
  };

  // ============================================================
  // 17. SEAT SELECTION MODAL — STAGE 3
  // ============================================================
  async function openSeatSelectionModal(trainNo, classData, journeyDate) {
    booking.selectedSeat = null;

    const modal        = document.getElementById('seatSelectionModal');
    const coachTabs    = document.getElementById('seatCoachTabs');
    const seatsGrid    = document.getElementById('seatsGrid');
    const seatInfo     = document.getElementById('seatSelectedInfo');
    const proceedBtn   = document.getElementById('btnProceedToPassenger');
    const titleEl      = document.getElementById('seatModalTitle');
    const subtitleEl   = document.getElementById('seatModalSubtitle');
    const coachInfoEl  = document.getElementById('seatCoachInfo');

    titleEl.textContent    = `Select Seat — ${classData.Class} Class`;
    subtitleEl.textContent = `${booking.trainData.Train_Name} (${trainNo}) · ${formatDateDisplay(journeyDate)}`;
    seatInfo.textContent   = 'No seat selected';
    proceedBtn.disabled    = true;

    openModal('seatSelectionModal');

    // Load coaches for this class
    seatsGrid.innerHTML    = `<div style="text-align:center;padding:2rem;"><div class="loading-spinner" style="margin:0 auto;"></div></div>`;
    coachTabs.innerHTML    = `<span style="color:var(--text-muted);font-size:0.85rem;">Loading coaches…</span>`;

    try {
      const res  = await fetch(`/api/trains/${trainNo}/coaches?date=${journeyDate}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      // Filter coaches to selected class
      const myCoaches = data.coaches.filter(c => c.Class === classData.Class);
      booking.coaches = myCoaches;

      if (!myCoaches.length) {
        seatsGrid.innerHTML = `<p style="text-align:center;color:var(--text-muted);padding:2rem;">No coaches found for class ${classData.Class}.</p>`;
        coachTabs.innerHTML = '';
        return;
      }

      // Build coach tabs
      coachTabs.innerHTML = '';
      myCoaches.forEach((coach, idx) => {
        const tab = document.createElement('button');
        tab.className   = `coach-tab-btn${idx === 0 ? ' active' : ''}`;
        tab.textContent = `${coach.Coach_No} (${coach.Available_Seats} avail)`;
        tab.setAttribute('data-coach-id', coach.Coach_ID);
        tab.addEventListener('click', () => {
          coachTabs.querySelectorAll('.coach-tab-btn').forEach(b => b.classList.remove('active'));
          tab.classList.add('active');
          loadSeatGrid(coach, trainNo, journeyDate);
        });
        coachTabs.appendChild(tab);
      });

      // Update coach info header
      coachInfoEl.textContent = `${myCoaches.length} Coach(es) · Fare: ₹${Number(classData.Fare).toLocaleString('en-IN')} per seat`;

      // Load first coach
      booking.activeCoach = myCoaches[0];
      await loadSeatGrid(myCoaches[0], trainNo, journeyDate);

    } catch (err) {
      seatsGrid.innerHTML = `<div style="color:var(--error-color,#dc2626);text-align:center;padding:2rem;">Failed to load coaches: ${err.message}</div>`;
    }

    // Proceed button
    proceedBtn.onclick = () => {
      if (!booking.selectedSeat) { showToast('Please select a seat first.', 'error'); return; }
      closeModal('seatSelectionModal');
      openPassengerModal();
    };
  }

  async function loadSeatGrid(coach, trainNo, journeyDate) {
    const seatsGrid = document.getElementById('seatsGrid');
    seatsGrid.innerHTML = `<div style="text-align:center;padding:2rem;"><div class="loading-spinner" style="margin:0 auto;"></div><p style="margin-top:0.8rem;font-size:0.85rem;color:var(--text-muted);">Loading seat map for ${coach.Coach_No}…</p></div>`;

    booking.activeCoach  = coach;
    booking.selectedSeat = null;
    document.getElementById('seatSelectedInfo').textContent = 'No seat selected';
    document.getElementById('btnProceedToPassenger').disabled = true;

    try {
      const res  = await fetch(`/api/seats?train_no=${trainNo}&coach_id=${coach.Coach_ID}&journey_date=${journeyDate}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      renderSeatGrid(data.seats, data.coach, trainNo, journeyDate);
    } catch (err) {
      seatsGrid.innerHTML = `<div style="color:var(--error-color,#dc2626);text-align:center;padding:2rem;">Could not load seats: ${err.message}</div>`;
    }
  }

  function renderSeatGrid(seats, coachMeta, trainNo, journeyDate) {
    const seatsGrid = document.getElementById('seatsGrid');
    if (!seats || !seats.length) {
      seatsGrid.innerHTML = `<p style="text-align:center;color:var(--text-muted);padding:2rem;">No seat records found for this coach.</p>`;
      return;
    }

    let html = `<div class="seats-grid-wrap">`;
    seats.forEach(seat => {
      const cls   = seat.status === 'booked' ? 'booked' : 'avail';
      const title = `Seat ${seat.Seat_No} · ${seat.Berth_Type || ''} · ${seat.status}`;
      html += `
        <button class="seat-box ${cls}" title="${title}"
          data-seat-id="${seat.Seat_ID}"
          data-seat-no="${seat.Seat_No}"
          data-berth="${seat.Berth_Type || ''}"
          data-status="${seat.status}"
          ${seat.status === 'booked' ? 'disabled' : ''}>
          <span class="seat-no">${seat.Seat_No}</span>
          <span class="seat-berth">${(seat.Berth_Type || '').substring(0,3)}</span>
        </button>`;
    });
    html += `</div>`;

    seatsGrid.innerHTML = html;

    // Wire click handlers
    seatsGrid.querySelectorAll('.seat-box.avail').forEach(btn => {
      btn.addEventListener('click', () => {
        // Deselect previous
        seatsGrid.querySelectorAll('.seat-box.selected').forEach(b => {
          b.classList.remove('selected'); b.classList.add('avail');
        });
        btn.classList.remove('avail');
        btn.classList.add('selected');

        booking.selectedSeat = {
          Seat_ID:   btn.getAttribute('data-seat-id'),
          Seat_No:   btn.getAttribute('data-seat-no'),
          Berth_Type: btn.getAttribute('data-berth'),
          Coach_ID:  coachMeta.coach_id || booking.activeCoach.Coach_ID,
          Coach_No:  coachMeta.coach_no || booking.activeCoach.Coach_No,
          Fare:      coachMeta.fare     || booking.activeCoach.Fare
        };

        const info = document.getElementById('seatSelectedInfo');
        info.textContent = `Selected: Seat ${booking.selectedSeat.Seat_No} · ${booking.selectedSeat.Berth_Type} · Coach ${booking.selectedSeat.Coach_No}`;
        document.getElementById('btnProceedToPassenger').disabled = false;
      });
    });
  }

  // ============================================================
  // 18. PASSENGER DETAILS MODAL — STAGE 4
  // ============================================================
  function openPassengerModal() {
    const t    = booking.trainData;
    const cls  = booking.selectedClass;
    const seat = booking.selectedSeat;

    document.getElementById('paxTrainSummary').innerHTML = `
      <div class="pax-summary-row">
        <span class="pax-summary-label">Train</span>
        <span class="pax-summary-value">${t.Train_No} — ${t.Train_Name}</span>
      </div>
      <div class="pax-summary-row">
        <span class="pax-summary-label">Route</span>
        <span class="pax-summary-value">${t.Source_Station} → ${t.Destination_Station}</span>
      </div>
      <div class="pax-summary-row">
        <span class="pax-summary-label">Date</span>
        <span class="pax-summary-value">${formatDateDisplay(t.Journey_Date || journeyDateInput.value)}</span>
      </div>
      <div class="pax-summary-row">
        <span class="pax-summary-label">Seat</span>
        <span class="pax-summary-value">Coach ${seat.Coach_No} · Seat ${seat.Seat_No} · ${seat.Berth_Type}</span>
      </div>
      <div class="pax-summary-row">
        <span class="pax-summary-label">Class / Fare</span>
        <span class="pax-summary-value">${cls.Class} · ₹${Number(cls.Fare).toLocaleString('en-IN')}</span>
      </div>`;

    // Reset form
    document.getElementById('passengerForm').reset();
    openModal('passengerModal');

    document.getElementById('btnReviewBooking').onclick = () => {
      const form = document.getElementById('passengerForm');
      if (!form.checkValidity()) { form.reportValidity(); return; }

      const aadhaar = document.getElementById('paxAadhaar').value.trim();
      if (!/^\d{12}$/.test(aadhaar)) {
        showToast('Aadhaar must be exactly 12 digits.', 'error'); return;
      }
      const phone = document.getElementById('paxPhone').value.trim();
      if (!/^\d{10}$/.test(phone)) {
        showToast('Phone number must be exactly 10 digits.', 'error'); return;
      }

      booking.passenger = {
        name:    document.getElementById('paxName').value.trim(),
        gender:  document.getElementById('paxGender').value,
        dob:     document.getElementById('paxDob').value,
        email:   document.getElementById('paxEmail').value.trim(),
        phone:   phone,
        address: document.getElementById('paxAddress').value.trim(),
        aadhaar: aadhaar
      };
      closeModal('passengerModal');
      openBookingReviewModal();
    };
  }

  // ============================================================
  // 19. BOOKING REVIEW + SIMULATED PAYMENT — STAGE 4
  // ============================================================
  function openBookingReviewModal() {
    const t    = booking.trainData;
    const cls  = booking.selectedClass;
    const seat = booking.selectedSeat;
    const pax  = booking.passenger;
    const fare = Number(cls.Fare);
    const tax  = Math.round(fare * 0.05);
    const svc  = 30;
    const total = fare + tax + svc;

    document.getElementById('reviewContent').innerHTML = `
      <div class="review-section">
        <h4 class="review-section-title">Train Details</h4>
        <div class="review-row"><span>Train</span><strong>${t.Train_No} — ${t.Train_Name}</strong></div>
        <div class="review-row"><span>Route</span><strong>${t.Source_Station} → ${t.Destination_Station}</strong></div>
        <div class="review-row"><span>Journey Date</span><strong>${formatDateDisplay(t.Journey_Date || journeyDateInput.value)}</strong></div>
        <div class="review-row"><span>Coach / Seat</span><strong>Coach ${seat.Coach_No} · Seat ${seat.Seat_No} · ${seat.Berth_Type}</strong></div>
        <div class="review-row"><span>Class</span><strong>${cls.Class} — ${cls.Class_Name || ''}</strong></div>
      </div>
      <div class="review-section">
        <h4 class="review-section-title">Passenger Details</h4>
        <div class="review-row"><span>Name</span><strong>${pax.name}</strong></div>
        <div class="review-row"><span>Gender</span><strong>${pax.gender}</strong></div>
        <div class="review-row"><span>Date of Birth</span><strong>${pax.dob}</strong></div>
        <div class="review-row"><span>Email</span><strong>${pax.email}</strong></div>
        <div class="review-row"><span>Phone</span><strong>${pax.phone}</strong></div>
        <div class="review-row"><span>Aadhaar</span><strong>XXXX-XXXX-${pax.aadhaar.slice(-4)}</strong></div>
      </div>
      <div class="review-section fare-breakdown">
        <h4 class="review-section-title">Fare Breakdown</h4>
        <div class="review-row"><span>Base Fare</span><strong>₹${fare.toLocaleString('en-IN')}</strong></div>
        <div class="review-row"><span>GST (5%)</span><strong>₹${tax.toLocaleString('en-IN')}</strong></div>
        <div class="review-row"><span>Service Fee</span><strong>₹${svc}</strong></div>
        <div class="review-row fare-total"><span>Total Amount</span><strong>₹${total.toLocaleString('en-IN')}</strong></div>
      </div>
      <div class="simulated-payment-badge">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
        Simulated Payment Flow — No real transaction will occur
      </div>`;

    openModal('reviewModal');

    document.getElementById('btnConfirmBooking').onclick = confirmBooking;
  }

  // ============================================================
  // 20. CONFIRM BOOKING — POST /api/bookings
  // ============================================================
  async function confirmBooking() {
    const btn = document.getElementById('btnConfirmBooking');
    btn.disabled = true;
    btn.textContent = 'Processing…';

    const t    = booking.trainData;
    const cls  = booking.selectedClass;
    const seat = booking.selectedSeat;
    const pax  = booking.passenger;

    const payload = {
      train_no:     t.Train_No,
      journey_date: t.Journey_Date || journeyDateInput.value,
      coach_id:     seat.Coach_ID,
      seat_id:      seat.Seat_ID,
      class:        cls.Class,
      quota:        quotaSelect.options[quotaSelect.selectedIndex].text || 'General',
      passenger:    pax
    };

    try {
      const res  = await fetch('/api/bookings', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok || !data.success) throw new Error(data.error || 'Booking failed.');

      booking.confirmedTicket = data.ticket;
      closeModal('reviewModal');
      openConfirmationModal(data.ticket);

    } catch (err) {
      showToast(`Booking failed: ${err.message}`, 'error');
      btn.disabled    = false;
      btn.textContent = 'Confirm & Pay';
    }
  }

  // ============================================================
  // 21. BOOKING CONFIRMATION / E-TICKET MODAL — STAGE 4
  // ============================================================
  function openConfirmationModal(ticket) {
    const bp = document.getElementById('boardingPassContent');
    bp.innerHTML = `
      <div class="bp-header">
        <div class="bp-logo">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 17l2-8 4 4 4-8 4 12"/></svg>
          RailConnect
        </div>
        <div class="bp-status confirmed">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          CONFIRMED
        </div>
      </div>
      <div class="bp-pnr-block">
        <div class="bp-pnr-label">PNR Number</div>
        <div class="bp-pnr-value">${ticket.pnr}</div>
        <div class="bp-pnr-hint">Save this PNR to check booking status or cancel</div>
      </div>
      <div class="bp-divider"><span>✈ BOARDING PASS</span></div>
      <div class="bp-route-row">
        <div class="bp-station">
          <div class="bp-stn-code">${ticket.source_station}</div>
          <div class="bp-stn-name">${ticket.source_name || ''}</div>
        </div>
        <div class="bp-route-arrow">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </div>
        <div class="bp-station right">
          <div class="bp-stn-code">${ticket.destination_station}</div>
          <div class="bp-stn-name">${ticket.destination_name || ''}</div>
        </div>
      </div>
      <div class="bp-details-grid">
        <div class="bp-detail"><span class="bp-dl">Passenger</span><strong class="bp-dv">${ticket.passenger.name}</strong></div>
        <div class="bp-detail"><span class="bp-dl">Gender</span><strong class="bp-dv">${ticket.passenger.gender}</strong></div>
        <div class="bp-detail"><span class="bp-dl">Train</span><strong class="bp-dv">${ticket.train_no} — ${ticket.train_name}</strong></div>
        <div class="bp-detail"><span class="bp-dl">Journey Date</span><strong class="bp-dv">${formatDateDisplay(ticket.journey_date)}</strong></div>
        <div class="bp-detail"><span class="bp-dl">Coach</span><strong class="bp-dv">${ticket.coach_no}</strong></div>
        <div class="bp-detail"><span class="bp-dl">Seat / Berth</span><strong class="bp-dv">${ticket.seat_no} · ${ticket.berth_type}</strong></div>
        <div class="bp-detail"><span class="bp-dl">Class</span><strong class="bp-dv">${ticket.class}</strong></div>
        <div class="bp-detail"><span class="bp-dl">Quota</span><strong class="bp-dv">${ticket.quota}</strong></div>
        <div class="bp-detail"><span class="bp-dl">Fare Paid</span><strong class="bp-dv bp-fare">₹${Number(ticket.fare).toLocaleString('en-IN')}</strong></div>
        <div class="bp-detail"><span class="bp-dl">Booking Date</span><strong class="bp-dv">${ticket.booking_date}</strong></div>
      </div>
      <div class="bp-footer">
        <span>Ticket ID: ${ticket.ticket_id}</span>
        <span>Aadhaar: ${ticket.passenger.aadhaar}</span>
        <span>Email: ${ticket.passenger.email}</span>
      </div>`;

    openModal('confirmationModal');
    showToast(`Booking confirmed! PNR: ${ticket.pnr}`);

    document.getElementById('btnPrintTicket').onclick = () => window.print();
    document.getElementById('btnViewMyBookings').onclick = () => {
      closeModal('confirmationModal');
      openMyBookingsModal(ticket.passenger.email, ticket.pnr);
    };
  }

  // ============================================================
  // 22. MY BOOKINGS MODAL — STAGE 4
  // ============================================================
  window.openMyBookingsModal = async function(prefillEmail = '', prefillPnr = '') {
    document.getElementById('mbSearchEmail').value = prefillEmail;
    document.getElementById('mbSearchPnr').value   = prefillPnr;
    document.getElementById('mbResultsArea').innerHTML = '';
    openModal('myBookingsModal');

    if (prefillEmail || prefillPnr) {
      await fetchAndRenderBookings(prefillPnr, prefillEmail, '');
    }
  };

  document.getElementById('mbSearchForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const pnr   = document.getElementById('mbSearchPnr').value.trim();
    const email = document.getElementById('mbSearchEmail').value.trim();
    await fetchAndRenderBookings(pnr, email, '');
  });

  async function fetchAndRenderBookings(pnr, email, phone) {
    const area = document.getElementById('mbResultsArea');
    area.innerHTML = `<div style="text-align:center;padding:2rem;"><div class="loading-spinner" style="margin:0 auto;"></div><p style="margin-top:0.8rem;color:var(--text-muted);font-size:0.9rem;">Fetching bookings from database…</p></div>`;

    let qs = '';
    if (pnr)   qs += `pnr=${encodeURIComponent(pnr)}&`;
    if (email) qs += `email=${encodeURIComponent(email)}&`;
    if (phone) qs += `phone=${encodeURIComponent(phone)}&`;

    if (!qs) {
      area.innerHTML = `<p style="text-align:center;color:var(--text-muted);padding:2rem;">Please enter a PNR or Email to search your bookings.</p>`;
      return;
    }

    try {
      const res  = await fetch(`/api/bookings?${qs}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      if (!data.bookings || data.bookings.length === 0) {
        area.innerHTML = `<p style="text-align:center;color:var(--text-muted);padding:2rem;">No bookings found. Try a different PNR or Email.</p>`;
        return;
      }

      area.innerHTML = data.bookings.map(b => {
        const statusCls = b.Booking_Status === 'Confirmed' ? 'status-confirmed'
                        : b.Booking_Status === 'Cancelled' ? 'status-cancelled' : 'status-pending';
        const cancelBtn = b.Booking_Status !== 'Cancelled'
          ? `<button class="btn btn-sm btn-cancel-booking" data-pnr="${b.PNR_No}" data-email="${b.Email}">Cancel Ticket</button>` : '';
        return `
          <div class="booking-history-item">
            <div class="bh-top">
              <div>
                <span class="bh-pnr">PNR: ${b.PNR_No}</span>
                <span class="bh-status-badge ${statusCls}">${b.Booking_Status}</span>
              </div>
              <span class="bh-amount">₹${Number(b.Amount).toLocaleString('en-IN')}</span>
            </div>
            <div class="bh-train-info">${b.Train_No} — ${b.Train_Name || ''}</div>
            <div class="bh-route">${b.Source_Station || ''} → ${b.Destination_Station || ''}</div>
            <div class="bh-details-row">
              <span>Journey: <strong>${formatDateDisplay(b.Journey_Date)}</strong></span>
              <span>Coach ${b.Coach_No || '--'} · Seat ${b.Seat_No || '--'} · ${b.Berth_Type || '--'}</span>
              <span>Class: <strong>${b.Class}</strong></span>
            </div>
            <div class="bh-passenger">Passenger: <strong>${b.Passenger_Name}</strong> · ${b.Email}</div>
            <div class="bh-actions">${cancelBtn}</div>
          </div>`;
      }).join('');

      // Wire cancel buttons
      area.querySelectorAll('.btn-cancel-booking').forEach(btn => {
        btn.addEventListener('click', () => {
          const pnrVal = btn.getAttribute('data-pnr');
          const emailVal = btn.getAttribute('data-email');
          cancelBooking(pnrVal, emailVal, () => fetchAndRenderBookings(pnr, email, phone));
        });
      });

    } catch (err) {
      area.innerHTML = `<div style="color:var(--error-color,#dc2626);text-align:center;padding:2rem;">Error: ${err.message}</div>`;
    }
  }

  // ============================================================
  // 23. CANCEL BOOKING — POST /api/bookings/<pnr>/cancel
  // ============================================================
  async function cancelBooking(pnr, email, onSuccess) {
    if (!confirm(`Are you sure you want to cancel ticket with PNR ${pnr}?\nA 10% cancellation fee applies.`)) return;

    try {
      const res  = await fetch(`/api/bookings/${pnr}/cancel`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email })
      });
      const data = await res.json();

      if (!res.ok || !data.success) throw new Error(data.error);

      const c = data.cancellation;
      showToast(`PNR ${pnr} cancelled. Refund: ₹${c.refund_amount} (fee: ₹${c.cancellation_fee})`);
      if (onSuccess) onSuccess();

    } catch (err) {
      showToast(`Cancellation failed: ${err.message}`, 'error');
    }
  }

  // ============================================================
  // 24. PNR STATUS (Booking Widget Tab) — wired to real API
  // ============================================================
  const pnrForm = document.getElementById('pnrForm');
  if (pnrForm) {
    pnrForm.addEventListener('submit', async e => {
      e.preventDefault();
      const pnrVal = document.getElementById('pnrInput').value.trim();
      if (pnrVal.length !== 10 || isNaN(pnrVal)) {
        showToast('Enter a valid 10-digit numeric PNR.', 'error'); return;
      }
      const resultEl = document.getElementById('pnrStatusResult');
      if (resultEl) resultEl.innerHTML = `<div class="loading-spinner" style="margin:0.5rem auto;"></div>`;

      try {
        const res  = await fetch(`/api/pnr/${pnrVal}`);
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
        const s = data.pnr_status;
        const sc = s.Booking_Status === 'Confirmed' ? 'status-confirmed' : 'status-cancelled';
        const html = `
          <div class="pnr-result-card">
            <div class="pnr-result-top">
              <span class="pnr-result-no">PNR: ${s.PNR_No}</span>
              <span class="bh-status-badge ${sc}">${s.Booking_Status}</span>
            </div>
            <div class="pnr-result-row"><span>Passenger</span><strong>${s.Passenger_Name}</strong></div>
            <div class="pnr-result-row"><span>Train</span><strong>${s.Train_No} — ${s.Train_Name}</strong></div>
            <div class="pnr-result-row"><span>Journey Date</span><strong>${formatDateDisplay(s.Journey_Date)}</strong></div>
            <div class="pnr-result-row"><span>Coach / Seat</span><strong>${s.Coach_No} · ${s.Seat_No} · ${s.Berth_Type}</strong></div>
            <div class="pnr-result-row"><span>Class</span><strong>${s.Class} (${s.Quota})</strong></div>
            <div class="pnr-result-row"><span>Fare</span><strong>₹${Number(s.Amount).toLocaleString('en-IN')}</strong></div>
          </div>`;
        if (resultEl) resultEl.innerHTML = html;
        else showToast(`${s.PNR_No}: ${s.Booking_Status} — ${s.Passenger_Name} · Coach ${s.Coach_No} Seat ${s.Seat_No}`);
      } catch (err) {
        if (resultEl) resultEl.innerHTML = `<p style="color:var(--error-color,#dc2626);font-size:0.88rem;">PNR not found: ${err.message}</p>`;
        else showToast(`PNR ${pnrVal} not found.`, 'error');
      }
    });
  }

  // ============================================================
  // 25. MY BOOKINGS NAV LINK
  // ============================================================
  document.querySelectorAll('[data-open-my-bookings]').forEach(el => {
    el.addEventListener('click', e => { e.preventDefault(); openMyBookingsModal(); });
  });

}); // END DOMContentLoaded

/* ============================================
   Smart Waste Collection & Segregation Tracker
   Main JavaScript
   ============================================ */

(function () {
  'use strict';

  /* ------------------------------------------
     Sidebar Toggle (Mobile)
  ------------------------------------------ */
  const sidebar      = document.getElementById('sidebar');
  const overlay       = document.getElementById('sidebarOverlay');
  const toggleBtn     = document.getElementById('sidebarToggle');

  function openSidebar()  {
    if (sidebar) sidebar.classList.add('show');
    if (overlay) overlay.classList.add('show');
    document.body.style.overflow = 'hidden';
  }
  function closeSidebar() {
    if (sidebar) sidebar.classList.remove('show');
    if (overlay) overlay.classList.remove('show');
    document.body.style.overflow = '';
  }

  if (toggleBtn) toggleBtn.addEventListener('click', openSidebar);
  if (overlay)   overlay.addEventListener('click', closeSidebar);

  // Close sidebar on Escape key
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeSidebar();
  });

  // Expose globally
  window.toggleSidebar = function () {
    if (sidebar && sidebar.classList.contains('show')) closeSidebar();
    else openSidebar();
  };

  /* ------------------------------------------
     Auto-Dismiss Flash Messages
  ------------------------------------------ */
  document.querySelectorAll('.flash-container .alert').forEach(function (alert) {
    setTimeout(function () {
      var bsAlert = bootstrap.Alert.getOrCreateInstance(alert);
      if (bsAlert) bsAlert.close();
    }, 5000);
  });

  /* ------------------------------------------
     Form Validation Helpers
  ------------------------------------------ */
  document.querySelectorAll('form.needs-validation').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      if (!form.checkValidity()) {
        e.preventDefault();
        e.stopPropagation();
      }
      form.classList.add('was-validated');
    });
  });

  /**
   * Quick validity check on a form element
   */
  window.validateField = function (input) {
    if (!input.checkValidity()) {
      input.classList.add('is-invalid');
      return false;
    }
    input.classList.remove('is-invalid');
    input.classList.add('is-valid');
    return true;
  };

  /* ------------------------------------------
     Table Search / Filter
  ------------------------------------------ */
  /**
   * Attach live-search to a table.
   * @param {string} inputId  - ID of the search <input>
   * @param {string} tableId  - ID of the <table> to filter
   */
  window.initTableSearch = function (inputId, tableId) {
    var input = document.getElementById(inputId);
    var table = document.getElementById(tableId);
    if (!input || !table) return;

    input.addEventListener('input', function () {
      var query = input.value.toLowerCase().trim();
      var rows  = table.querySelectorAll('tbody tr');

      rows.forEach(function (row) {
        var text = row.textContent.toLowerCase();
        row.style.display = text.includes(query) ? '' : 'none';
      });
    });
  };

  /**
   * Filter table rows by a dropdown value matching a specific column index.
   * @param {string} selectId  - ID of the <select>
   * @param {string} tableId   - ID of the <table>
   * @param {number} colIndex  - 0-based column index to match against
   */
  window.initTableFilter = function (selectId, tableId, colIndex) {
    var select = document.getElementById(selectId);
    var table  = document.getElementById(tableId);
    if (!select || !table) return;

    select.addEventListener('change', function () {
      var val  = select.value.toLowerCase().trim();
      var rows = table.querySelectorAll('tbody tr');

      rows.forEach(function (row) {
        if (!val) { row.style.display = ''; return; }
        var cell = row.cells[colIndex];
        if (cell) {
          var text = cell.textContent.toLowerCase().trim();
          row.style.display = text.includes(val) ? '' : 'none';
        }
      });
    });
  };

  /* ------------------------------------------
     Confirm Dialogs
  ------------------------------------------ */
  window.confirmDelete = function (msg) {
    return confirm(msg || 'Are you sure you want to delete this item? This action cannot be undone.');
  };

  window.confirmCancel = function (msg) {
    return confirm(msg || 'Are you sure you want to cancel this request?');
  };

  window.confirmAction = function (msg) {
    return confirm(msg || 'Are you sure you want to proceed?');
  };

  /* ------------------------------------------
     Date Picker Helpers
  ------------------------------------------ */
  /**
   * Set the min attribute of a date input to today.
   * @param {string} inputId
   */
  window.setMinDateToday = function (inputId) {
    var input = document.getElementById(inputId);
    if (input) {
      var today = new Date().toISOString().split('T')[0];
      input.setAttribute('min', today);
    }
  };

  /**
   * Initialize date range inputs so end >= start.
   * @param {string} startId
   * @param {string} endId
   */
  window.initDateRange = function (startId, endId) {
    var startInput = document.getElementById(startId);
    var endInput   = document.getElementById(endId);
    if (!startInput || !endInput) return;

    startInput.addEventListener('change', function () {
      endInput.setAttribute('min', startInput.value);
      if (endInput.value && endInput.value < startInput.value) {
        endInput.value = startInput.value;
      }
    });
  };

  /* ------------------------------------------
     Chart.js Helpers
  ------------------------------------------ */
  var chartColors = [
    '#28a745', '#155724', '#ffc107', '#17a2b8',
    '#dc3545', '#6f42c1', '#fd7e14', '#20c997',
    '#0dcaf0', '#d63384', '#6c757d', '#198754'
  ];

  /**
   * Create a doughnut chart.
   */
  window.createDoughnutChart = function (canvasId, labels, data, title) {
    var ctx = document.getElementById(canvasId);
    if (!ctx) return null;
    return new Chart(ctx.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: chartColors.slice(0, data.length),
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { padding: 15, font: { size: 12 } } },
          title:  { display: !!title, text: title, font: { size: 14, weight: '600' } }
        }
      }
    });
  };

  /**
   * Create a bar chart.
   */
  window.createBarChart = function (canvasId, labels, data, label, title) {
    var ctx = document.getElementById(canvasId);
    if (!ctx) return null;
    return new Chart(ctx.getContext('2d'), {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: label || 'Value',
          data: data,
          backgroundColor: 'rgba(40,167,69,0.7)',
          borderColor: '#28a745',
          borderWidth: 1,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          title:  { display: !!title, text: title, font: { size: 14, weight: '600' } }
        },
        scales: {
          y: { beginAtZero: true, ticks: { font: { size: 11 } } },
          x: { ticks: { font: { size: 11 } } }
        }
      }
    });
  };

  /**
   * Create a pie chart.
   */
  window.createPieChart = function (canvasId, labels, data, title) {
    var ctx = document.getElementById(canvasId);
    if (!ctx) return null;
    return new Chart(ctx.getContext('2d'), {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: chartColors.slice(0, data.length),
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { padding: 15, font: { size: 12 } } },
          title:  { display: !!title, text: title, font: { size: 14, weight: '600' } }
        }
      }
    });
  };

  /**
   * Create a line chart.
   */
  window.createLineChart = function (canvasId, labels, data, label, title) {
    var ctx = document.getElementById(canvasId);
    if (!ctx) return null;
    return new Chart(ctx.getContext('2d'), {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: label || 'Value',
          data: data,
          borderColor: '#28a745',
          backgroundColor: 'rgba(40,167,69,0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.3,
          pointRadius: 4,
          pointBackgroundColor: '#28a745'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          title:  { display: !!title, text: title, font: { size: 14, weight: '600' } }
        },
        scales: {
          y: { beginAtZero: true },
          x: {}
        }
      }
    });
  };

  /* ------------------------------------------
     AJAX Helper for Reports API
  ------------------------------------------ */
  /**
   * Fetch JSON from a given URL.
   * @param {string} url
   * @returns {Promise<Object>}
   */
  window.fetchChartData = function (url) {
    return fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.json();
      })
      .catch(function (err) {
        console.error('Error fetching chart data:', err);
        return null;
      });
  };

  /**
   * Load chart data from API and render.
   * @param {string} apiUrl
   * @param {string} canvasId
   * @param {string} chartType  - 'doughnut', 'bar', 'pie', 'line'
   * @param {string} title
   */
  window.loadAndRenderChart = function (apiUrl, canvasId, chartType, title) {
    fetchChartData(apiUrl).then(function (data) {
      if (!data) return;
      var labels = data.labels || [];
      var values = data.data   || data.values || [];
      var label  = data.label  || 'Value';

      switch (chartType) {
        case 'doughnut': createDoughnutChart(canvasId, labels, values, title); break;
        case 'bar':      createBarChart(canvasId, labels, values, label, title); break;
        case 'pie':      createPieChart(canvasId, labels, values, title); break;
        case 'line':     createLineChart(canvasId, labels, values, label, title); break;
      }
    });
  };

  /* ------------------------------------------
     CSV Download Trigger
  ------------------------------------------ */
  /**
   * Trigger a CSV download by navigating to the given URL.
   * @param {string} url
   */
  window.downloadCSV = function (url) {
    window.location.href = url;
  };

  /**
   * Attach click handlers to all elements with data-csv-url attribute.
   */
  document.querySelectorAll('[data-csv-url]').forEach(function (el) {
    el.addEventListener('click', function (e) {
      e.preventDefault();
      downloadCSV(el.getAttribute('data-csv-url'));
    });
  });

  /* ------------------------------------------
     Star Rating Selector
  ------------------------------------------ */
  document.querySelectorAll('.star-rating').forEach(function (container) {
    var hiddenInput = container.querySelector('input[type="hidden"]') ||
                      document.getElementById(container.dataset.input);
    var stars = container.querySelectorAll('.star');

    stars.forEach(function (star) {
      star.addEventListener('click', function () {
        var value = parseInt(star.dataset.value, 10);
        if (hiddenInput) hiddenInput.value = value;

        stars.forEach(function (s) {
          var sv = parseInt(s.dataset.value, 10);
          if (sv <= value) s.classList.add('selected');
          else             s.classList.remove('selected');
        });
      });

      star.addEventListener('mouseenter', function () {
        var value = parseInt(star.dataset.value, 10);
        stars.forEach(function (s) {
          var sv = parseInt(s.dataset.value, 10);
          s.style.color = sv <= value ? '#ffc107' : '#ddd';
        });
      });

      star.addEventListener('mouseleave', function () {
        stars.forEach(function (s) {
          s.style.color = s.classList.contains('selected') ? '#ffc107' : '#ddd';
        });
      });
    });
  });

  /* ------------------------------------------
     Active sidebar link highlighting
  ------------------------------------------ */
  var currentPath = window.location.pathname;
  document.querySelectorAll('.sidebar-nav .nav-link').forEach(function (link) {
    if (link.getAttribute('href') === currentPath) {
      link.classList.add('active');
    }
  });

})();

// Library Management System - Frontend Interactivity

document.addEventListener("DOMContentLoaded", function () {
  // 1. Auto-dismiss flash alerts after 5 seconds
  const alerts = document.querySelectorAll(".alert");
  alerts.forEach(function (alert) {
    setTimeout(function () {
      alert.style.transition = "opacity 0.5s ease";
      alert.style.opacity = "0";
      setTimeout(() => alert.remove(), 500);
    }, 5000);
  });

  // 2. Modal open/close helpers
  window.openModal = function (modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add("active");
    }
  };

  window.closeModal = function (modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove("active");
    }
  };

  // Close modal when clicking outside dialog content
  window.addEventListener("click", function (event) {
    if (event.target.classList.contains("modal")) {
      event.target.classList.remove("active");
    }
  });

  // 3. Client-side table live filter (for instant search)
  window.filterTable = function (inputId, tableId) {
    const input = document.getElementById(inputId);
    const filter = input.value.toLowerCase();
    const table = document.getElementById(tableId);
    if (!table) return;
    const trs = table.getElementsByTagName("tr");

    for (let i = 1; i < trs.length; i++) {
      let visible = false;
      const tds = trs[i].getElementsByTagName("td");
      for (let j = 0; j < tds.length; j++) {
        if (tds[j]) {
          const txtValue = tds[j].textContent || tds[j].innerText;
          if (txtValue.toLowerCase().indexOf(filter) > -1) {
            visible = true;
            break;
          }
        }
      }
      trs[i].style.display = visible ? "" : "none";
    }
  };

  // 4. SQL Playground Query loader
  window.loadSqlSample = function (queryText) {
    const textarea = document.getElementById("sql-query-input");
    if (textarea) {
      textarea.value = queryText.trim();
      textarea.focus();
    }
  };
});

// Retail Store Management System JavaScript
document.addEventListener("DOMContentLoaded", function () {
  console.log("Retail Store Dashboard initialized.");

  // Mobile Sidebar Toggle
  const sidebar = document.getElementById("sidebar");
  const sidebarToggle = document.getElementById("sidebarToggle");
  const sidebarBackdrop = document.getElementById("sidebarBackdrop");

  if (sidebarToggle && sidebar && sidebarBackdrop) {
    sidebarToggle.addEventListener("click", function () {
      sidebar.classList.toggle("show");
      sidebarBackdrop.classList.toggle("show");
    });

    sidebarBackdrop.addEventListener("click", function () {
      sidebar.classList.remove("show");
      sidebarBackdrop.classList.remove("show");
    });
  }

  // Live Clock in Top Navbar
  function updateLiveClock() {
    const clockElement = document.getElementById("liveClock");
    if (clockElement) {
      const now = new Date();
      const options = {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      };
      clockElement.textContent = now.toLocaleDateString("en-US", options);
    }
  }

  updateLiveClock();
  setInterval(updateLiveClock, 1000);

  // Initialize Bootstrap Tooltips
  const tooltipTriggerList = [].slice.call(
    document.querySelectorAll('[data-bs-toggle="tooltip"]')
  );
  tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl);
  });
});

// =============================================================================
// COLLEGE MANAGEMENT SYSTEM — CLIENT JAVASCRIPT
// =============================================================================

document.addEventListener('DOMContentLoaded', function () {
    // 1. Auto-dismiss flash alerts after 6 seconds
    const alerts = document.querySelectorAll('.alert-dismissible');
    alerts.forEach(function (alert) {
        setTimeout(function () {
            const bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        }, 6000);
    });

    // 2. Table quick client search
    const searchInputs = document.querySelectorAll('.table-search-input');
    searchInputs.forEach(function (input) {
        input.addEventListener('keyup', function () {
            const filter = input.value.toLowerCase();
            const targetTableId = input.getAttribute('data-target-table');
            const table = document.getElementById(targetTableId);
            if (!table) return;

            const rows = table.querySelectorAll('tbody tr');
            rows.forEach(function (row) {
                const text = row.textContent.toLowerCase();
                if (text.indexOf(filter) > -1) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        });
    });

    // 3. Confirm Delete helper
    window.confirmDelete = function (itemName) {
        return confirm(`Are you sure you want to delete this ${itemName}? This action will execute a real SQL DELETE command.`);
    };

    // 4. Copy SQL to clipboard
    window.copySql = function (elementId) {
        const sqlElement = document.getElementById(elementId);
        if (!sqlElement) return;
        const text = sqlElement.innerText || sqlElement.textContent;
        navigator.clipboard.writeText(text).then(function () {
            alert('SQL Query copied to clipboard! You can paste and run it directly in MySQL Workbench.');
        }).catch(function (err) {
            console.error('Failed to copy: ', err);
        });
    };
});

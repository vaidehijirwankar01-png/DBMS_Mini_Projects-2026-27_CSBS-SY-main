"use strict";

// =============================================
// CONFIGURATION
// =============================================

const API = "/api";

const state = {
    customers: [],
    employees: [],
    leads: [],
    products: [],
    deals: [],
    interactions: []
};

let currentEntity = null;
let editingId = null;
let notificationTimer;


// =============================================
// ENTITY CONFIGURATION
// =============================================

const config = {

    customers: {
        title: "Customers",
        id: "customer_id",
        table: "customerTable",
        fields: [
            { name: "customer_id", label: "Customer ID", type: "number", required: true },
            { name: "name", label: "Name", type: "text", required: true },
            { name: "email", label: "Email", type: "email" },
            { name: "phone", label: "Phone", type: "tel" },
            { name: "address", label: "Address", type: "text" },
            { name: "city", label: "City", type: "text" }
        ],
        columns: [
            { key: "customer_id", label: "ID" },
            { key: "name", label: "Name" },
            { key: "email", label: "Email" },
            { key: "phone", label: "Phone" },
            { key: "city", label: "City" }
        ]
    },

    employees: {
        title: "Employees",
        id: "employee_id",
        table: "employeeTable",
        fields: [
            { name: "employee_id", label: "Employee ID", type: "number", required: true },
            { name: "name", label: "Name", type: "text", required: true },
            { name: "email", label: "Email", type: "email" },
            { name: "phone", label: "Phone", type: "tel" },
            {
                name: "department",
                label: "Department",
                type: "select",
                options: [
                    "Sales",
                    "Marketing",
                    "Customer Support",
                    "Finance",
                    "IT"
                ]
            },
            {
                name: "designation",
                label: "Designation",
                type: "text"
            },
            { name: "joining_date", label: "Joining Date", type: "date" }
        ],
        columns: [
            { key: "employee_id", label: "ID" },
            { key: "name", label: "Name" },
            { key: "email", label: "Email" },
            { key: "department", label: "Department" },
            { key: "designation", label: "Designation" }
        ]
    },

    leads: {
        title: "Leads",
        id: "lead_id",
        table: "leadTable",
        fields: [
            { name: "lead_id", label: "Lead ID", type: "number", required: true },
            { name: "customer_id", label: "Customer ID", type: "number", required: true },
            { name: "employee_id", label: "Employee ID", type: "number", required: true },
            { name: "source", label: "Source", type: "text", required: true },
            {
                name: "status",
                label: "Status",
                type: "select",
                required: true,
                options: [
                    "New",
                    "Contacted",
                    "Qualified",
                    "Proposal",
                    "Negotiation",
                    "Converted",
                    "Lost"
                ]
            },
            { name: "lead_date", label: "Lead Date", type: "date", required: true }
        ],
        columns: [
            { key: "lead_id", label: "ID" },
            { key: "customer_id", label: "Customer ID" },
            { key: "employee_id", label: "Employee ID" },
            { key: "source", label: "Source" },
            { key: "status", label: "Status" },
            { key: "lead_date", label: "Date" }
        ]
    },

    products: {
        title: "Products",
        id: "product_id",
        table: "productTable",
        fields: [
            { name: "product_id", label: "Product ID", type: "number", required: true },
            { name: "product_name", label: "Product Name", type: "text", required: true },
            { name: "category", label: "Category", type: "text", required: true },
            { name: "price", label: "Price", type: "number", required: true, min: 0, step: "0.01" },
            { name: "stock", label: "Stock", type: "number", required: true, min: 0, step: "1" }
        ],
        columns: [
            { key: "product_id", label: "ID" },
            { key: "product_name", label: "Product" },
            { key: "category", label: "Category" },
            { key: "price", label: "Price" },
            { key: "stock", label: "Stock" }
        ]
    },

    deals: {
        title: "Deals",
        id: "deal_id",
        table: "dealTable",
        fields: [
            { name: "deal_id", label: "Deal ID", type: "number", required: true },
            { name: "customer_id", label: "Customer ID", type: "number", required: true },
            { name: "employee_id", label: "Employee ID", type: "number", required: true },
            { name: "product_id", label: "Product ID", type: "number", required: true },
            { name: "deal_amount", label: "Deal Amount", type: "number", required: true, min: 0, step: "0.01" },
            {
                name: "stage",
                label: "Stage",
                type: "select",
                required: true,
                options: [
                    "Prospecting",
                    "Qualified",
                    "Proposal",
                    "Negotiation",
                    "Closed Won",
                    "Closed Lost"
                ]
            },
            { name: "deal_date", label: "Deal Date", type: "date", required: true }
        ],
        columns: [
            { key: "deal_id", label: "ID" },
            { key: "customer_id", label: "Customer ID" },
            { key: "employee_id", label: "Employee ID" },
            { key: "product_id", label: "Product ID" },
            { key: "deal_amount", label: "Amount" },
            { key: "stage", label: "Stage" },
            { key: "deal_date", label: "Date" }
        ]
    },

    interactions: {
        title: "Interactions",
        id: "interaction_id",
        table: "interactionTable",
        fields: [
            { name: "interaction_id", label: "Interaction ID", type: "number", required: true },
            { name: "customer_id", label: "Customer ID", type: "number", required: true },
            { name: "employee_id", label: "Employee ID", type: "number", required: true },
            {
                name: "interaction_type",
                label: "Interaction Type",
                type: "select",
                required: true,
                options: ["Call", "Email", "Meeting", "Message"]
            },
            { name: "interaction_date", label: "Date", type: "date", required: true },
            { name: "notes", label: "Notes", type: "textarea" }
        ],
        columns: [
            { key: "interaction_id", label: "ID" },
            { key: "customer_id", label: "Customer ID" },
            { key: "employee_id", label: "Employee ID" },
            { key: "interaction_type", label: "Type" },
            { key: "interaction_date", label: "Date" },
            { key: "notes", label: "Notes" }
        ]
    }

};


// =============================================
// HELPER: API REQUEST
// =============================================

async function apiRequest(url, options = {}) {

    const response = await fetch(url, {
        ...options,
        headers: {
            ...(options.body ? { "Content-Type": "application/json" } : {}),
            ...options.headers
        }
    });

    const contentType = response.headers.get("content-type") || "";

    const result = contentType.includes("application/json")
        ? await response.json()
        : await response.text();

    if (!response.ok) {

        const message =
            typeof result === "object"
                ? result.error || result.message
                : result;

        throw new Error(message || `Request failed: ${response.status}`);
    }

    return result;
}


// =============================================
// NOTIFICATION
// =============================================

function notify(message, type = "success") {

    const box = document.getElementById("notification");

    clearTimeout(notificationTimer);

    box.textContent = message;
    box.className = `notification show ${type}`;

    notificationTimer = setTimeout(() => {
        box.className = "notification";
    }, 4000);
}


// =============================================
// PAGE NAVIGATION
// =============================================

function showPage(pageName) {

    document.querySelectorAll(".page").forEach(page => {
        page.classList.toggle("hidden", page.id !== pageName);
    });

    document.querySelectorAll(".nav-btn").forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.page === pageName
        );
    });

    document.getElementById("pageTitle").textContent =
        pageName === "dashboard"
            ? "Dashboard"
            : config[pageName].title;

    if (pageName === "dashboard") {
        loadDashboard();
    } else {
        loadEntity(pageName);
    }
}


// =============================================
// FORMAT VALUES
// =============================================

function formatValue(value, key) {

    if (value === null || value === undefined || value === "") {
        return "—";
    }

    if (key === "price" || key === "deal_amount") {
        return "₹" + Number(value).toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    return String(value);
}


// =============================================
// RENDER TABLE
// =============================================

function renderTable(entity) {

    const settings = config[entity];

    const tbody = document.getElementById(settings.table);

    tbody.replaceChildren();

    const records = state[entity];

    if (!records.length) {

        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = settings.columns.length + 1;
        cell.className = "empty-cell";
        cell.textContent = "No records found.";

        row.appendChild(cell);
        tbody.appendChild(row);

        return;
    }

    records.forEach(record => {

        const row = document.createElement("tr");

        settings.columns.forEach(column => {

            const cell = document.createElement("td");

            cell.textContent = formatValue(
                record[column.key],
                column.key
            );

            row.appendChild(cell);
        });

        const actions = document.createElement("td");

        const editButton = document.createElement("button");

        editButton.type = "button";
        editButton.className = "edit-btn";
        editButton.textContent = "Edit";

        editButton.addEventListener("click", () => {
            openForm(entity, record);
        });

        const deleteButton = document.createElement("button");

        deleteButton.type = "button";
        deleteButton.className = "delete-btn";
        deleteButton.textContent = "Delete";

        deleteButton.addEventListener("click", () => {
            deleteRecord(entity, record[settings.id]);
        });

        actions.append(editButton, deleteButton);
        row.appendChild(actions);

        tbody.appendChild(row);
    });
}


// =============================================
// LOAD RECORDS
// =============================================

async function loadEntity(entity) {

    try {

        state[entity] = await apiRequest(`${API}/${entity}`);

        renderTable(entity);

        if (entity === "customers") {
            applyCustomerSearch();
        }

    } catch (error) {

        console.error(error);

        notify(
            `Could not load ${config[entity]?.title || entity}: ${error.message}`,
            "error"
        );
    }
}


// =============================================
// LOAD DASHBOARD
// =============================================

async function loadDashboard() {

    try {

        const entities = [
            "customers",
            "employees",
            "leads",
            "deals"
        ];

        const results = await Promise.all(
            entities.map(entity =>
                apiRequest(`${API}/${entity}`)
            )
        );

        const [
            customers,
            employees,
            leads,
            deals
        ] = results;

        state.customers = customers;
        state.employees = employees;
        state.leads = leads;
        state.deals = deals;

        document.getElementById("customerCount").textContent =
            customers.length;

        document.getElementById("employeeCount").textContent =
            employees.length;

        document.getElementById("leadCount").textContent =
            leads.length;

        const totalSales = deals
            .filter(deal => deal.stage === "Closed Won")
            .reduce(
                (sum, deal) => sum + Number(deal.deal_amount || 0),
                0
            );

        document.getElementById("salesAmount").textContent =
            "₹" + totalSales.toLocaleString("en-IN");

        renderRecentDeals(deals);

    } catch (error) {

        console.error(error);

        notify(
            `Could not load dashboard: ${error.message}`,
            "error"
        );
    }
}


// =============================================
// RECENT DEALS
// =============================================

function renderRecentDeals(deals) {

    const tbody = document.getElementById("recentDeals");

    tbody.replaceChildren();

    const recent = [...deals]
        .sort((a, b) =>
            String(b.deal_date).localeCompare(String(a.deal_date))
        )
        .slice(0, 5);

    if (!recent.length) {

        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 5;
        cell.className = "empty-cell";
        cell.textContent = "No deals available.";

        row.appendChild(cell);
        tbody.appendChild(row);

        return;
    }

    recent.forEach(deal => {

        const row = document.createElement("tr");

        const values = [
            deal.deal_id,
            deal.customer_id,
            formatValue(deal.deal_amount, "deal_amount"),
            deal.stage,
            deal.deal_date
        ];

        values.forEach(value => {

            const cell = document.createElement("td");

            cell.textContent = value ?? "—";

            row.appendChild(cell);
        });

        tbody.appendChild(row);
    });
}


// =============================================
// CUSTOMER SEARCH
// =============================================

function applyCustomerSearch() {

    const search = document
        .getElementById("customerSearch")
        .value
        .trim()
        .toLowerCase();

    const filtered = state.customers.filter(customer => {

        const searchable = [
            customer.name,
            customer.email,
            customer.phone,
            customer.city,
            customer.address
        ];

        return searchable.some(value =>
            String(value ?? "")
                .toLowerCase()
                .includes(search)
        );
    });

    renderCustomCustomerTable(filtered);
}


function renderCustomCustomerTable(records) {

    const tbody = document.getElementById("customerTable");

    tbody.replaceChildren();

    if (!records.length) {

        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 6;
        cell.className = "empty-cell";
        cell.textContent = "No matching customers.";

        row.appendChild(cell);
        tbody.appendChild(row);

        return;
    }

    records.forEach(customer => {

        const row = document.createElement("tr");

        [
            customer.customer_id,
            customer.name,
            customer.email,
            customer.phone,
            customer.city
        ].forEach(value => {

            const cell = document.createElement("td");

            cell.textContent = value ?? "—";

            row.appendChild(cell);
        });

        const actions = document.createElement("td");

        const editButton = document.createElement("button");

        editButton.type = "button";
        editButton.className = "edit-btn";
        editButton.textContent = "Edit";

        editButton.addEventListener("click", () => {
            openForm("customers", customer);
        });

        const deleteButton = document.createElement("button");

        deleteButton.type = "button";
        deleteButton.className = "delete-btn";
        deleteButton.textContent = "Delete";

        deleteButton.addEventListener("click", () => {
            deleteRecord("customers", customer.customer_id);
        });

        actions.append(editButton, deleteButton);

        row.appendChild(actions);

        tbody.appendChild(row);
    });
}


// =============================================
// OPEN ADD / EDIT FORM
// =============================================

function openForm(entity, record = null) {

    currentEntity = entity;

    const settings = config[entity];

    editingId = record
        ? record[settings.id]
        : null;

    document.getElementById("formTitle").textContent =
        `${record ? "Edit" : "Add"} ${settings.title.slice(0, -1)}`;

    const form = document.getElementById("formFields");

    form.replaceChildren();

    settings.fields.forEach(field => {

        const group = document.createElement("div");

        group.className = "form-group";

        if (field.type === "textarea") {
            group.classList.add("full-width");
        }

        const label = document.createElement("label");

        label.htmlFor = `field-${field.name}`;
        label.textContent = field.label;

        let input;

        if (field.type === "select") {

            input = document.createElement("select");

            const placeholder = document.createElement("option");

            placeholder.value = "";
            placeholder.textContent = "Select an option";

            input.appendChild(placeholder);

            field.options.forEach(optionValue => {

                const option = document.createElement("option");

                option.value = optionValue;
                option.textContent = optionValue;

                input.appendChild(option);
            });

        } else if (field.type === "textarea") {

            input = document.createElement("textarea");

        } else {

            input = document.createElement("input");
            input.type = field.type;
        }

        input.id = `field-${field.name}`;
        input.name = field.name;

        input.required = Boolean(field.required);

        if (field.min !== undefined) {
            input.min = field.min;
        }

        if (field.step !== undefined) {
            input.step = field.step;
        }

        if (record && record[field.name] != null) {
            input.value = record[field.name];
        }

        // The primary key is required when creating a record,
        // but it cannot be changed while editing.
        if (record && field.name === settings.id) {
            input.readOnly = true;
        }

        group.append(label, input);

        form.appendChild(group);
    });

    document.getElementById("recordDialog").showModal();
}


// =============================================
// CLOSE FORM
// =============================================

function closeForm() {

    document.getElementById("recordDialog").close();

    document.getElementById("recordForm").reset();

    currentEntity = null;
    editingId = null;
}


// =============================================
// FORM SUBMISSION: INSERT / UPDATE
// =============================================

async function submitRecord(event) {

    event.preventDefault();

    if (!currentEntity) {
        return;
    }

    const settings = config[currentEntity];

    const form = document.getElementById("recordForm");

    const formData = new FormData(form);

    const data = {};

    settings.fields.forEach(field => {

        const input = form.elements[field.name];

        let value = formData.get(field.name);

        if (value === "") {
            value = null;
        }

        if (value !== null && field.type === "number") {
            value = Number(value);
        }

        data[field.name] = value;
    });

    // A blank optional field is sent as NULL.
    // Required fields are validated by the browser.

    const isEditing = editingId !== null;

    const url = isEditing
        ? `${API}/${currentEntity}/${editingId}`
        : `${API}/${currentEntity}`;

    const method = isEditing ? "PUT" : "POST";

    const saveButton = document.getElementById("saveBtn");

    saveButton.disabled = true;
    saveButton.textContent = "Saving...";

    try {

        await apiRequest(url, {
            method,
            body: JSON.stringify(data)
        });

        closeForm();

        await loadEntity(currentEntity);

        await loadDashboard();

        notify(
            `${settings.title.slice(0, -1)} ${isEditing ? "updated" : "added"} successfully.`
        );

    } catch (error) {

        console.error(error);

        notify(error.message, "error");

    } finally {

        saveButton.disabled = false;
        saveButton.textContent = "Save Record";
    }
}


// =============================================
// DELETE RECORD
// =============================================

async function deleteRecord(entity, id) {

    const settings = config[entity];

    const confirmed = confirm(
        `Are you sure you want to delete this record from ${settings.title}?`
    );

    if (!confirmed) {
        return;
    }

    try {

        await apiRequest(
            `${API}/${entity}/${encodeURIComponent(id)}`,
            {
                method: "DELETE"
            }
        );

        await loadEntity(entity);

        await loadDashboard();

        notify("Record deleted successfully.");

    } catch (error) {

        console.error(error);

        notify(
            `Could not delete record: ${error.message}`,
            "error"
        );
    }
}


// =============================================
// EVENT LISTENERS
// =============================================

document.querySelectorAll(".nav-btn").forEach(button => {

    button.addEventListener("click", () => {
        showPage(button.dataset.page);
    });

});


document.querySelectorAll("[data-go]").forEach(button => {

    button.addEventListener("click", () => {
        showPage(button.dataset.go);
    });

});


document.getElementById("addCustomerBtn").addEventListener(
    "click",
    () => openForm("customers")
);

document.getElementById("addEmployeeBtn").addEventListener(
    "click",
    () => openForm("employees")
);

document.getElementById("addLeadBtn").addEventListener(
    "click",
    () => openForm("leads")
);

document.getElementById("addProductBtn").addEventListener(
    "click",
    () => openForm("products")
);

document.getElementById("addDealBtn").addEventListener(
    "click",
    () => openForm("deals")
);

document.getElementById("addInteractionBtn").addEventListener(
    "click",
    () => openForm("interactions")
);


document.getElementById("closeDialog").addEventListener(
    "click",
    closeForm
);

document.getElementById("cancelBtn").addEventListener(
    "click",
    closeForm
);

document.getElementById("recordForm").addEventListener(
    "submit",
    submitRecord
);

document.getElementById("customerSearch").addEventListener(
    "input",
    applyCustomerSearch
);


// =============================================
// INITIALIZE
// =============================================

document.addEventListener("DOMContentLoaded", () => {

    loadDashboard();

});
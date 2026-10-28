const express = require("express");
const mysql = require("mysql2");
const path = require("path");

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, ".")));

// =====================================
// MYSQL CONNECTION
// =====================================

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "password", // Enter your MySQL password if required
    database: "miniproject",
    port: 3306
});

db.connect((err) => {
    if (err) {
        console.error("MySQL connection failed:", err.message);
        return;
    }

    console.log("Connected to local MySQL!");
});


// =====================================
// ALLOWED TABLES AND COLUMNS
// =====================================

const tables = {
    customers: {
        name: "Customers",
        id: "customer_id",
        columns: [
            "customer_id",
            "name",
            "email",
            "phone",
            "address",
            "city"
        ]
    },

    employees: {
        name: "Employees",
        id: "employee_id",
        columns: [
            "employee_id",
            "name",
            "email",
            "phone",
            "department",
            "designation",
            "joining_date"
        ]
    },

    leads: {
        name: "Leads",
        id: "lead_id",
        columns: [
            "lead_id",
            "customer_id",
            "employee_id",
            "source",
            "status",
            "lead_date"
        ]
    },

    products: {
        name: "Products",
        id: "product_id",
        columns: [
            "product_id",
            "product_name",
            "category",
            "price",
            "stock"
        ]
    },

    deals: {
        name: "Deals",
        id: "deal_id",
        columns: [
            "deal_id",
            "customer_id",
            "employee_id",
            "product_id",
            "deal_amount",
            "stage",
            "deal_date"
        ]
    },

    interactions: {
        name: "Interactions",
        id: "interaction_id",
        columns: [
            "interaction_id",
            "customer_id",
            "employee_id",
            "interaction_type",
            "interaction_date",
            "notes"
        ]
    }
};


// =====================================
// GET ALL RECORDS
// Example: GET /api/customers
// =====================================

app.get("/api/:table", (req, res) => {

    const config = tables[req.params.table];

    if (!config) {
        return res.status(404).json({
            error: "Table not found"
        });
    }

    const sql = `SELECT * FROM ${config.name}`;

    db.query(sql, (err, results) => {

        if (err) {
            return res.status(500).json({
                error: err.message
            });
        }

        res.json(results);
    });
});


// =====================================
// ADD RECORD
// Example: POST /api/customers
// =====================================

app.post("/api/:table", (req, res) => {

    const config = tables[req.params.table];

    if (!config) {
        return res.status(404).json({
            error: "Table not found"
        });
    }

    const data = req.body;

    const columns = Object.keys(data);

    if (
        columns.length === 0 ||
        columns.some(column => !config.columns.includes(column))
    ) {
        return res.status(400).json({
            error: "Invalid or empty fields"
        });
    }

    const values = columns.map(column => data[column]);

    const placeholders = columns.map(() => "?").join(", ");

    const sql = `
        INSERT INTO ${config.name}
        (${columns.join(", ")})
        VALUES (${placeholders})
    `;

    db.query(sql, values, (err, result) => {

        if (err) {
            return res.status(400).json({
                error: err.message
            });
        }

        res.status(201).json({
            message: "Record added successfully",
            id: data[config.id] ?? result.insertId
        });
    });
});


// =====================================
// UPDATE RECORD
// Example: PUT /api/customers/1
// =====================================

app.put("/api/:table/:id", (req, res) => {

    const config = tables[req.params.table];

    if (!config) {
        return res.status(404).json({
            error: "Table not found"
        });
    }

    const data = req.body;

    const columns = Object.keys(data).filter(
        column =>
            column !== config.id &&
            config.columns.includes(column)
    );

    if (
        columns.length === 0 ||
        Object.keys(data).some(
            column => !config.columns.includes(column)
        )
    ) {
        return res.status(400).json({
            error: "Invalid or empty fields"
        });
    }

    const values = columns.map(column => data[column]);

    const assignments = columns
        .map(column => `${column} = ?`)
        .join(", ");

    values.push(req.params.id);

    const sql = `
        UPDATE ${config.name}
        SET ${assignments}
        WHERE ${config.id} = ?
    `;

    db.query(sql, values, (err, result) => {

        if (err) {
            return res.status(400).json({
                error: err.message
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                error: "Record not found or no changes made"
            });
        }

        res.json({
            message: "Record updated successfully"
        });
    });
});


// =====================================
// DELETE RECORD
// Example: DELETE /api/customers/1
// =====================================

app.delete("/api/:table/:id", (req, res) => {

    const config = tables[req.params.table];

    if (!config) {
        return res.status(404).json({
            error: "Table not found"
        });
    }

    const sql = `
        DELETE FROM ${config.name}
        WHERE ${config.id} = ?
    `;

    db.query(sql, [req.params.id], (err, result) => {

        if (err) {
            return res.status(400).json({
                error: err.message
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                error: "Record not found"
            });
        }

        res.json({
            message: "Record deleted successfully"
        });
    });
});


// =====================================
// START SERVER
// =====================================

app.listen(3000, () => {
    console.log("CRM running at http://localhost:3000");
});
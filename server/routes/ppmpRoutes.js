const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// GET all PPMP items
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM ppmp_items ORDER BY created_at DESC'
        );
        res.json(result.rows);
    } catch (err) {
        console.error("PPMP Fetch Error:", err.message);
        res.status(500).json({ message: "Could not fetch budget items" });
    }
});

// ADD new PPMP item
router.post('/add', async (req, res) => {
    try {
        const { org_id, item_description, allocated_budget, category } = req.body;

        // Logic: On creation, remaining_budget is equal to the full allocated_budget
        const remaining_budget = allocated_budget;

        const newItem = await pool.query(
            `INSERT INTO ppmp_items (org_id, item_description, category, allocated_budget, remaining_budget) 
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [org_id, item_description, category, allocated_budget, remaining_budget]
        );

        res.json(newItem.rows[0]);
    } catch (err) {
        console.error("PPMP Add Error:", err.message);
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
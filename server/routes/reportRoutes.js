const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// GET Financial Position Summary
router.get('/summary', async (req, res) => {
    try {
        const { org_id } = req.query;

        // 1. Total Inflows (Categorized)
        const inflows = await pool.query(
            `SELECT category, SUM(amount) as total 
             FROM transactions 
             WHERE org_id = $1 AND type = 'INFLOW' 
             GROUP BY category`,
            [org_id]
        );

        // 2. Total Outflows
        const outflows = await pool.query(
            `SELECT SUM(amount) as total 
             FROM transactions 
             WHERE org_id = $1 AND type = 'OUTFLOW'`,
            [org_id]
        );

        // 3. Current Balance (from organizations table to be accurate)
        const balance = await pool.query(
            'SELECT current_balance FROM organizations WHERE id = $1',
            [org_id]
        );

        res.json({
            inflows: inflows.rows,
            total_outflows: outflows.rows[0]?.total || 0,
            current_balance: balance.rows[0]?.current_balance || 0
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// GET PPMP Utilization (REMOVED - Returning empty array for compatibility if needed, or just Fund Summary)
router.get('/utilization', async (req, res) => {
    // Return empty array as PPMP is deprecated
    res.json([]);
});

// GET All Transactions for PDF
router.get('/all-transactions', async (req, res) => {
    try {
        const { org_id } = req.query;
        const result = await pool.query(
            `SELECT t.*, f.source_name 
             FROM transactions t
             LEFT JOIN funds f ON t.fund_id = f.id
             WHERE t.org_id = $1 
             ORDER BY t.transaction_date ASC`, // ASC for report usually
            [org_id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;

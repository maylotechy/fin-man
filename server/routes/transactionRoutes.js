const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const multer = require('multer');
const { storage } = require('../config/cloudinary');
const upload = multer({ storage });

// GET all transactions
// GET all transactions with Fund Name
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT t.*, f.source_name 
            FROM transactions t
            LEFT JOIN funds f ON t.fund_id = f.id
            ORDER BY t.transaction_date DESC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// GET Funds Balances
router.get('/funds/:org_id', async (req, res) => {
    try {
        const { org_id } = req.params;
        const result = await pool.query('SELECT * FROM funds WHERE org_id = $1 ORDER BY id', [org_id]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// POST a new transaction with Fund Logic and Deficit Handling
router.post('/add', upload.single('image'), async (req, res) => {
    const client = await pool.connect();
    try {
        const { org_id, type, category, amount, description, event_name, document_type, fund_id, confirmed_deficit, payee_merchant, evidence_number, semester, school_year, transaction_date, duration, activity_approval_date, resolution_number } = req.body;
        const attachment_url = req.file ? req.file.path : null;

        // Sanitize Dates (Empty String -> NULL) to prevent "invalid input syntax for type date"
        const finalTransactionDate = transaction_date === '' ? null : transaction_date;
        const finalApprovalDate = activity_approval_date === '' ? null : activity_approval_date;

        await client.query('BEGIN');

        // Ensure fund_id is provided
        if (!fund_id) {
            throw new Error("Please select a valid Fund Source.");
        }

        // 1. Check Fund (Total Balance needed for update)
        const fundCheck = await client.query('SELECT balance, source_name FROM funds WHERE id = $1', [fund_id]);
        if (fundCheck.rows.length === 0) {
            throw new Error("Selected Fund not found.");
        }
        const fund = fundCheck.rows[0];
        const globalBalance = parseFloat(fund.balance);

        // 2. Check Semester Balance (Dynamic Calculation for Validation)
        const semStats = await client.query(
            `SELECT type, COALESCE(SUM(amount), 0) as total 
             FROM transactions 
             WHERE fund_id = $1 AND semester = $2 AND school_year = $3 
             GROUP BY type`,
            [fund_id, semester, school_year]
        );

        let semInflow = 0;
        let semOutflow = 0;
        semStats.rows.forEach(row => {
            if (row.type === 'INFLOW') semInflow = parseFloat(row.total);
            if (row.type === 'OUTFLOW') semOutflow = parseFloat(row.total);
        });
        const currentSemBalance = semInflow - semOutflow;

        const txnAmount = parseFloat(amount);
        let newBalance = globalBalance;

        if (type === 'OUTFLOW') {
            // Check against SEMESTER Balance as requested by user
            if (currentSemBalance < txnAmount) {
                // If deficit not already confirmed, return specific 409 error
                if (!confirmed_deficit || confirmed_deficit === 'false') {
                    await client.query('ROLLBACK');
                    return res.status(409).json({
                        success: false,
                        requires_confirmation: true,
                        message: `Insufficient funds in ${fund.source_name} for this Semester. Current Sem Balance: ₱${currentSemBalance.toLocaleString()}. Transaction: ₱${txnAmount.toLocaleString()}. This will result in a negative semester balance.`
                    });
                }
            }
            newBalance = globalBalance - txnAmount;
        } else { // INFLOW
            newBalance = globalBalance + txnAmount;
        }

        // 3. Update Fund Balance (Global)
        await client.query('UPDATE funds SET balance = $1 WHERE id = $2', [newBalance, fund_id]);

        // 4. Insert Transaction
        const newTransaction = await client.query(
            `INSERT INTO transactions (org_id, type, category, amount, description, event_name, document_type, attachment_url, fund_id, payee_merchant, evidence_number, semester, school_year, transaction_date, duration, activity_approval_date, resolution_number) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, COALESCE($14, CURRENT_TIMESTAMP), $15, $16, $17) RETURNING *`,
            [org_id, type, category, amount, description, event_name, document_type, attachment_url, fund_id, payee_merchant, evidence_number, semester, school_year, finalTransactionDate, duration, finalApprovalDate, resolution_number]
        );

        // 5. Update Org General Balance
        const balanceAdjustment = type === 'INFLOW' ? txnAmount : -txnAmount;
        await client.query(
            'UPDATE organizations SET current_balance = current_balance + $1 WHERE id = $2',
            [balanceAdjustment, org_id]
        );

        await client.query('COMMIT');
        res.json(newTransaction.rows[0]);

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Server Error:", err.message);

        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: "File is too large. Max 5MB allowed." });
        }

        res.status(400).json({
            success: false,
            message: err.message
        });
    } finally {
        client.release();
    }
});

module.exports = router;
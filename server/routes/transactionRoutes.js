const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const multer = require('multer');
const { storage } = require('../config/cloudinary');
const upload = multer({ storage });

// GET all transactions
// GET all transactions with Fund Name
// GET all transactions (Filtered by Org ID)
router.get('/', async (req, res) => {
    try {
        const { org_id } = req.query; // Ensure org_id is passed as query param
        if (!org_id) {
            return res.status(400).json({ message: "Organization ID is required" });
        }

        const result = await pool.query(`
            SELECT t.*, f.source_name 
            FROM transactions t
            LEFT JOIN funds f ON t.fund_id = f.id
            WHERE t.org_id = $1
            ORDER BY t.transaction_date DESC
        `, [org_id]);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// GET Funds Balances (Filtered by Semester + Auto-Seeding)
router.get('/funds/:org_id', async (req, res) => {
    const client = await pool.connect();
    try {
        const { org_id } = req.params;
        const { semester, school_year } = req.query;

        if (!semester || !school_year) {
            return res.status(400).json({ message: "Semester and School Year are required." });
        }

        await client.query('BEGIN');

        // 1. Try to fetch funds for this specific period
        let result = await client.query(
            'SELECT * FROM funds WHERE org_id = $1 AND semester = $2 AND school_year = $3 ORDER BY id',
            [org_id, semester, school_year]
        );

        // 2. If no funds exist for this period, AUTO-SEED from a template or default list
        if (result.rows.length === 0) {
            // Check if ANY funds exist for this org (to decide if we copy previous or insert defaults)
            // For simplicity, we'll just insert the standard defaults if missing. 
            // In a more complex app, we might copy balances or structure from previous sem.
            const defaultFunds = [
                'Allocation from University Admin',
                'Membership Fees',
                'Voluntary Contribution',
                'Donations',
                'Sponsorship',
                'IGP Proceeds'
            ];

            for (const source of defaultFunds) {
                await client.query(
                    `INSERT INTO funds (org_id, source_name, balance, semester, school_year) 
                     VALUES ($1, $2, 0.00, $3, $4)
                     ON CONFLICT (org_id, source_name, semester, school_year) DO NOTHING`,
                    [org_id, source, semester, school_year]
                );
            }

            // Fetch again after seeding
            result = await client.query(
                'SELECT * FROM funds WHERE org_id = $1 AND semester = $2 AND school_year = $3 ORDER BY id',
                [org_id, semester, school_year]
            );
        }

        await client.query('COMMIT');
        res.json(result.rows);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).send('Server Error');
    } finally {
        client.release();
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

        // 1. Check Fund (Now strictly specific to the semester because fund_id is unique per sem record)
        const fundCheck = await client.query('SELECT balance, source_name, semester, school_year FROM funds WHERE id = $1', [fund_id]);
        if (fundCheck.rows.length === 0) {
            throw new Error("Selected Fund not found.");
        }
        const fund = fundCheck.rows[0];

        // Verification: Ensure transaction semester matches fund semester
        if (fund.semester !== semester || fund.school_year !== school_year) {
            throw new Error(`Fund mismatch! You are trying to record a ${semester} transaction against a ${fund.semester} fund record.`);
        }

        const currentBalance = parseFloat(fund.balance);
        // Sanitize amount: remove commas if present, then parse
        const sanitizedAmount = amount.toString().replace(/,/g, '');
        const txnAmount = parseFloat(sanitizedAmount);
        let newBalance = currentBalance;

        console.log(`[DEBUG] Adding Transaction: FundID=${fund_id} Type=${type} Amount=${txnAmount} CurrBal=${currentBalance} Sem=${semester}`);

        if (type === 'OUTFLOW') {
            // DIRECT CHECK against the fund record's balance (which is now semester-specific)
            if (currentBalance < txnAmount) {
                // If deficit not already confirmed, return specific 409 error
                if (!confirmed_deficit || confirmed_deficit === 'false') {
                    await client.query('ROLLBACK');
                    return res.status(409).json({
                        success: false,
                        requires_confirmation: true,
                        message: `Insufficient funds in ${fund.source_name}. Current Balance: ₱${currentBalance.toLocaleString()}. Transaction: ₱${txnAmount.toLocaleString()}.`
                    });
                }
            }
            newBalance = currentBalance - txnAmount;
        } else { // INFLOW
            newBalance = currentBalance + txnAmount;
        }

        console.log(`[DEBUG] New Balance Calculated: ${newBalance}`);

        // 2. Update Fund Balance
        await client.query('UPDATE funds SET balance = $1 WHERE id = $2', [newBalance, fund_id]);

        // 3. Insert Transaction
        const newTransaction = await client.query(
            `INSERT INTO transactions (org_id, type, category, amount, description, event_name, document_type, attachment_url, fund_id, payee_merchant, evidence_number, semester, school_year, transaction_date, duration, activity_approval_date, resolution_number) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, COALESCE($14, CURRENT_TIMESTAMP), $15, $16, $17) RETURNING *`,
            [org_id, type, category, amount, description, event_name, document_type, attachment_url, fund_id, payee_merchant, evidence_number, semester, school_year, finalTransactionDate, duration, finalApprovalDate, resolution_number]
        );

        // 4. Update Org General Balance (Overall cash on hand, unrelated to semester logic? Or should only update if we tracked total cash?)
        // For now, we will still update the generic org balance as a "Total Lifetime Balance".
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
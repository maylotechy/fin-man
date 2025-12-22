const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// GET Org Settings
router.get('/:org_id', async (req, res) => {
    try {
        const { org_id } = req.params;
        const result = await pool.query('SELECT current_semester, current_school_year FROM organizations WHERE id = $1', [org_id]);
        if (result.rows.length === 0) return res.status(404).json({ message: 'Org not found' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// UPDATE Org Settings
router.put('/:org_id', async (req, res) => {
    try {
        const { org_id } = req.params;
        const { current_semester, current_school_year } = req.body;

        await pool.query(
            'UPDATE organizations SET current_semester = $1, current_school_year = $2 WHERE id = $3',
            [current_semester, current_school_year, org_id]
        );
        res.json({ message: 'Settings updated' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;

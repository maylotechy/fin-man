const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// GET Org Settings
router.get('/:org_id', async (req, res) => {
    try {
        const { org_id } = req.params;
        const result = await pool.query(`
            SELECT o.current_semester, o.current_school_year, o.organization_type, 
                   oo.treasurer_name, oo.auditor_name, oo.president_name, oo.adviser_name, oo.adviser2_name 
            FROM organizations o 
            LEFT JOIN organization_officers oo ON o.id = oo.org_id 
            WHERE o.id = $1`,
            [org_id]
        );
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
        const { current_semester, current_school_year, organization_type, treasurer_name, auditor_name, president_name, adviser_name, adviser2_name } = req.body;

        await pool.query(
            'UPDATE organizations SET current_semester = $1, current_school_year = $2, organization_type = $3 WHERE id = $4',
            [current_semester, current_school_year, organization_type, org_id]
        );

        // Upsert Officers
        await pool.query(`
            INSERT INTO organization_officers (org_id, treasurer_name, auditor_name, president_name, adviser_name, adviser2_name)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (org_id) 
            DO UPDATE SET 
                treasurer_name = EXCLUDED.treasurer_name,
                auditor_name = EXCLUDED.auditor_name,
                president_name = EXCLUDED.president_name,
                adviser_name = EXCLUDED.adviser_name,
                adviser2_name = EXCLUDED.adviser2_name
        `, [org_id, treasurer_name, auditor_name, president_name, adviser_name, adviser2_name]);

        res.json({ message: 'Settings updated' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;

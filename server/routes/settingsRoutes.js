const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// GET Org Settings
router.get('/:org_id', async (req, res) => {
    try {
        const { org_id } = req.params;
        const { semester, school_year } = req.query;
        console.log(`[GET Settings] Org: ${org_id}, Sem: ${semester}, SY: ${school_year}`);

        let query = `
            SELECT o.full_name, o.current_semester, o.current_school_year, o.organization_type,
                   oo.treasurer_name, oo.auditor_name, oo.president_name, oo.adviser_name, oo.adviser2_name
            FROM organizations o
            LEFT JOIN organization_officers oo ON o.id = oo.org_id
        `;

        const params = [org_id];

        if (semester && school_year) {
            query += ` AND oo.semester = $2 AND oo.school_year = $3`;
            params.push(semester, school_year);
        }

        query += ` WHERE o.id = $1`;

        const result = await pool.query(query, params);
        console.log(`[GET Result] Rows found: ${result.rows.length}`);
        if (result.rows.length > 0) console.log(`[GET Data] Officers found: ${result.rows[0].treasurer_name ? 'Yes' : 'No'}`);

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
        console.log(`[PUT Settings] Org: ${org_id}, Updating to Sem: ${current_semester}, SY: ${current_school_year}`);

        await pool.query(
            'UPDATE organizations SET current_semester = $1, current_school_year = $2, organization_type = $3 WHERE id = $4',
            [current_semester, current_school_year, organization_type, org_id]
        );

        // Upsert Officers for the SPECIFIC SEMESTER ONLY IF officer data is provided
        // This prevents Dashboard "Global Save" from wiping out officers with NULLs
        const officerFields = [treasurer_name, auditor_name, president_name, adviser_name, adviser2_name];
        const hasOfficerUpdates = officerFields.some(field => field !== undefined);

        if (hasOfficerUpdates) {
            const upsertRes = await pool.query(`
                INSERT INTO organization_officers (org_id, treasurer_name, auditor_name, president_name, adviser_name, adviser2_name, semester, school_year)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                ON CONFLICT (org_id, semester, school_year)
                DO UPDATE SET
                    treasurer_name = EXCLUDED.treasurer_name,
                    auditor_name = EXCLUDED.auditor_name,
                    president_name = EXCLUDED.president_name,
                    adviser_name = EXCLUDED.adviser_name,
                    adviser2_name = EXCLUDED.adviser2_name
                RETURNING *
            `, [org_id, treasurer_name, auditor_name, president_name, adviser_name, adviser2_name, current_semester, current_school_year]);
            console.log(`[PUT Upsert] Updated officers for ${upsertRes.rows[0].semester}.`);
        } else {
            console.log(`[PUT Settings] Skipping officer update (no officer data provided).`);
        }

        res.json({ message: 'Settings updated' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;

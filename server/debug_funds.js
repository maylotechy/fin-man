const pool = require('./config/db');

(async () => {
    try {
        const orgRes = await pool.query("SELECT id, current_balance FROM organizations WHERE username = 'USM-CHEFS'");
        if (orgRes.rows.length === 0) {
            console.log('Org USM-CHEFS not found');
            process.exit(1);
        }
        const orgId = orgRes.rows[0].id;
        console.log('Org:', orgRes.rows[0]);

        const fundsRes = await pool.query("SELECT id, source_name, balance, semester, school_year FROM funds WHERE org_id = $1 AND source_name LIKE '%Membership%' ORDER BY school_year, semester, id", [orgId]);
        console.table(fundsRes.rows.map(f => ({
            ID: f.id,
            Source: f.source_name,
            Balance: f.balance,
            Semester: f.semester,
            SY: f.school_year
        })));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();

const pool = require('./config/db');

async function checkConstraints() {
    try {
        const res = await pool.query(`
            SELECT conname, pg_get_constraintdef(c.oid)
            FROM pg_constraint c
            JOIN pg_namespace n ON n.oid = c.connamespace
            WHERE conrelid = 'public.organization_officers'::regclass
        `);
        console.log("Constraints on organization_officers:");
        res.rows.forEach(r => console.log(`${r.conname}: ${r.pg_get_constraintdef}`));
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

checkConstraints();

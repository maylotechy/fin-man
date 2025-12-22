const pool = require('./config/db');

const debugSettings = async () => {
    try {
        console.log("Checking 'organizations' columns...");
        // Get column names
        const cols = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'organizations';
        `);
        console.table(cols.rows.map(r => ({ name: r.column_name, type: r.data_type })));

        console.log("\nAttempting to read settings for first org...");
        const orgs = await pool.query('SELECT id, name, current_semester, current_school_year FROM organizations LIMIT 1');

        if (orgs.rows.length === 0) {
            console.log("No organizations found!");
            return;
        }

        const org = orgs.rows[0];
        console.log("Current Org:", org);

        console.log("\nAttempting Dummy Update...");
        const updateRes = await pool.query(
            "UPDATE organizations SET current_semester = 'TEST_SEM' WHERE id = $1",
            [org.id]
        );
        console.log("Update Success:", updateRes.rowCount > 0);

        // Revert
        await pool.query(
            "UPDATE organizations SET current_semester = $1 WHERE id = $2",
            [org.current_semester, org.id]
        );
        console.log("Reverted changes.");

        process.exit(0);
    } catch (err) {
        console.error("DEBUG ERROR:", err);
        process.exit(1);
    }
};

debugSettings();

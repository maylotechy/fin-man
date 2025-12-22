const pool = require('./config/db');

const backfill = async () => {
    try {
        console.log("Starting backfill...");
        const count = await pool.query('SELECT count(*) FROM transactions');
        console.log(`Total transactions: ${count.rows[0].count}`);

        const res = await pool.query(`
            UPDATE transactions 
            SET semester = 'First Semester', school_year = 'S.Y. 2025 - 2026' 
            WHERE semester IS NULL OR semester = '' OR school_year IS NULL OR school_year = '';
        `);
        console.log(`Updated ${res.rowCount} rows.`);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

backfill();

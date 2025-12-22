const pool = require('./config/db');

const migrate = async () => {
    try {
        console.log("Adding settings columns...");
        await pool.query(`
            ALTER TABLE organizations 
            ADD COLUMN IF NOT EXISTS current_semester VARCHAR(50) DEFAULT 'First Semester',
            ADD COLUMN IF NOT EXISTS current_school_year VARCHAR(50) DEFAULT 'S.Y. 2025 - 2026';
        `);
        console.log("Done.");
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

migrate();

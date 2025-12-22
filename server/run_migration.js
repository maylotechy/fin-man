const pool = require('./config/db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    try {
        const sql = fs.readFileSync(path.join(__dirname, 'db_refactor.sql'), 'utf8');
        console.log('Running migration...');
        await pool.query(sql);
        console.log('Migration successful!');
    } catch (err) {
        console.error('Migration failed:', err.message);
        console.error('Detail:', err.detail);
        console.error('Constraint:', err.constraint);
        console.error('Table:', err.table);
    } finally {
        await pool.end();
    }
}

runMigration();

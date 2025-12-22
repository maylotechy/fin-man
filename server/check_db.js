const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const pool = require('./config/db');

async function checkOrgs() {
    try {
        console.log("Checking organizations table...");
        const res = await pool.query("SELECT * FROM organizations");
        if (res.rows.length === 0) {
            console.log("No organizations found.");
        } else {
            console.log("Found organizations:", res.rows);
        }
    } catch (err) {
        console.error("Error querying organizations:", err);
    } finally {
        await pool.end();
    }
}

checkOrgs();

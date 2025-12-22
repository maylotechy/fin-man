const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

const defaultFunds = [
    'Allocation from University Admin',
    'Membership Fees',
    'Voluntary Contribution',
    'Donations',
    'Sponsorship',
    'IGP Proceeds'
];

async function seedFunds() {
    try {
        console.log("Connecting to database...");
        // Get all organizations
        const orgRes = await pool.query('SELECT id, name FROM organizations');
        const orgs = orgRes.rows;

        if (orgs.length === 0) {
            console.log("No organizations found. Please create an organization first.");
            return;
        }

        for (const org of orgs) {
            console.log(`Processing Org: ${org.name} (ID: ${org.id})`);

            for (const fundName of defaultFunds) {
                // Check if fund exists
                const check = await pool.query('SELECT id FROM funds WHERE org_id = $1 AND source_name = $2', [org.id, fundName]);

                if (check.rows.length === 0) {
                    await pool.query('INSERT INTO funds (org_id, source_name, balance) VALUES ($1, $2, 0.00)', [org.id, fundName]);
                    console.log(`  + Added: ${fundName}`);
                } else {
                    console.log(`  - Exists: ${fundName}`);
                }
            }
        }
        console.log("Done!");
    } catch (err) {
        console.error("Error seeding funds:", err);
    } finally {
        await pool.end();
    }
}

seedFunds();

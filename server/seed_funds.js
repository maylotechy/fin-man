const pool = require('./config/db');

async function seedFunds() {
    try {
        console.log('Starting Funds Seeding...');

        // 1. Get all Organizations
        const orgs = await pool.query('SELECT id, username FROM organizations');
        console.log(`Found ${orgs.rows.length} organizations.`);

        // 2. Default Funds List
        const defaultFunds = [
            'Allocation from University Admin',
            'Membership Fees',
            'Voluntary Contribution',
            'Donations',
            'Sponsorship',
            'IGP Proceeds'
        ];

        for (const org of orgs.rows) {
            console.log(`Checking funds for ${org.username}...`);

            for (const fundName of defaultFunds) {
                // Check if fund exists
                const check = await pool.query(
                    'SELECT id FROM funds WHERE org_id = $1 AND source_name = $2',
                    [org.id, fundName]
                );

                if (check.rows.length === 0) {
                    await pool.query(
                        'INSERT INTO funds (org_id, source_name, balance) VALUES ($1, $2, 0.00)',
                        [org.id, fundName]
                    );
                    console.log(`   + Added: ${fundName}`);
                } else {
                    // console.log(`   - Exists: ${fundName}`);
                }
            }
        }

        console.log('Funds Seeding Complete!');
        process.exit(0);
    } catch (err) {
        console.error('Seeding Funds Failed:', err);
        process.exit(1);
    }
}

seedFunds();

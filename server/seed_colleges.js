const pool = require('./config/db');
const bcrypt = require('bcryptjs');

const colleges = [
    { code: 'USM-CBDEM', name: 'College of Business, Development Economics, and Management', pass: 'CbdemLead2025' },
    { code: 'USM-CASS', name: 'College of Arts and Social Sciences', pass: 'CassCreate25' },
    { code: 'USM-CVM', name: 'College of Veterinary Medicine', pass: 'CvmCare2025' },
    { code: 'USM-CED', name: 'College of Education', pass: 'CedTeach25' },
    { code: 'USM-CEIT', name: 'College of Engineering and Information Technology', pass: 'CeitBuild2025' },
    { code: 'USM-CHEFS', name: 'College of Human Ecology and Food Sciences', pass: 'ChefsServe25' },
    { code: 'USM-CA', name: 'College of Agriculture', pass: 'CaGrow2025' },
    { code: 'USM-CHS', name: 'College of Health Sciences', pass: 'ChsHeal25' },
    { code: 'USM-CTI', name: 'College of Trades and Industries', pass: 'CtiWork2025' },
    { code: 'USM-IMEAS', name: 'Institute of Middle East and Asian Studies', pass: 'ImeasStudy25' }
];

async function seedColleges() {
    try {
        console.log('Starting College Seeding...');

        for (const college of colleges) {
            // Hash Password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(college.pass, salt);

            // Insert or Update
            const query = `
                INSERT INTO organizations (username, full_name, name, organization_type, password_hash, current_balance)
                VALUES ($1, $2, $3, 'Academic', $4, 0.00)
                ON CONFLICT (username) 
                DO UPDATE SET 
                    full_name = EXCLUDED.full_name,
                    password_hash = EXCLUDED.password_hash;
            `;

            // Using pure code for 'name' for now (e.g. USM-CBDEM -> CBDEM could be derived, but keeping simple)
            // Let's extract the part after 'USM-' for the short name if possible, else use full code.
            const shortName = college.code.replace('USM-', '');

            await pool.query(query, [college.code, college.name, shortName, hashedPassword]);
            console.log(`Processed: ${college.code}`);
        }

        console.log('Seeding Complete!');
        process.exit(0);
    } catch (err) {
        console.error('Seeding Failed:', err);
        process.exit(1);
    }
}

seedColleges();

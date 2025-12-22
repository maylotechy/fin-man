const pool = require('./config/db');
const bcrypt = require('bcryptjs');

async function setPassword() {
    try {
        const password = 'admin123';
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        console.log(`Setting password to '${password}' (Hash: ${hash}) for USM-PSITS`);

        await pool.query('UPDATE organizations SET password_hash = $1 WHERE username = $2', [hash, 'USM-PSITS']);
        console.log('Password updated successfully.');
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

setPassword();

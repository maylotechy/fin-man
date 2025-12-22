const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Login Route
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // 1. Find organization by username (USM-PSITS)
        const orgCheck = await pool.query('SELECT * FROM organizations WHERE username = $1', [username]);

        if (orgCheck.rows.length === 0) {
            return res.status(400).json({ message: "Organization not found." });
        }

        const org = orgCheck.rows[0];



        const isMatch = await bcrypt.compare(password, org.password_hash);


        if (!isMatch) {
            return res.status(400).json({ message: "Incorrect password." });
        }

        // 3. Generate Token
        const token = jwt.sign(
            { id: org.id, org_id: org.id, username: org.username },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.json({
            token,
            org_id: org.id,
            username: org.username,
            full_name: org.full_name
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: "Server Error" });
    }
});

module.exports = router;
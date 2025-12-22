const { Pool } = require('pg');
require('dotenv').config();

// The Pool allows multiple connections to the DB
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // Required for Supabase/External DBs
    }
});

pool.on('connect', () => {
    console.log('✅ Connected to the USM Database');
});

module.exports = pool;
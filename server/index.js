const express = require('express');
const cors = require('cors');
require('dotenv').config();
const transactionRoutes = require('./routes/transactionRoutes');
const ppmpRoutes = require('./routes/ppmpRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
// Middleware
app.use(cors());
app.use(express.json()); // Allows us to receive JSON data

// Routes
app.use('/api/transactions', transactionRoutes);
app.use('/api/ppmp', ppmpRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/settings', require('./routes/settingsRoutes'));
app.get('/', (req, res) => {
    res.send('USM Financial Management API is live! 🚀');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
const express = require('express');
const cors = require('cors');
const pool = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors());

// Importiere den API-Router
const apiRouter = require('./routes/api');
app.use('/api', apiRouter);

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on Port ${PORT}`);
});
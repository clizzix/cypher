const { Pool } = require('pg');
require('dotenv').config();

// Create a new Pool to deal with Clients

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Test the connection
pool.connect((err, client, release) => {
    if (err) {
        return console.error('Error acquiring client', err.stack);
    }
    console.log('Database connected successfully');
    release(); // Give the client back to the pool
});

module.exports = pool;
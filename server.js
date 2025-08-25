const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const pool = require('./db'); // Import the pool from db.js
const jwt = require('jsonwebtoken');
require('dotenv').config();


const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json()); // Allow to Parse JSON request bodies
app.use(cors());

// import and usage of the new creator router
const apiRouter = require('./routes/api');
app.use('/api', apiRouter);

// POST-endpoint for user registration
app.post('/api/register', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Check if user already exists
        const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userResult.rows.length > 0) {
            return res.status(400).json({ message: 'User already exists' });
        }
        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert the new user into the database
        const newUser = await pool.query(
            `INSERT INTO users (email, password_hash, user_role, subscription_status, current_plan)
            VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [email, hashedPassword, 'listener', 'inactive', 'none']
        );

        res.status(201).json({ message: 'User registered succesfully', user: newUser.rows[0] });
    } catch (error) {
        console.error('Error during registration:', error);
        res.status(500).json({ message: 'An Error occured. Please try again later.' });
    }
    });

// POST-Route for User- Login
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // 1. Find User in DataBase
        const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = userResult.rows[0]

        // Check if user exists
        if (!user) {
            return res.status(400).json({ message: 'Invalid e-mail adress or password.' });
        }

        // 2. Compare password
        const passwordMatch = await bcrypt.compare(password, user.password_hash);

        // Check if password correct
        if (!passwordMatch) {
            return res.status(400).json({ message: ' Invalid email adress or password.' });
        }
        // Create JWT 
        const token = jwt.sign(
            { userId: user.user_id, userRole: user.user_role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' } // Token expires in 1 hour
        );
        // Succesfull login 
        res.status(200).json({
            message: 'Login succesfull!',
            token: token, // generated JWT token
            user: {
                id: user.user_id,
                email: user.email,
                role: user.user_role
            }
        });

      } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ message: 'An error occured. Please try again later.' });
      }
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on Port ${PORT}`);
});
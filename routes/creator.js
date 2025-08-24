const express = require('express');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const pool = require('../db');

const router = express.Router();

// Middleware to check on the JWS Token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
        return res.status(401).json({ message: 'Token not found.' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Token is invalid or expired.' });
        }
        req.user = user;
        next();
    });
};

// Middleware for Creators only
const isCreator = (req, res, next) => {
    if (req.user.userRole !== 'creator') {
        return res.status(403).json({ message: 'Access denied. Only Creators can upload.' });
    }
    next();
};

// Multer configuration for temporary storage
const upload = multer({ dest: 'uploads/' });

// protected route for data upload
router.post('/upload', authenticateToken, isCreator, upload.single('audioFile'), (req, res) => {
    // If upload is succesfull
    if (!req.file) {
        return res.status(400).json({ message: 'No data found to upload.' });
    }
    // Logic for upload to cloud storage like AWS 3
    // For the moment its only success report
    res.status(200).json({
        message: 'Data uploaded successfully!',
        file: req.file
    });
});

module.exports = router; 
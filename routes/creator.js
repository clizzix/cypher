const express = require('express');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');
const pool = require('../db');

const router = express.Router();

// Middleware zur Überprüfung des JWT-Tokens
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) {
    return res.status(401).json({ message: 'Token nicht gefunden.' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Token ist ungültig oder abgelaufen.' });
    }
    req.user = user;
    next();
  });
};

// Middleware, die nur Creators zulässt
const isCreator = (req, res, next) => {
  if (req.user.userRole !== 'creator') {
    return res.status(403).json({ message: 'Zugriff verweigert. Nur Creators dürfen hochladen.' });
  }
  next();
};

// S3-Client konfigurieren
const s3Client = new S3Client({
  region: process.env.AWS_REGION, // Z. B. 'eu-central-1'
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Multer-Konfiguration für den Arbeitsspeicher
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Geschützte Route für den Dateiupload
router.post('/upload', authenticateToken, isCreator, upload.single('audioFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Keine Datei zum Hochladen gefunden.' });
    }

    const { originalname, mimetype, buffer } = req.file;
    const { title, genre, description } = req.body;
    const artistId = req.user.userId;

    // Eindeutigen Dateinamen erstellen
    const key = `${uuidv4()}-${originalname}`;

    // Upload-Parameter für S3
    const uploadParams = {
      Bucket: process.env.S3_BUCKET_NAME, // Dein Bucket-Name
      Key: key,
      Body: buffer,
      ContentType: mimetype,
    };

    // Datei zu S3 hochladen
    await s3Client.send(new PutObjectCommand(uploadParams));

    // Dateipfad für die Datenbank
    const filePath = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

    // Metadaten in die Datenbank schreiben
    await pool.query(
      `INSERT INTO tracks (title, artist_id, file_path, genre, description)
       VALUES ($1, $2, $3, $4, $5)`,
      [title, artistId, filePath, genre, description]
    );

    res.status(200).json({
      message: 'Datei erfolgreich hochgeladen und Metadaten gespeichert!',
      filePath: filePath,
    });

  } catch (error) {
    console.error('Fehler beim Upload:', error);
    res.status(500).json({ message: 'Ein Fehler ist aufgetreten. Bitte versuche es später erneut.' });
  }
});

module.exports = router;
const express = require('express');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
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
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Multer-Konfiguration für den Arbeitsspeicher
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// === TRACKS HOCHLADEN (NUR FÜR CREATORS) ===
router.post('/upload', authenticateToken, isCreator, upload.single('audioFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Keine Datei zum Hochladen gefunden.' });
    }

    const { originalname, mimetype, buffer } = req.file;
    const { title, genre, description } = req.body;
    const artistId = req.user.userId;

    // Eindeutigen Dateinamen/Schlüssel erstellen
    const key = `${uuidv4()}-${originalname}`;

    // Upload-Parameter für S3
    const uploadParams = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key, // Der Schlüssel
      Body: buffer,
      ContentType: mimetype,
    };

    // Datei zu S3 hochladen
    await s3Client.send(new PutObjectCommand(uploadParams));

    // Metadaten in die Datenbank schreiben
    await pool.query(
      `INSERT INTO tracks (title, artist_id, file_key, genre, description)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [title, artistId, key, genre, description]
    );

    res.status(200).json({
      message: 'Datei erfolgreich hochgeladen und Metadaten gespeichert!',
      fileKey: key,
    });

  } catch (error) {
    console.error('Fehler beim Upload:', error);
    res.status(500).json({ message: 'Ein Fehler ist aufgetreten. Bitte versuche es später erneut.' });
  }
});


// === TRACKS ABRUFEN (FÜR ALLE AUTHENTIFIZIERTEN BENUTZER) ===
// Eine Route, um alle Tracks aufzulisten
router.get('/tracks', authenticateToken, async (req, res) => {
    try {
        const tracksResult = await pool.query(`
            SELECT t.*, u.email AS artist_email
            FROM tracks t
            JOIN users u ON t.artist_id = u.user_id
        `);
        res.status(200).json(tracksResult.rows);
    } catch (error) {
        console.error('Fehler beim Abrufen der Tracks:', error);
        res.status(500).json({ message: 'Tracks konnten nicht abgerufen werden.' });
    }
});

// Eine Route, um einen Track herunterzuladen (gesicherte URL)
router.get('/tracks/download/:trackId', authenticateToken, async (req, res) => {
    try {
        const { trackId } = req.params;
        const trackResult = await pool.query('SELECT file_key FROM tracks WHERE track_id = $1', [trackId]);
        const track = trackResult.rows[0];

        if (!track) {
            return res.status(404).json({ message: 'Track nicht gefunden.' });
        }

        const signedUrl = await getSignedUrl(
            s3Client,
            new GetObjectCommand({
                Bucket: process.env.S3_BUCKET_NAME,
                Key: track.file_key, // Verwende den Schlüssel aus der Datenbank
            }),
            { expiresIn: 3600 } // URL ist 1 Stunde lang gültig
        );

        res.status(200).json({ downloadUrl: signedUrl });
    } catch (error) {
        console.error('Fehler beim Generieren der Download-URL:', error);
        res.status(500).json({ message: 'Download-Link konnte nicht generiert werden.' });
    }
});


module.exports = router;
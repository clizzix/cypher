const express = require('express');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
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


// === AUTHENTIFIZIERUNGS-ROUTEN ===
router.post('/register', async (req, res) => {
    const { email, password, userRole, artistName } = req.body;

    if (!email || !password || !userRole) {
        return res.status(400).json({ message: 'Bitte gib eine E-Mail, ein Passwort und eine Benutzerrolle an.' });
    }

    if (userRole === 'creator' && !artistName) {
        return res.status(400).json({ message: 'Creators müssen einen Künstlernamen angeben.' });
    }

    try {
        const passwordHash = await bcrypt.hash(password, 10);
        const newUser = await pool.query(
            'INSERT INTO users (email, password_hash, user_role, artist_name) VALUES ($1, $2, $3, $4) RETURNING user_id, email, user_role, artist_name',
            [email, passwordHash, userRole, artistName]
        );

        res.status(201).json({
            message: 'Benutzer erfolgreich registriert!',
            user: newUser.rows[0]
        });

    } catch (error) {
        console.error('Fehler bei der Registrierung:', error.message);
        if (error.code === '23505') { // Postgres-Fehlercode für UNIQUE-Constraint-Verletzung
            return res.status(400).json({ message: 'E-Mail oder Künstlername existiert bereits.' });
        }
        res.status(500).json({ message: 'Ein Fehler ist aufgetreten. Bitte versuche es später erneut.' });
    }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = userResult.rows[0];

    if (!user) {
      return res.status(400).json({ message: 'Ungültige E-Mail-Adresse oder Passwort.' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(400).json({ message: 'Ungültige E-Mail-Adresse oder Passwort.' });
    }

    const token = jwt.sign(
      { userId: user.user_id, userRole: user.user_role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(200).json({
      message: 'Anmeldung erfolgreich!',
      token: token,
      user: {
        id: user.user_id,
        email: user.email,
        role: user.user_role,
        artistName: user.artist_name
      }
    });

  } catch (error) {
    console.error('Fehler bei der Anmeldung:', error.message);
    res.status(500).json({ message: 'Ein Fehler ist aufgetreten. Bitte versuche es später erneut.' });
  }
});


// === TRACKS HOCHLADEN (NUR FÜR CREATORS) ===
router.post('/upload', authenticateToken, isCreator, upload.single('audioFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Keine Datei zum Hochladen gefunden.' });
    }

    const { originalname, mimetype, buffer } = req.file;
    const { title, genre, description } = req.body;
    const artistId = req.user.userId;

    const key = `${uuidv4()}-${originalname}`;

    const uploadParams = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: mimetype,
    };

    await s3Client.send(new PutObjectCommand(uploadParams));

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
router.get('/tracks', authenticateToken, async (req, res) => {
    try {
        const { q, genre } = req.query;

        let query = `
            SELECT t.*, u.artist_name
            FROM tracks t
            JOIN users u ON t.artist_id = u.user_id
        `;
        let params = [];
        const conditions = [];
        let paramIndex = 1;

        if (q) {
            const searchTerm = `%${q}%`;
            conditions.push(`(t.title ILIKE $${paramIndex} OR u.artist_name ILIKE $${paramIndex})`);
            params.push(searchTerm);
            paramIndex++;
        }

        if (genre) {
            conditions.push(`t.genre = $${paramIndex}`);
            params.push(genre);
            paramIndex++;
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY t.upload_date DESC';

        const tracksResult = await pool.query(query, params);
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
                Key: track.file_key,
            }),
            { expiresIn: 3600 }
        );

        res.status(200).json({ downloadUrl: signedUrl });
    } catch (error) {
        console.error('Fehler beim Generieren der Download-URL:', error);
        res.status(500).json({ message: 'Download-Link konnte nicht generiert werden.' });
    }
});

// Get all tracks from a specific user
router.get('/tracks/user', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.user;
        const result = await pool.query(
            `SELECT t.*, u.artist_name FROM tracks t 
            JOIN users u ON t.artist_id = u.user_id 
            WHERE t.artist_id = $1`,
            [userId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "An error occurred while retrieving user's tracks." });
    }
});
// Create Playlist
// === PLAYLIST-ROUTEN ===

// Eine Playlist erstellen
router.post('/playlists', authenticateToken, async (req, res) => {
    try {
        const { title, description } = req.body;
        if (!title) {
            return res.status(400).json({ message: 'Der Titel der Playlist ist erforderlich.' });
        }

        const newPlaylist = await pool.query(
            'INSERT INTO playlists (title, description, creator_id) VALUES ($1, $2, $3) RETURNING *',
            [title, description, req.user.userId]
        );

        res.status(201).json({
            message: 'Playlist erfolgreich erstellt!',
            playlist: newPlaylist.rows[0]
        });

    } catch (error) {
        console.error('Fehler beim Erstellen der Playlist:', error);
        res.status(500).json({ message: 'Ein Fehler ist aufgetreten. Bitte versuche es später erneut.' });
    }
});

// Tracks zu einer Playlist hinzufügen
router.post('/playlists/:playlistId/tracks', authenticateToken, async (req, res) => {
    try {
        const { playlistId } = req.params;
        const { trackId } = req.body;

        if (!trackId) {
            return res.status(400).json({ message: 'Die Track-ID ist erforderlich.' });
        }

        // Überprüfen, ob der Benutzer der Ersteller der Playlist ist
        const playlistResult = await pool.query('SELECT creator_id FROM playlists WHERE playlist_id = $1', [playlistId]);
        const playlist = playlistResult.rows[0];

        if (!playlist || playlist.creator_id !== req.user.userId) {
            return res.status(403).json({ message: 'Zugriff verweigert.' });
        }
        
        // Track zur Playlist hinzufügen
        await pool.query(
            'INSERT INTO playlist_tracks (playlist_id, track_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [playlistId, trackId]
        );

        res.status(200).json({ message: 'Track erfolgreich zur Playlist hinzugefügt.' });

    } catch (error) {
        console.error('Fehler beim Hinzufügen des Tracks:', error);
        if (error.code === '23503') { // Postgres-Fehlercode für Fremdschlüsselverletzung
            return res.status(404).json({ message: 'Playlist oder Track nicht gefunden.' });
        }
        res.status(500).json({ message: 'Ein Fehler ist aufgetreten. Bitte versuche es später erneut.' });
    }
});

// Alle Playlists eines Benutzers abrufen
router.get('/playlists', authenticateToken, async (req, res) => {
    try {
        const playlistsResult = await pool.query(
            'SELECT * FROM playlists WHERE creator_id = $1 ORDER BY created_at DESC',
            [req.user.userId]
        );
        res.status(200).json(playlistsResult.rows);
    } catch (error) {
        console.error('Fehler beim Abrufen der Playlists:', error);
        res.status(500).json({ message: 'Playlists konnten nicht abgerufen werden.' });
    }
});

// Eine einzelne Playlist mit allen Tracks abrufen
router.get('/playlists/:playlistId', authenticateToken, async (req, res) => {
    try {
        const { playlistId } = req.params;

        const playlistResult = await pool.query('SELECT * FROM playlists WHERE playlist_id = $1 AND creator_id = $2', [playlistId, req.user.userId]);
        const playlist = playlistResult.rows[0];

        if (!playlist) {
            return res.status(404).json({ message: 'Playlist nicht gefunden oder Zugriff verweigert.' });
        }

        // Tracks für die Playlist abrufen
        const tracksResult = await pool.query(`
            SELECT t.*, u.artist_name
            FROM playlist_tracks pt
            JOIN tracks t ON pt.track_id = t.track_id
            JOIN users u ON t.artist_id = u.user_id
            WHERE pt.playlist_id = $1
            ORDER BY pt.added_at ASC
        `, [playlistId]);

        res.status(200).json({
            ...playlist,
            tracks: tracksResult.rows
        });

    } catch (error) {
        console.error('Fehler beim Abrufen der Playlist-Details:', error);
        res.status(500).json({ message: 'Playlist-Details konnten nicht abgerufen werden.' });
    }
});

// === TRACK LÖSCHEN (NUR FÜR CREATORS) ===
router.delete('/tracks/:trackId', authenticateToken, isCreator, async (req, res) => {
    try {
        const { trackId } = req.params;
        const artistId = req.user.userId;

        // Abrufen der Track-Details, um zu überprüfen, ob der Benutzer der Künstler ist
        const trackResult = await pool.query('SELECT file_key, artist_id FROM tracks WHERE track_id = $1', [trackId]);
        const track = trackResult.rows[0];

        if (!track) {
            return res.status(404).json({ message: 'Track nicht gefunden.' });
        }

        if (track.artist_id !== artistId) {
            return res.status(403).json({ message: 'Zugriff verweigert. Du bist nicht der Ersteller dieses Tracks.' });
        }

        // 1. Datei aus S3 löschen
        const deleteParams = {
            Bucket: process.env.S3_BUCKET_NAME,
            Key: track.file_key,
        };

        const { DeleteObjectCommand } = require("@aws-sdk/client-s3");
        await s3Client.send(new DeleteObjectCommand(deleteParams));

        // 2. Metadaten aus der Datenbank löschen
        await pool.query('DELETE FROM tracks WHERE track_id = $1', [trackId]);

        res.status(200).json({ message: 'Track erfolgreich gelöscht.' });

    } catch (error) {
        console.error('Fehler beim Löschen des Tracks:', error);
        res.status(500).json({ message: 'Ein Fehler ist aufgetreten. Bitte versuche es später erneut.' });
    }
});

module.exports = router;
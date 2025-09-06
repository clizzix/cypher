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
        if (error.code === '23505') {
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

// === PROFIL-ROUTE (KORRIGIERT) ===
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        // Abfrage zur Abfrage des Benutzers basierend auf der user_id
        const userResult = await pool.query(
            'SELECT user_id, email, user_role, artist_name FROM users WHERE user_id = $1',
            [userId]
        );
        const user = userResult.rows[0];

        if (!user) {
            return res.status(404).json({ message: 'Benutzer nicht gefunden' });
        }

        res.json(user);
    } catch (error) {
        console.error('Profil-Fehler:', error.message);
        res.status(500).send('Serverfehler');
    }
});

// === TRACK-ROUTEN ===
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

// Tracks abrufen (mit Such- und Filterfunktion) (Aktualisiert)
router.get('/tracks', authenticateToken, async (req, res) => {
    try {
        const { q, genre } = req.query;

        let query = `
            SELECT t.*, u.artist_name, t.cover_art_key  
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

// Tracks eines bestimmten Benutzers abrufen
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
        console.error('Fehler beim Abrufen der Tracks des Benutzers:', error);
        res.status(500).json({ message: "Fehler beim Abrufen der Tracks des Benutzers." });
    }
});

// Einen Track herunterladen (gesicherte URL)
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

// Track löschen
router.delete('/tracks/:trackId', authenticateToken, isCreator, async (req, res) => {
    try {
        const { trackId } = req.params;
        const artistId = req.user.userId;

        const trackResult = await pool.query('SELECT file_key, artist_id FROM tracks WHERE track_id = $1', [trackId]);
        const track = trackResult.rows[0];

        if (!track) {
            return res.status(404).json({ message: 'Track nicht gefunden.' });
        }

        if (track.artist_id !== artistId) {
            return res.status(403).json({ message: 'Zugriff verweigert. Du bist nicht der Ersteller dieses Tracks.' });
        }

        const deleteParams = {
            Bucket: process.env.S3_BUCKET_NAME,
            Key: track.file_key,
        };

        await s3Client.send(new DeleteObjectCommand(deleteParams));
        await pool.query('DELETE FROM tracks WHERE track_id = $1', [trackId]);

        res.status(200).json({ message: 'Track erfolgreich gelöscht.' });
    } catch (error) {
        console.error('Fehler beim Löschen des Tracks:', error);
        res.status(500).json({ message: 'Ein Fehler ist aufgetreten. Bitte versuche es später erneut.' });
    }
});

// === TRACK BEARBEITUNGS-ROUTEN ===

// Track-Metadaten und Cover-Art aktualisieren
router.put('/tracks/:trackId', authenticateToken, isCreator, upload.single('coverArt'), async (req, res) => {
    try {
        const { trackId } = req.params;
        const { title, genre, description } = req.body;
        const artistId = req.user.userId;

        // Überprüfen, ob der Benutzer der Ersteller des Tracks ist
        const trackResult = await pool.query('SELECT file_key, cover_art_key, artist_id FROM tracks WHERE track_id = $1', [trackId]);
        const track = trackResult.rows[0];

        if (!track) {
            return res.status(404).json({ message: 'Track nicht gefunden.' });
        }

        if (track.artist_id !== artistId) {
            return res.status(403).json({ message: 'Zugriff verweigert. Du bist nicht der Ersteller dieses Tracks.' });
        }

        let query = 'UPDATE tracks SET title = $1, genre = $2, description = $3';
        const params = [title, genre, description];
        let paramIndex = 4;
        let newCoverArtKey = track.cover_art_key;

        // Cover-Art-Bild hochladen, falls vorhanden
        if (req.file) {
            // Falls bereits ein Cover-Art existiert, dieses im S3-Bucket löschen
            if (track.cover_art_key) {
                const deleteParams = {
                    Bucket: process.env.S3_BUCKET_NAME,
                    Key: track.cover_art_key,
                };
                await s3Client.send(new DeleteObjectCommand(deleteParams));
            }

            // Neues Cover-Art-Bild hochladen
            const key = `cover-${uuidv4()}-${req.file.originalname}`;
            const uploadParams = {
                Bucket: process.env.S3_BUCKET_NAME,
                Key: key,
                Body: req.file.buffer,
                ContentType: req.file.mimetype,
            };
            await s3Client.send(new PutObjectCommand(uploadParams));
            newCoverArtKey = key;

            query += `, cover_art_key = $${paramIndex}`;
            params.push(newCoverArtKey);
            paramIndex++;
        }

        query += ` WHERE track_id = $${paramIndex} AND artist_id = $${paramIndex + 1}`;
        params.push(trackId, artistId);

        await pool.query(query, params);

        res.status(200).json({ message: 'Track erfolgreich aktualisiert.', coverArtKey: newCoverArtKey });

    } catch (error) {
        console.error('Fehler beim Aktualisieren des Tracks:', error);
        res.status(500).json({ message: 'Ein Fehler ist aufgetreten. Bitte versuche es später erneut.' });
    }
});
// Gesicherte URL für das Cover-Art abrufen
router.get('/tracks/cover/:coverArtKey', authenticateToken, async (req, res) => {
    try {
        const { coverArtKey } = req.params;

        const signedUrl = await getSignedUrl(
            s3Client,
            new GetObjectCommand({
                Bucket: process.env.S3_BUCKET_NAME,
                Key: coverArtKey,
            }),
            { expiresIn: 3600 }
        );

        res.status(200).json({ coverArtUrl: signedUrl });
    } catch (error) {
        console.error('Fehler beim Generieren der Cover-Art-URL:', error);
        res.status(500).json({ message: 'Cover-Art-URL konnte nicht generiert werden.' });
    }
});
// === PLAYLIST-ROUTEN ===

// Alle Playlists eines Benutzers abrufen (für die Playlist-Seite)
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

// Eine Playlist erstellen
router.post('/playlists', authenticateToken, async (req, res) => {
    try {
        // Das Frontend sendet 'name', nicht 'title'
        const { name, description } = req.body;
        if (!name) {
            return res.status(400).json({ message: 'Der Name der Playlist ist erforderlich.' });
        }

        const newPlaylist = await pool.query(
            'INSERT INTO playlists (name, description, creator_id) VALUES ($1, $2, $3) RETURNING *',
            [name, description, req.user.userId]
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


// Eine einzelne Playlist mit allen Tracks abrufen
router.get('/playlists/:playlistId', authenticateToken, async (req, res) => {
    try {
        const { playlistId } = req.params;

        const playlistResult = await pool.query('SELECT * FROM playlists WHERE playlist_id = $1 AND creator_id = $2', [playlistId, req.user.userId]);
        const playlist = playlistResult.rows[0];

        if (!playlist) {
            return res.status(404).json({ message: 'Playlist nicht gefunden oder Zugriff verweigert.' });
        }

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

// Tracks zu einer Playlist hinzufügen
router.post('/playlists/:playlistId/tracks', authenticateToken, async (req, res) => {
    try {
        const { playlistId } = req.params;
        const { trackId } = req.body;

        if (!trackId) {
            return res.status(400).json({ message: 'Die Track-ID ist erforderlich.' });
        }

        const playlistResult = await pool.query('SELECT creator_id FROM playlists WHERE playlist_id = $1', [playlistId]);
        const playlist = playlistResult.rows[0];

        if (!playlist || playlist.creator_id !== req.user.userId) {
            return res.status(403).json({ message: 'Zugriff verweigert.' });
        }

        await pool.query(
            'INSERT INTO playlist_tracks (playlist_id, track_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [playlistId, trackId]
        );

        res.status(200).json({ message: 'Track erfolgreich zur Playlist hinzugefügt.' });
    } catch (error) {
        console.error('Fehler beim Hinzufügen des Tracks:', error);
        if (error.code === '23503') {
            return res.status(404).json({ message: 'Playlist oder Track nicht gefunden.' });
        }
        res.status(500).json({ message: 'Ein Fehler ist aufgetreten. Bitte versuche es später erneut.' });
    }
});
// Track aus einer Playlist entfernen
router.delete('/playlists/:playlistId/tracks/:trackId', authenticateToken, async (req, res) => {
    try {
        const { playlistId, trackId } = req.params;

        // Überprüfen, ob der Benutzer der Ersteller der Playlist ist
        const playlistResult = await pool.query('SELECT creator_id FROM playlists WHERE playlist_id = $1', [playlistId]);
        const playlist = playlistResult.rows[0];

        if (!playlist || playlist.creator_id !== req.user.userId) {
            return res.status(403).json({ message: 'Zugriff verweigert.' });
        }

        // Track aus der Playlist entfernen
        await pool.query(
            'DELETE FROM playlist_tracks WHERE playlist_id = $1 AND track_id = $2',
            [playlistId, trackId]
        );

        res.status(200).json({ message: 'Track erfolgreich aus der Playlist entfernt.' });

    } catch (error) {
        console.error('Fehler beim Entfernen des Tracks:', error);
        res.status(500).json({ message: 'Ein Fehler ist aufgetreten. Bitte versuche es später erneut.' });
    }
});

// Playlist löschen
router.delete('/playlists/:playlistId', authenticateToken, async (req, res) => {
    try {
        const { playlistId } = req.params;

        const playlistResult = await pool.query('SELECT creator_id FROM playlists WHERE playlist_id = $1', [playlistId]);
        const playlist = playlistResult.rows[0];

        if (!playlist || playlist.creator_id !== req.user.userId) {
            return res.status(403).json({ message: 'Zugriff verweigert. Du bist nicht der Ersteller dieser Playlist.' });
        }

        await pool.query('DELETE FROM playlists WHERE playlist_id = $1', [playlistId]);

        res.status(200).json({ message: 'Playlist erfolgreich gelöscht.' });

    } catch (error) {
        console.error('Fehler beim Löschen der Playlist:', error);
        res.status(500).json({ message: 'Ein Fehler ist aufgetreten. Bitte versuche es später erneut.' });
    }
});

// === KOMMENTAR-ROUTEN ===

// Kommentare für einen bestimmten Track abrufen
router.get('/tracks/:trackId/comments', authenticateToken, async (req, res) => {
    try {
        const { trackId } = req.params;
        const commentsResult = await pool.query(
            `SELECT c.*, u.artist_name, u.email
             FROM comments c
             JOIN users u ON c.user_id = u.user_id
             WHERE c.track_id = $1
             ORDER BY c.created_at ASC`,
            [trackId]
        );
        res.status(200).json(commentsResult.rows);
    } catch (error) {
        console.error('Fehler beim Abrufen der Kommentare:', error);
        res.status(500).json({ message: 'Kommentare konnten nicht abgerufen werden.' });
    }
});

// === KOMMENTAR-ROUTEN ===

// Kommentare für einen bestimmten Track abrufen
router.get('/tracks/:trackId/comments', authenticateToken, async (req, res) => {
    try {
        const { trackId } = req.params;
        const commentsResult = await pool.query(
            `SELECT c.*, u.artist_name, u.email
             FROM comments c
             JOIN users u ON c.user_id = u.user_id
             WHERE c.track_id = $1
             ORDER BY c.created_at ASC`,
            [trackId]
        );
        res.status(200).json(commentsResult.rows);
    } catch (error) {
        console.error('Fehler beim Abrufen der Kommentare:', error);
        res.status(500).json({ message: 'Kommentare konnten nicht abgerufen werden.' });
    }
});

// Einen Kommentar zu einem Track hinzufügen
router.post('/tracks/:trackId/comments', authenticateToken, async (req, res) => {
    try {
        const { trackId } = req.params;
        const { commentText } = req.body;
        const userId = req.user.userId;

        if (!commentText) {
            return res.status(400).json({ message: 'Kommentartext darf nicht leer sein.' });
        }

        const newComment = await pool.query(
            'INSERT INTO comments (track_id, user_id, comment_text) VALUES ($1, $2, $3) RETURNING *',
            [trackId, userId, commentText]
        );

        // Benachrichtigung für den Creator erstellen
        const trackResult = await pool.query('SELECT artist_id FROM tracks WHERE track_id = $1', [trackId]);
        const trackCreatorId = trackResult.rows[0]?.artist_id;

        if (trackCreatorId && trackCreatorId !== userId) {
            const senderResult = await pool.query('SELECT artist_name FROM users WHERE user_id = $1', [userId]);
            const senderName = senderResult.rows[0]?.artist_name || 'Ein Benutzer';
            const message = `${senderName} hat deinen Track kommentiert.`;

            await pool.query(
                'INSERT INTO notifications (recipient_user_id, sender_user_id, notification_type, message, track_id) VALUES ($1, $2, $3, $4, $5)',
                [trackCreatorId, userId, 'new_comment', message, trackId]
            );
        }

        res.status(201).json({
            message: 'Kommentar erfolgreich hinzugefügt.',
            comment: newComment.rows[0]
        });
    } catch (error) {
        console.error('Fehler beim Hinzufügen des Kommentars:', error);
        res.status(500).json({ message: 'Kommentar konnte nicht hinzugefügt werden.' });
    }
});

// === LIKE-ROUTEN ===

// Likes für einen bestimmten Track abrufen
router.get('/tracks/:trackId/likes', authenticateToken, async (req, res) => {
    try {
        const { trackId } = req.params;
        const likesResult = await pool.query(
            'SELECT COUNT(*) FROM likes WHERE track_id = $1',
            [trackId]
        );
        const userLikedResult = await pool.query(
            'SELECT * FROM likes WHERE track_id = $1 AND user_id = $2',
            [trackId, req.user.userId]
        );

        res.status(200).json({
            likeCount: parseInt(likesResult.rows[0].count, 10),
            userLiked: userLikedResult.rows.length > 0
        });
    } catch (error) {
        console.error('Fehler beim Abrufen der Likes:', error);
        res.status(500).json({ message: 'Likes konnten nicht abgerufen werden.' });
    }
});

// Einen Track liken oder Unliken
router.post('/tracks/:trackId/like', authenticateToken, async (req, res) => {
    try {
        const { trackId } = req.params;
        const userId = req.user.userId;

        const existingLike = await pool.query('SELECT * FROM likes WHERE track_id = $1 AND user_id = $2', [trackId, userId]);

        if (existingLike.rows.length > 0) {
            // Like entfernen (Unlike)
            await pool.query('DELETE FROM likes WHERE track_id = $1 AND user_id = $2', [trackId, userId]);
            res.status(200).json({ message: 'Like entfernt.' });
        } else {
            // Track liken
            await pool.query('INSERT INTO likes (track_id, user_id) VALUES ($1, $2)', [trackId, userId]);

            // Benachrichtigung
            const trackResult = await pool.query('SELECT artist_id FROM tracks WHERE track_id = $1', [trackId]);
            const trackCreatorId = trackResult.rows[0]?.artist_id;

            if (trackCreatorId && trackCreatorId !== userId) {
                const senderResult = await pool.query('SELECT artist_name FROM users WHERE user_id = $1', [userId]);
                const senderName = senderResult.rows[0]?.artist_name || 'Ein Benutzer';
                const message = `${senderName} hat deinen Track geliked.`;

                await pool.query(
                    'INSERT INTO notifications (recipient_user_id, sender_user_id, notification_type, message, track_id) VALUES ($1, $2, $3, $4, $5)',
                    [trackCreatorId, userId, 'track_liked', message, trackId]
                );
            }

            res.status(201).json({ message: 'Track geliked.' });
        }
    } catch (error) {
        console.error('Fehler beim Liken/Unliken:', error);
        res.status(500).json({ message: 'Ein Fehler ist aufgetreten.' });
    }
});

// === BENACHRICHTIGUNGS-ROUTEN ===

// Alle Benachrichtigungen für den angemeldeten Benutzer abrufen
router.get('/notifications', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const notificationsResult = await pool.query(
            `SELECT n.*, u.artist_name as sender_name
             FROM notifications n
             LEFT JOIN users u ON n.sender_user_id = u.user_id
             WHERE n.recipient_user_id = $1
             ORDER BY n.created_at DESC`,
            [userId]
        );
        res.status(200).json(notificationsResult.rows);
    } catch (error) {
        console.error('Fehler beim Abrufen der Benachrichtigungen:', error);
        res.status(500).json({ message: 'Benachrichtigungen konnten nicht abgerufen werden.' });
    }
});

// Benachrichtigung als gelesen markieren
router.put('/notifications/:id/read', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;

        await pool.query(
            'UPDATE notifications SET is_read = TRUE WHERE notification_id = $1 AND recipient_user_id = $2',
            [id, userId]
        );

        res.status(200).json({ message: 'Benachrichtigung als gelesen markiert.' });
    } catch (error) {
        console.error('Fehler beim Markieren als gelesen:', error);
        res.status(500).json({ message: 'Benachrichtigung konnte nicht aktualisiert werden.' });
    }
});
module.exports = router;
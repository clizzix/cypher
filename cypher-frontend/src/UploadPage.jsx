import React, { useState } from 'react';
import axios from 'axios';
import './UploadPage.css';

const API_URL = 'http://localhost:3000/api';

const UploadPage = ({ token }) => {
    const [title, setTitle] = useState('');
    const [artist, setArtist] = useState('');
    const [genre, setGenre] = useState('');
    const [description, setDescription] = useState('');
    const [audioFile, setAudioFile] = useState(null);
    const [coverArtFile, setCoverArtFile] = useState(null);
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // 🚨 KORRIGIERT: Überprüfe die Namen, die das Backend erwartet
            if (e.target.name === "track") {
                if (file.type !== "audio/mpeg") {
                    setMessage("Bitte nur MP3-Dateien hochladen.");
                    e.target.value = null; // Reset file input
                    return;
                }
                setAudioFile(file);
            } else if (e.target.name === "cover") {
                if (!file.type.startsWith("image/")) {
                    setMessage("Bitte nur Bild-Dateien hochladen.");
                    e.target.value = null; // Reset file input
                    return;
                }
                setCoverArtFile(file);
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        if (!title || !artist || !genre || !audioFile) {
            setMessage('Bitte füllen Sie alle erforderlichen Felder aus.');
            setLoading(false);
            return;
        }

        const formData = new FormData();
        formData.append('title', title);
        formData.append('artist_name', artist);
        formData.append('genre', genre);
        formData.append('description', description);
        
        // Die korrigierten Feldnamen, die das Backend erwartet
        formData.append('track', audioFile);
        if (coverArtFile) {
            formData.append('cover', coverArtFile);
        }

        try {
            await axios.post(`${API_URL}/tracks/upload`, formData, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
            setMessage('Track erfolgreich hochgeladen!');
            setTitle('');
            setArtist('');
            setGenre('');
            setDescription('');
            setAudioFile(null);
            setCoverArtFile(null);
        } catch (error) {
            setMessage(error.response?.data?.message || 'Fehler beim Hochladen des Tracks.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="upload-container">
            <h1 className="page-title">Track hochladen</h1>
            <form onSubmit={handleSubmit} className="upload-form">
                <div className="form-group">
                    <label htmlFor="title" className="form-label">Titel</label>
                    <input type="text" id="title" value={title} onChange={(e) => setTitle(e.target.value)} className="form-input" required />
                </div>
                <div className="form-group">
                    <label htmlFor="artist" className="form-label">Künstler</label>
                    <input type="text" id="artist" value={artist} onChange={(e) => setArtist(e.target.value)} className="form-input" required />
                </div>
                <div className="form-group">
                    <label htmlFor="genre" className="form-label">Genre</label>
                    <select id="genre" value={genre} onChange={(e) => setGenre(e.target.value)} className="form-select" required>
                        <option value="">Wähle ein Genre</option>
                        <option value="Rock">Rock</option>
                        <option value="Pop">Pop</option>
                        <option value="Jazz">Jazz</option>
                        <option value="Hip Hop">Hip Hop</option>
                        <option value="Electronic">Electronic</option>
                    </select>
                </div>
                <div className="form-group">
                    <label htmlFor="description" className="form-label">Beschreibung</label>
                    <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} className="form-textarea" />
                </div>
                <div className="form-group">
                    <label htmlFor="audioFile" className="form-label">Audio-Datei (MP3)</label>
                    {/* 🚨 KORRIGIERT: name-Attribut anpassen */}
                    <input type="file" name="track" id="audioFile" accept="audio/mpeg" onChange={handleFileChange} className="form-input" required />
                </div>
                <div className="form-group">
                    <label htmlFor="coverArtFile" className="form-label">Cover-Art (optional)</label>
                    {/* 🚨 KORRIGIERT: name-Attribut anpassen */}
                    <input type="file" name="cover" id="coverArtFile" accept="image/*" onChange={handleFileChange} className="form-input" />
                </div>
                <button type="submit" className="upload-button" disabled={loading}>
                    {loading ? 'Lade hoch...' : 'Hochladen'}
                </button>
            </form>
            {message && <p className={`message ${message.includes('erfolgreich') ? 'success-message' : 'error-message'}`}>{message}</p>}
        </div>
    );
};

export default UploadPage;
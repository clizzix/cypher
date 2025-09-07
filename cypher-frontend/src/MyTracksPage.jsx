import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './TracksPage.css'; // Wir verwenden die gleiche CSS-Datei

const API_URL = 'http://localhost:3000/api';

const MyTracksPage = ({ token, user }) => {
    const [tracks, setTracks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editingTrack, setEditingTrack] = useState(null);
    const [formData, setFormData] = useState({ title: '', genre: '', description: '', coverArtFile: null });
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetchMyTracks();
    }, [token]);

    const fetchMyTracks = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_URL}/tracks/user`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setTracks(response.data);
        } catch (err) {
            setError('Fehler beim Abrufen deiner Tracks.');
            console.error('Fetch My Tracks Error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (trackId) => {
        if (window.confirm('Möchtest du diesen Track wirklich löschen?')) {
            try {
                await axios.delete(`${API_URL}/tracks/${trackId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setMessage('Track erfolgreich gelöscht!');
                fetchMyTracks();
            } catch (err) {
                setMessage('Fehler beim Löschen des Tracks.');
                console.error('Delete Track Error:', err);
            }
        }
    };

    const startEditing = (track) => {
        setEditingTrack(track.track_id);
        setFormData({
            title: track.title,
            genre: track.genre,
            description: track.description,
            coverArtFile: null
        });
    };

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e) => {
        setFormData(prev => ({ ...prev, coverArtFile: e.target.files[0] }));
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        const updateFormData = new FormData();
        updateFormData.append('title', formData.title);
        updateFormData.append('genre', formData.genre);
        updateFormData.append('description', formData.description);
        if (formData.coverArtFile) {
            updateFormData.append('coverArt', formData.coverArtFile);
        }

        try {
            await axios.put(`${API_URL}/tracks/${editingTrack}`, updateFormData, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
            setMessage('Track erfolgreich aktualisiert!');
            setEditingTrack(null);
            fetchMyTracks();
        } catch (err) {
            setMessage('Fehler beim Aktualisieren des Tracks.');
            console.error('Update Track Error:', err);
        }
    };

    if (loading) return <div className="loading-container">Lade deine Tracks...</div>;
    if (error) return <div className="error-container">{error}</div>;

    return (
        <div className="tracks-page-container">
            <h2 className="page-title">Meine Tracks</h2>
            {message && <p className={`message ${message.includes('erfolgreich') ? 'success' : 'error'}`}>{message}</p>}
            <div className="track-list">
                {tracks.length > 0 ? (
                    tracks.map(track => (
                        <div key={track.track_id} className="track-card">
                            {editingTrack === track.track_id ? (
                                <form onSubmit={handleUpdate} className="edit-form">
                                    <div className="form-group">
                                        <label>Titel:</label>
                                        <input type="text" name="title" value={formData.title} onChange={handleFormChange} required />
                                    </div>
                                    <div className="form-group">
                                        <label>Genre:</label>
                                        <select name="genre" value={formData.genre} onChange={handleFormChange} required>
                                            <option value="">Wähle ein Genre</option>
                                            <option value="Rock">Rock</option>
                                            <option value="Pop">Pop</option>
                                            <option value="Electronic">Electronic</option>
                                            <option value="Hip-Hop">Hip-Hop</option>
                                            <option value="Jazz">Jazz</option>
                                            <option value="Classical">Classical</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Beschreibung:</label>
                                        <textarea name="description" value={formData.description} onChange={handleFormChange} />
                                    </div>
                                    <div className="form-group">
                                        <label>Neues Cover-Art:</label>
                                        <input type="file" name="coverArtFile" onChange={handleFileChange} />
                                    </div>
                                    <div className="button-group">
                                        <button type="submit" className="save-button">Speichern</button>
                                        <button type="button" onClick={() => setEditingTrack(null)} className="cancel-button">Abbrechen</button>
                                    </div>
                                </form>
                            ) : (
                                <>
                                    <h3 className="track-title">{track.title}</h3>
                                    <p className="track-artist">von {track.artist_name}</p>
                                    <p className="track-genre">Genre: {track.genre}</p>
                                    <div className="button-group">
                                        <button onClick={() => startEditing(track)} className="edit-button">Bearbeiten</button>
                                        <button onClick={() => handleDelete(track.track_id)} className="delete-button">Löschen</button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))
                ) : (
                    <p>Du hast noch keine Tracks hochgeladen.</p>
                )}
            </div>
        </div>
    );
};

export default MyTracksPage;
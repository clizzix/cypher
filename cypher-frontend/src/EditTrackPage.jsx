import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';

const API_URL = 'http://localhost:3000/api';

const EditTrackPage = ({ token }) => {
    const { trackId } = useParams();
    const navigate = useNavigate();
    const [track, setTrack] = useState(null);
    const [title, setTitle] = useState('');
    const [genre, setGenre] = useState('');
    const [description, setDescription] = useState('');
    const [coverArt, setCoverArt] = useState(null);
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTrackDetails = async () => {
            try {
                // Abrufen der Details des spezifischen Tracks
                const response = await axios.get(`${API_URL}/tracks/user`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const userTracks = response.data;
                const foundTrack = userTracks.find(t => t.track_id === trackId);

                if (foundTrack) {
                    setTrack(foundTrack);
                    setTitle(foundTrack.title);
                    setGenre(foundTrack.genre);
                    setDescription(foundTrack.description);
                    setMessage('');
                } else {
                    setMessage('Track nicht gefunden oder Zugriff verweigert.');
                }
            } catch (error) {
                console.error('Fehler beim Abrufen der Track-Details:', error);
                setMessage('Fehler beim Laden der Track-Details.');
            } finally {
                setLoading(false);
            }
        };

        if (trackId) {
            fetchTrackDetails();
        }
    }, [trackId, token]);

    const handleUpdate = async (event) => {
        event.preventDefault();
        setMessage('');

        const formData = new FormData();
        formData.append('title', title);
        formData.append('genre', genre);
        formData.append('description', description);
        if (coverArt) {
            formData.append('coverArt', coverArt);
        }

        try {
            await axios.put(`${API_URL}/tracks/${trackId}`, formData, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data',
                },
            });
            setMessage('Track erfolgreich aktualisiert!');
            // Erfolgsmeldung anzeigen und dann zurücknavigieren
            setTimeout(() => {
                navigate('/profile');
            }, 1500);
        } catch (error) {
            setMessage(error.response?.data?.message || 'Ein Fehler ist aufgetreten.');
            console.error('Fehler beim Aktualisieren:', error);
        }
    };

    if (loading) {
        return <div style={{ padding: '20px' }}>Lädt Track-Details...</div>;
    }

    if (!track) {
        return <div style={{ padding: '20px', color: 'red' }}>{message}</div>;
    }

    return (
        <div style={{ padding: '20px', fontFamily: 'Arial' }}>
            <h1>Track bearbeiten: {track.title}</h1>
            <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <input
                    type="text"
                    placeholder="Titel"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                />
                <select value={genre} onChange={(e) => setGenre(e.target.value)} required>
                    <option value="">Wähle ein Genre</option>
                    <option value="Rock">Rock</option>
                    <option value="Pop">Pop</option>
                    <option value="Jazz">Jazz</option>
                    <option value="Hip Hop">Hip Hop</option>
                    <option value="Electronic">Electronic</option>
                </select>
                <textarea
                    placeholder="Beschreibung"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows="4"
                />
                <div>
                    <label>Neues Cover Art hochladen:</label>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setCoverArt(e.target.files[0])}
                    />
                </div>
                {track.cover_art_key && (
                    <div style={{ marginTop: '10px' }}>
                        <p>Aktuelles Cover-Art:</p>
                        <img
                            src={`${API_URL}/tracks/cover/${track.cover_art_key}?token=${token}`}
                            alt="Current Cover Art"
                            style={{ maxWidth: '200px', height: 'auto' }}
                        />
                    </div>
                )}
                <button type="submit">Änderungen speichern</button>
            </form>
            {message && <p style={{ marginTop: '10px', color: 'red' }}>{message}</p>}
        </div>
    );
};

export default EditTrackPage;
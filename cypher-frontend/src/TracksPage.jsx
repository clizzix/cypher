import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

const TracksPage = ({ token }) => {
    const [tracks, setTracks] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedGenre, setSelectedGenre] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(true);

    const fetchTracks = async () => {
        setLoading(true);
        setMessage('');
        try {
            const response = await axios.get(`${API_URL}/tracks`, {
                headers: { 'Authorization': `Bearer ${token}` },
                params: { q: searchTerm, genre: selectedGenre }
            });
            setTracks(response.data);
        } catch (error) {
            setMessage(error.response?.data?.message || 'Tracks konnten nicht geladen werden.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTracks();
    }, [token, selectedGenre]);

    const handleSearch = (e) => {
        e.preventDefault();
        fetchTracks();
    };

    const handleDownload = async (trackId) => {
        try {
            const response = await axios.get(`${API_URL}/tracks/download/${trackId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            window.open(response.data.downloadUrl, '_blank');
        } catch (error) {
            setMessage(error.response?.data?.message || 'Download fehlgeschlagen.');
        }
    };

    if (loading) {
        return <p>Lade Tracks...</p>;
    }

    return (
        <div style={{ padding: '20px', fontFamily: 'Arial' }}>
            <h1>Tracks entdecken</h1>
            <form onSubmit={handleSearch} style={{ marginBottom: '20px' }}>
                <input
                    type="text"
                    placeholder="Suche nach Titel oder Künstler..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ marginRight: '10px' }}
                />
                <select value={selectedGenre} onChange={(e) => setSelectedGenre(e.target.value)} style={{ marginRight: '10px' }}>
                    <option value="">Alle Genres</option>
                    <option value="Rock">Rock</option>
                    <option value="Pop">Pop</option>
                    <option value="Jazz">Jazz</option>
                    <option value="Hip Hop">Hip Hop</option>
                    <option value="Electronic">Electronic</option>
                </select>
                <button type="submit">Suchen</button>
            </form>

            {message && <p style={{ color: 'red' }}>{message}</p>}

            {tracks.length > 0 ? (
                <ul style={{ listStyleType: 'none', padding: 0 }}>
                    {tracks.map(track => (
                        <li key={track.track_id} style={{
                            border: '1px solid #ccc',
                            margin: '10px 0',
                            padding: '15px',
                            borderRadius: '5px',
                            display: 'flex',
                            gap: '20px',
                            alignItems: 'center'
                        }}>
                            {track.cover_art_key ? (
                                <img
                                    src={`${API_URL}/tracks/cover/${track.cover_art_key}?token=${token}`}
                                    alt={`Cover für ${track.title}`}
                                    style={{ width: '100px', height: '100px', objectFit: 'cover' }}
                                />
                            ) : (
                                <div style={{ width: '100px', height: '100px', backgroundColor: '#e0e0e0', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '12px', textAlign: 'center' }}>
                                    Kein Cover
                                </div>
                            )}
                            <div>
                                <h3>{track.title}</h3>
                                <p><strong>Künstler:</strong> {track.artist_name}</p>
                                <p><strong>Genre:</strong> {track.genre}</p>
                                <p><strong>Beschreibung:</strong> {track.description}</p>
                                <button onClick={() => handleDownload(track.track_id)}>Download</button>
                            </div>
                        </li>
                    ))}
                </ul>
            ) : (
                <p>Keine Tracks gefunden.</p>
            )}
        </div>
    );
};

export default TracksPage;
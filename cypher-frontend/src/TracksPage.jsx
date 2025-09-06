import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './TracksPage.css'; // <-- Importiere die neue CSS-Datei

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
        return <p className="loading-message">Lade Tracks...</p>;
    }

    return (
        <div className="tracks-container">
            <h1 className="page-title">Tracks entdecken</h1>
            <form onSubmit={handleSearch} className="search-form">
                <input
                    type="text"
                    placeholder="Suche nach Titel oder Künstler..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                />
                <select 
                    value={selectedGenre} 
                    onChange={(e) => setSelectedGenre(e.target.value)} 
                    className="search-select"
                >
                    <option value="">Alle Genres</option>
                    <option value="Rock">Rock</option>
                    <option value="Pop">Pop</option>
                    <option value="Jazz">Jazz</option>
                    <option value="Hip Hop">Hip Hop</option>
                    <option value="Electronic">Electronic</option>
                </select>
                <button type="submit" className="search-button">Suchen</button>
            </form>

            {message && <p className="message">{message}</p>}

            {tracks.length > 0 ? (
                <ul className="tracks-list">
                    {tracks.map(track => (
                        <li key={track.track_id} className="track-item">
                            {track.cover_art_key ? (
                                <img
                                    src={`${API_URL}/tracks/cover/${track.cover_art_key}?token=${token}`}
                                    alt={`Cover für ${track.title}`}
                                    className="track-cover"
                                />
                            ) : (
                                <div className="track-cover-placeholder">
                                    <p>Kein Cover</p>
                                </div>
                            )}
                            <div className="track-info">
                                <h3 className="track-title">{track.title}</h3>
                                <p className="track-artist">von {track.artist_name}</p>
                                <p className="track-genre">{track.genre}</p>
                                <p className="track-description">{track.description}</p>
                                <button onClick={() => handleDownload(track.track_id)} className="download-button">Download</button>
                            </div>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="message">Keine Tracks gefunden.</p>
            )}
        </div>
    );
};

export default TracksPage;
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import './PlaylistsPage.css'; // <-- CSS-Datei importieren

const API_URL = 'http://localhost:3000/api';

const PlaylistsPage = ({ token, user }) => {
    const [playlists, setPlaylists] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [newPlaylistName, setNewPlaylistName] = useState('');
    const [expandedPlaylist, setExpandedPlaylist] = useState(null);
    const [currentAudio, setCurrentAudio] = useState(null);

    const fetchPlaylists = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_URL}/playlists`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            setPlaylists(response.data);
        } catch (error) {
            setMessage('Fehler beim Abrufen der Playlists.');
            console.error('Fehler beim Abrufen der Playlists:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchPlaylistDetails = async (playlistId) => {
        try {
            const response = await axios.get(`${API_URL}/playlists/${playlistId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            return response.data;
        } catch (error) {
            setMessage('Fehler beim Abrufen der Playlist-Details.');
            console.error('Fehler beim Abrufen der Playlist-Details:', error);
            return null;
        }
    };

    useEffect(() => {
        fetchPlaylists();
    }, [token]);

    const handleCreatePlaylist = async (e) => {
        e.preventDefault();
        if (!newPlaylistName) {
            setMessage('Der Playlist-Name darf nicht leer sein.');
            return;
        }

        try {
            await axios.post(`${API_URL}/playlists`, { name: newPlaylistName }, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            setMessage('Playlist erfolgreich erstellt.');
            setNewPlaylistName('');
            fetchPlaylists();
        } catch (error) {
            setMessage(error.response?.data?.message || 'Fehler beim Erstellen der Playlist.');
            console.error('Erstellungsfehler:', error);
        }
    };

    const handleDeletePlaylist = async (playlistId) => {
        try {
            await axios.delete(`${API_URL}/playlists/${playlistId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            setMessage('Playlist erfolgreich gelöscht.');
            fetchPlaylists();
        } catch (error) {
            setMessage(error.response?.data?.message || 'Fehler beim Löschen der Playlist.');
            console.error('Löschfehler:', error);
        }
    };

    const handleToggleExpand = async (playlistId) => {
        if (expandedPlaylist && expandedPlaylist.playlist_id === playlistId) {
            setExpandedPlaylist(null); // Zusammenklappen, wenn es bereits erweitert ist
        } else {
            const playlistDetails = await fetchPlaylistDetails(playlistId);
            if (playlistDetails) {
                setExpandedPlaylist(playlistDetails); // Erweitern und Details speichern
            }
        }
    };

    const handleDownload = async (trackId) => {
        try {
            const response = await axios.get(`${API_URL}/tracks/download/${trackId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            return response.data.downloadUrl;
        } catch (error) {
            setMessage('Fehler beim Generieren der Download-URL.');
            console.error('Fehler beim Herunterladen des Tracks:', error);
            return null;
        }
    };

    const handlePlay = async (track) => {
        const audioUrl = await handleDownload(track.track_id);
        if (audioUrl) {
            if (currentAudio) {
                currentAudio.pause();
            }
            const newAudio = new Audio(audioUrl);
            newAudio.play();
            setCurrentAudio(newAudio);
        }
    };

    const handleRemoveTrack = async (playlistId, trackId) => {
        try {
            await axios.delete(`${API_URL}/playlists/${playlistId}/tracks/${trackId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            setMessage('Track erfolgreich aus der Playlist entfernt.');
            // Update the expanded playlist state to reflect the removal
            setExpandedPlaylist(prevState => ({
                ...prevState,
                tracks: prevState.tracks.filter(track => track.track_id !== trackId)
            }));
        } catch (error) {
            setMessage(error.response?.data?.message || 'Fehler beim Entfernen des Tracks aus der Playlist.');
            console.error('Fehler beim Entfernen des Tracks:', error);
        }
    };

    if (loading) {
        return <p className="loading-message">Lade Playlists...</p>
    }

    return (
        <div className="playlists-container">
            <h1 className="page-title">Meine Playlists</h1>
            <form onSubmit={handleCreatePlaylist} className="playlist-form">
                <input
                    type="text"
                    placeholder="Name der neuen Playlist"
                    value={newPlaylistName}
                    onChange={(e) => setNewPlaylistName(e.target.value)}
                    className="playlist-input"
                    required
                />
                <button type="submit" className="create-button">Playlist erstellen</button>
            </form>

            {message && <p className="message">{message}</p>}

            {playlists.length > 0 ? (
                <ul className="playlist-list">
                    {playlists.map((playlist) => (
                        <li key={playlist.playlist_id} className="playlist-item">
                            <div className="playlist-header">
                                <h3 className="playlist-name">{playlist.name}</h3>
                                <div className="playlist-actions">
                                    <button onClick={() => handleToggleExpand(playlist.playlist_id)} className="action-button view-button">
                                        {expandedPlaylist?.playlist_id === playlist.playlist_id ? 'Verbergen' : 'Anzeigen'}
                                    </button>
                                    <button onClick={() => handleDeletePlaylist(playlist.playlist_id)} className="action-button delete-button">
                                        Löschen
                                    </button>
                                </div>
                            </div>
                            {expandedPlaylist?.playlist_id === playlist.playlist_id && (
                                <div className="expanded-content">
                                    <h4>Tracks:</h4>
                                    {expandedPlaylist.tracks.length > 0 ? (
                                        <ul className="track-list">
                                            {expandedPlaylist.tracks.map(track => (
                                                <li key={track.track_id} className="track-item">
                                                    <span className="track-title">{track.title} von {track.artist_name}</span>
                                                    <div className="track-actions">
                                                        <button onClick={() => handlePlay(track)} className="play-button">Wiedergabe</button>
                                                        <button onClick={() => handleRemoveTrack(playlist.playlist_id, track.track_id)} className="remove-button">
                                                            Entfernen
                                                        </button>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="empty-message">Keine Tracks in dieser Playlist.</p>
                                    )}
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="empty-message">Du hast noch keine Playlists erstellt.</p>
            )}
        </div>
    );
};

export default PlaylistsPage;
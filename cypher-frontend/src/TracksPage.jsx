import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

const TracksPage = ({ token }) => {
    const [tracks, setTracks] = useState([]);
    const [message, setMessage] = useState('');
    const [currentAudio, setCurrentAudio] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedGenre, setSelectedGenre] = useState('');
    const [genres, setGenres] = useState([]);
    const [playlists, setPlaylists] = useState([]);
    const [selectedPlaylist, setSelectedPlaylist] = useState('');
    const [loading, setLoading] = useState(true);
    const [commentText, setCommentText] = useState({});
    const [trackComments, setTrackComments] = useState({});
    const [trackLikes, setTrackLikes] = useState({});

    const fetchTracks = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_URL}/tracks`, {
                headers: { 'Authorization': `Bearer ${token}` },
                params: { q: searchTerm, genre: selectedGenre }
            });
            setTracks(response.data);
        } catch (error) {
            setMessage('Fehler beim Abrufen der Tracks.');
            console.error('Fehler beim Abrufen der Tracks:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchPlaylists = async () => {
        try {
            const response = await axios.get(`${API_URL}/playlists`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setPlaylists(response.data);
        } catch (error) {
            console.error('Fehler beim Abrufen der Playlists:', error);
        }
    };

    const fetchGenres = async () => {
        const availableGenres = ['Rock', 'Pop', 'Jazz', 'Hip Hop', 'Electronic'];
        setGenres(availableGenres);
    };

    const fetchCommentsAndLikes = async () => {
        // Parallel alle Kommentare und Likes abrufen
        const commentsPromises = tracks.map(track =>
            axios.get(`${API_URL}/tracks/${track.track_id}/comments`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
        );

        const likesPromises = tracks.map(track =>
            axios.get(`${API_URL}/tracks/${track.track_id}/likes`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
        );

        try {
            const commentsResponses = await Promise.all(commentsPromises);
            const likesResponses = await Promise.all(likesPromises);

            const newComments = {};
            commentsResponses.forEach((res, index) => {
                const trackId = tracks[index].track_id;
                newComments[trackId] = res.data;
            });

            const newLikes = {};
            likesResponses.forEach((res, index) => {
                const trackId = tracks[index].track_id;
                newLikes[trackId] = res.data;
            });

            setTrackComments(newComments);
            setTrackLikes(newLikes);
        } catch (error) {
            console.error('Fehler beim Abrufen von Kommentaren oder Likes:', error);
        }
    };

    useEffect(() => {
        fetchTracks();
        fetchPlaylists();
        fetchGenres();
    }, [token, searchTerm, selectedGenre]);

    useEffect(() => {
        if (tracks.length > 0) {
            fetchCommentsAndLikes();
        }
    }, [tracks]);

    const handleDownload = async (trackId) => {
        try {
            const response = await axios.get(`${API_URL}/tracks/download/${trackId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
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

    const handleAddToPlaylist = async (trackId) => {
        if (!selectedPlaylist) {
            setMessage('Bitte wähle eine Playlist aus.');
            return;
        }
        try {
            await axios.post(`${API_URL}/playlists/${selectedPlaylist}/tracks`, { trackId }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setMessage('Track erfolgreich zur Playlist hinzugefügt!');
        } catch (error) {
            setMessage(error.response?.data?.message || 'Fehler beim Hinzufügen des Tracks zur Playlist.');
            console.error('Fehler beim Hinzufügen des Tracks:', error);
        }
    };

    const handlePostComment = async (trackId) => {
        if (!commentText[trackId] || commentText[trackId].trim() === '') {
            return;
        }

        try {
            const response = await axios.post(`${API_URL}/tracks/${trackId}/comments`, { commentText: commentText[trackId] }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            // Füge den neuen Kommentar dem State hinzu
            setTrackComments(prevComments => ({
                ...prevComments,
                [trackId]: [...(prevComments[trackId] || []), response.data.comment]
            }));
            setCommentText(prev => ({ ...prev, [trackId]: '' })); // Eingabefeld leeren
        } catch (error) {
            console.error('Fehler beim Senden des Kommentars:', error);
            setMessage('Fehler beim Senden des Kommentars.');
        }
    };

    const handleLikeTrack = async (trackId) => {
        try {
            await axios.post(`${API_URL}/tracks/${trackId}/like`, {}, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            // Likes-Zustand aktualisieren
            setTrackLikes(prevLikes => {
                const isLiked = prevLikes[trackId]?.userLiked;
                return {
                    ...prevLikes,
                    [trackId]: {
                        likeCount: isLiked ? prevLikes[trackId].likeCount - 1 : prevLikes[trackId].likeCount + 1,
                        userLiked: !isLiked
                    }
                };
            });
        } catch (error) {
            console.error('Fehler beim Liken/Unliken:', error);
            setMessage('Fehler beim Liken/Unliken des Tracks.');
        }
    };

    return (
        <div style={{ padding: '20px', fontFamily: 'Arial' }}>
            <h1>Entdecke Musik</h1>
            <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
                <input
                    type="text"
                    placeholder="Suche nach Titel oder Künstler"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ padding: '8px', width: '300px' }}
                />
                <select
                    value={selectedGenre}
                    onChange={(e) => setSelectedGenre(e.target.value)}
                    style={{ padding: '8px' }}
                >
                    <option value="">Alle Genres</option>
                    {genres.map(genre => (
                        <option key={genre} value={genre}>{genre}</option>
                    ))}
                </select>
            </div>
            {message && <p style={{ color: 'red' }}>{message}</p>}

            {loading ? (
                <p>Tracks werden geladen...</p>
            ) : (
                <ul style={{ listStyleType: 'none', padding: 0 }}>
                    {tracks.length > 0 ? (
                        tracks.map((track) => (
                            <li key={track.track_id} style={{ border: '1px solid #ccc', margin: '10px 0', padding: '10px', display: 'flex', flexDirection: 'column' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                    <div>
                                        <h3>{track.title}</h3>
                                        <p>Künstler: {track.artist_name}</p>
                                        <p>Genre: {track.genre}</p>
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button onClick={() => handleLikeTrack(track.track_id)} style={{ backgroundColor: trackLikes[track.track_id]?.userLiked ? 'blue' : 'gray', color: 'white', border: 'none' }}>
                                            ❤️ ({trackLikes[track.track_id]?.likeCount || 0})
                                        </button>
                                        <select
                                            value={selectedPlaylist}
                                            onChange={(e) => setSelectedPlaylist(e.target.value)}
                                            style={{ padding: '8px' }}
                                        >
                                            <option value="">Playlist wählen</option>
                                            {playlists.map(playlist => (
                                                <option key={playlist.playlist_id} value={playlist.playlist_id}>{playlist.name}</option>
                                            ))}
                                        </select>
                                        <button onClick={() => handleAddToPlaylist(track.track_id)}>
                                            + Playlist
                                        </button>
                                        <button onClick={() => handlePlay(track)}>Wiedergabe</button>
                                    </div>
                                </div>
                                <div style={{ borderTop: '1px solid #eee', paddingTop: '10px' }}>
                                    <h4>Kommentare:</h4>
                                    <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                                        {trackComments[track.track_id]?.length > 0 ? (
                                            trackComments[track.track_id].map((comment, index) => (
                                                <div key={index} style={{ marginBottom: '5px' }}>
                                                    <strong>{comment.email || comment.artist_name}:</strong> {comment.comment_text}
                                                </div>
                                            ))
                                        ) : (
                                            <p>Noch keine Kommentare.</p>
                                        )}
                                    </div>
                                    <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
                                        <input
                                            type="text"
                                            placeholder="Schreibe einen Kommentar..."
                                            value={commentText[track.track_id] || ''}
                                            onChange={(e) => setCommentText({ ...commentText, [track.track_id]: e.target.value })}
                                            style={{ flex: 1, padding: '5px' }}
                                        />
                                        <button onClick={() => handlePostComment(track.track_id)}>Senden</button>
                                    </div>
                                </div>
                            </li>
                        ))
                    ) : (
                        <p>Keine Tracks gefunden, die den Kriterien entsprechen.</p>
                    )}
                </ul>
            )}
        </div>
    );
};

export default TracksPage;
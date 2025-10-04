import React, { useState, useEffect } from 'react';
import axios from 'axios';
import TrackCard from './TrackCard'; 
import AudioPlayer from './AudioPlayer'; 
import './TracksPage.css';

const API_URL = 'http://localhost:3000/api';

const TracksPage = ({ token }) => {
    const [tracks, setTracks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [commentText, setCommentText] = useState('');
    const [activeTrack, setActiveTrack] = useState(null);
    const [comments, setComments] = useState([]);
    const [likes, setLikes] = useState({ likeCount: 0, userLiked: false });
    const [currentTrack, setCurrentTrack] = useState(null); 
    // 🟢 NEU: Speichere die ID des aktiven Tracks zur Hervorhebung
    const currentTrackId = currentTrack ? currentTrack.track_id : null; 

    useEffect(() => {
        const fetchTracks = async () => {
            try {
                setLoading(true);
                const response = await axios.get(`${API_URL}/tracks`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                setTracks(response.data);
            } catch (err) {
                setError('Fehler beim Abrufen der Tracks.');
                console.error('Fetch Tracks Error:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchTracks();
    }, [token]);

    const fetchTrackDetails = async (trackId) => {
        if (activeTrack === trackId) {
            setActiveTrack(null);
            setComments([]);
            setLikes({ likeCount: 0, userLiked: false });
            return;
        }
        // [Unveränderte Logik zum Abrufen von Kommentaren und Likes...]
        try {
            const commentsResponse = await axios.get(`${API_URL}/tracks/${trackId}/comments`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setComments(commentsResponse.data);

            const likesResponse = await axios.get(`${API_URL}/tracks/${trackId}/likes`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setLikes(likesResponse.data);
            setActiveTrack(trackId);
        } catch (err) {
            console.error('Fehler beim Abrufen der Track-Details:', err);
            setError('Track-Details konnten nicht geladen werden.');
        }
    };

    // [Unveränderte handleCommentSubmit und handleLike Funktionen...]
    const handleCommentSubmit = async (e) => {
        e.preventDefault();
        if (!commentText.trim() || !activeTrack) return;

        try {
            await axios.post(`${API_URL}/tracks/${activeTrack}/comments`, { commentText }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCommentText('');
            fetchTrackDetails(activeTrack);
        } catch (err) {
            console.error('Fehler beim Hinzufügen des Kommentars:', err);
            setError('Kommentar konnte nicht hinzugefügt werden.');
        }
    };

    const handleLike = async () => {
        if (!activeTrack) return;
        try {
            await axios.post(`${API_URL}/tracks/${activeTrack}/like`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchTrackDetails(activeTrack);
        } catch (err) {
            console.error('Fehler beim Liken/Unliken:', err);
            setError('Like konnte nicht verarbeitet werden.');
        }
    };
    
    // Funktion zum Starten der Wiedergabe
    const handlePlayTrack = (track) => {
        setCurrentTrack(track); 
    };

    // 🟢 NEU: Logik für das automatische Abspielen des nächsten Tracks
    const handlePlaybackEnd = () => {
        if (!currentTrack) return;

        // 1. Finde den Index des aktuell gespielten Tracks in der Hauptliste
        const currentIndex = tracks.findIndex(t => t.track_id === currentTrack.track_id);
        
        // 2. Bestimme den Index des nächsten Tracks
        const nextIndex = currentIndex !== -1 ? currentIndex + 1 : -1;
        
        // 3. Wenn ein nächster Track existiert, starte die Wiedergabe
        if (nextIndex < tracks.length && nextIndex !== -1) {
            const nextTrack = tracks[nextIndex];
            setCurrentTrack(nextTrack);
            console.log(`Wiedergabe beendet. Starte nächsten Track: ${nextTrack.title}`);
        } else {
            // 4. Andernfalls beende die Wiedergabe (Playlistende)
            setCurrentTrack(null);
            console.log("Wiedergabe beendet. Ende der Playlist.");
        }
    };


    if (loading) return <div className="loading">Lade Tracks...</div>;
    if (error) return <div className="error">{error}</div>;

    return (
        <div className="tracks-page-container pb-20"> 
            <h2 className="page-title">Entdecke Tracks</h2>
            <div className="track-list">
                {tracks.map(track => (
                    <TrackCard
                        key={track.track_id}
                        track={track}
                        token={token}
                        activeTrack={activeTrack}
                        // 🟢 NEU: Übergabe der ID des aktuell *abgespielten* Tracks zur Hervorhebung
                        currentPlayingTrackId={currentTrackId} 
                        setActiveTrack={setActiveTrack}
                        handleLike={handleLike}
                        likes={likes}
                        comments={comments}
                        handleCommentSubmit={handleCommentSubmit}
                        setCommentText={setCommentText}
                        commentText={commentText}
                        fetchTrackDetails={fetchTrackDetails}
                        handlePlay={handlePlayTrack} 
                    />
                ))}
            </div>

            {currentTrack && (
                <AudioPlayer 
                    track={currentTrack} 
                    token={token}
                    onPlaybackEnd={handlePlaybackEnd} 
                />
            )}
        </div>
    );
};

export default TracksPage;
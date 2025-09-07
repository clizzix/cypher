import React, { useState, useEffect } from 'react';
import axios from 'axios';
import TrackCard from './TrackCard'; // Importiere die neue Komponente
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

        try {
            const commentsResponse = await axios.get(`${API_URL}/tracks/${trackId}/comments`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            setComments(commentsResponse.data);

            const likesResponse = await axios.get(`${API_URL}/tracks/${trackId}/likes`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            setLikes(likesResponse.data);
            setActiveTrack(trackId);
        } catch (err) {
            console.error('Fehler beim Abrufen der Track-Details:', err);
            setError('Track-Details konnten nicht geladen werden.');
        }
    };

    const handleCommentSubmit = async (e) => {
        e.preventDefault();
        if (!commentText.trim() || !activeTrack) return;

        try {
            await axios.post(`${API_URL}/tracks/${activeTrack}/comments`, { commentText }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
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
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            fetchTrackDetails(activeTrack);
        } catch (err) {
            console.error('Fehler beim Liken/Unliken:', err);
            setError('Like konnte nicht verarbeitet werden.');
        }
    };

    if (loading) return <div className="loading">Lade Tracks...</div>;
    if (error) return <div className="error">{error}</div>;

    return (
        <div className="tracks-page-container">
            <h2 className="page-title">Entdecke Tracks</h2>
            <div className="track-list">
                {tracks.map(track => (
                    <TrackCard
                        key={track.track_id}
                        track={track}
                        token={token}
                        activeTrack={activeTrack}
                        setActiveTrack={setActiveTrack}
                        handleLike={handleLike}
                        likes={likes}
                        comments={comments}
                        handleCommentSubmit={handleCommentSubmit}
                        setCommentText={setCommentText}
                        commentText={commentText}
                        fetchTrackDetails={fetchTrackDetails}
                    />
                ))}
            </div>
        </div>
    );
};

export default TracksPage;
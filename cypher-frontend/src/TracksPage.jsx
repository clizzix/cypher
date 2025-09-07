import React, { useState, useEffect } from 'react';
import axios from 'axios';
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
        // Wenn der gleiche Track erneut geklickt wird, schließe die Details
        if (activeTrack === trackId) {
            setActiveTrack(null);
            setComments([]);
            setLikes({ likeCount: 0, userLiked: false });
            return;
        }

        try {
            // Lade Kommentare für den spezifischen Track
            const commentsResponse = await axios.get(`${API_URL}/tracks/${trackId}/comments`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            setComments(commentsResponse.data);

            // Lade Likes für den spezifischen Track
            const likesResponse = await axios.get(`${API_URL}/tracks/${trackId}/likes`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            setLikes(likesResponse.data);

            setActiveTrack(trackId); // Setze den aktiven Track-Zustand auf die geklickte ID
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
                    <div key={track.track_id} className="track-card">
                        <h3 className="track-title">{track.title}</h3>
                        <p className="track-artist">von {track.artist_name}</p>
                        <p className="track-genre">Genre: {track.genre}</p>
                        <button 
                            className="details-button"
                            onClick={() => fetchTrackDetails(track.track_id)}
                        >
                            {activeTrack === track.track_id ? 'Details ausblenden' : 'Details anzeigen'}
                        </button>
                        
                        {/* Die Details werden nur angezeigt, wenn die trackId mit der aktivenId übereinstimmt */}
                        {activeTrack === track.track_id && (
                            <div className="track-details">
                                <p className="track-description">{track.description}</p>
                                
                                <div className="likes-section">
                                    <button 
                                        onClick={handleLike} 
                                        className={`like-button ${likes.userLiked ? 'liked' : ''}`}
                                    >
                                        {likes.userLiked ? 'Geliked' : 'Like'} ({likes.likeCount})
                                    </button>
                                </div>

                                <div className="comments-section">
                                    <h4>Kommentare:</h4>
                                    <ul className="comments-list">
                                        {comments.length > 0 ? (
                                            comments.map(comment => (
                                                <li key={comment.comment_id} className="comment-item">
                                                    <strong>{comment.artist_name || comment.email}:</strong> {comment.comment_text}
                                                </li>
                                            ))
                                        ) : (
                                            <p className="no-comments">Noch keine Kommentare.</p>
                                        )}
                                    </ul>
                                    <form onSubmit={handleCommentSubmit} className="comment-form">
                                        <textarea
                                            value={commentText}
                                            onChange={(e) => setCommentText(e.target.value)}
                                            placeholder="Schreiben Sie einen Kommentar..."
                                            rows="3"
                                        />
                                        <button type="submit" className="submit-comment-button">Kommentar absenden</button>
                                    </form>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TracksPage;
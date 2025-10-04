import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AddToPlaylistButton from './AddToPlaylistButton';

const API_URL = 'http://localhost:3000/api';
// Ersetze dies mit dem Pfad zu deinem Standard-Cover-Bild
const DEFAULT_COVER_URL = '/images/default-cover.png'; 

const TrackCard = ({ track, token, activeTrack, setActiveTrack, handleLike, likes, comments, handleCommentSubmit, setCommentText, commentText, fetchTrackDetails, handlePlay }) => {
    const [coverArtUrl, setCoverArtUrl] = useState(DEFAULT_COVER_URL);

    useEffect(() => {
        const fetchCoverArtUrl = async () => {
            // Wir verwenden den S3 Key aus der Datenbank
            const keyToUse = track.cover_art_key || track.file_key; 
            
            // Wenn der cover_art_key fehlt, versuchen wir nicht, ihn abzurufen, 
            // und verwenden den Standard-Platzhalter.
            if (keyToUse) {
                const encodedKey = encodeURIComponent(keyToUse);
                try {
                    const response = await axios.get(
                        // Die URL ist: /api/tracks/cover/<key>
                        `${API_URL}/tracks/cover/${encodedKey}`,
                        {
                            headers: {
                                Authorization: `Bearer ${token}`
                            }
                        }
                    );
                    setCoverArtUrl(response.data.url);
                } catch (error) {
                    console.error('Fehler beim Abrufen der Cover-Art-URL:', error);
                    // Im Fehlerfall auf das Standard-Bild zurückfallen
                    setCoverArtUrl(DEFAULT_COVER_URL);
                }
            } else {
                // Wenn kein Schlüssel vorhanden ist, das Standard-Bild verwenden
                setCoverArtUrl(DEFAULT_COVER_URL);
            }
        };

        fetchCoverArtUrl();
    }, [track.cover_art_key, token]); 

    const isTrackActive = activeTrack === track.track_id;

    return (
        <div className="track-card">
            <div className="track-header">
                {/* Zeige das Cover oder den Platzhalter an */}
                <img 
                    src={coverArtUrl} 
                    alt={`Cover für ${track.title}`} 
                    className="track-cover"
                />
                
                <div className="track-info">
                    <h3 className="track-title">{track.title}</h3>
                    <p className="track-artist">von {track.artist_name}</p>
                    <p className="track-genre">Genre: {track.genre}</p>
                </div>
            </div>
            
            {/* 🟢 NEU: Gruppe für Play und Details Button */}
            <div className="button-group-top">
                <button
                    onClick={() => handlePlay(track)}
                    className="play-button"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                    Abspielen
                </button>
                
                <button
                    className="details-button"
                    onClick={() => fetchTrackDetails(track.track_id)}
                >
                    {isTrackActive ? 'Details ausblenden' : 'Details anzeigen'}
                </button>
            </div>

            {isTrackActive && (
                <div className="track-details-container">
                    <p className="track-description">{track.description}</p>
                    
                    <div className="likes-section">
                        <button
                            onClick={handleLike}
                            className={`like-button ${likes.userLiked ? 'liked' : ''}`}
                        >
                            {likes.userLiked ? 'Geliked' : 'Like'} ({likes.likeCount})
                        </button>
                        <AddToPlaylistButton
                            trackId={track.track_id}
                            token={token}
                        />
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
    );
};

export default TrackCard;

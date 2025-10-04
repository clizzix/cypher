import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AddToPlaylistButton from './AddToPlaylistButton';

const API_URL = 'http://localhost:3000/api';
const DEFAULT_COVER_URL = '/images/default-cover.png'; 

// 🟢 NEU: currentPlayingTrackId wird als Prop hinzugefügt
const TrackCard = ({ track, token, activeTrack, setActiveTrack, handleLike, likes, comments, handleCommentSubmit, setCommentText, commentText, fetchTrackDetails, handlePlay, currentPlayingTrackId }) => {
    const [coverArtUrl, setCoverArtUrl] = useState(DEFAULT_COVER_URL);

    // [Unveränderter useEffect zur Abfrage der Cover-Art-URL...]
    useEffect(() => {
        const fetchCoverArtUrl = async () => {
            const keyToUse = track.cover_art_key || track.file_key; 
            
            if (keyToUse) {
                const encodedKey = encodeURIComponent(keyToUse);
                try {
                    const response = await axios.get(
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
                    setCoverArtUrl(DEFAULT_COVER_URL);
                }
            } else {
                setCoverArtUrl(DEFAULT_COVER_URL);
            }
        };

        fetchCoverArtUrl();
    }, [track.cover_art_key, token]); 

    const isTrackActive = activeTrack === track.track_id;
    // 🟢 NEU: Definiere, ob dieser Track gerade abgespielt wird
    const isThisTrackPlaying = currentPlayingTrackId === track.track_id;

    return (
        // 🟢 NEU: Dynamische Klasse 'is-playing' hinzufügen
        <div className={`track-card ${isThisTrackPlaying ? 'is-playing' : ''}`}>
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
            
            <div className="button-group-top">
                <button
                    onClick={() => handlePlay(track)}
                    // 🟢 NEU: Play-Button-Text/Icon anpassen, wenn der Track läuft
                    className={`play-button ${isThisTrackPlaying ? 'playing' : ''}`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block mr-1" viewBox="0 0 20 20" fill="currentColor">
                        {isThisTrackPlaying ? (
                            // Pause-Icon
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1zm1 5a1 1 0 000 2h4a1 1 0 100-2H8z" clipRule="evenodd" />
                        ) : (
                            // Play-Icon
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                        )}
                    </svg>
                    {isThisTrackPlaying ? 'Spielt...' : 'Abspielen'}
                </button>
                
                <button
                    className="details-button"
                    onClick={() => fetchTrackDetails(track.track_id)}
                >
                    {isTrackActive ? 'Details ausblenden' : 'Details anzeigen'}
                </button>
            </div>

            {/* [Unveränderte Details-Sektion] */}
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
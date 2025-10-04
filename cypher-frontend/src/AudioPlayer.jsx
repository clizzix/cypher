import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

/**
 * Zeigt einen fixierten HTML5 Audio Player an und spielt den übergebenen Track ab.
 * Ruft die gesicherte Playback-URL vom Backend ab.
 */
const AudioPlayer = ({ track, token, onPlaybackEnd }) => {
    const [playbackUrl, setPlaybackUrl] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Ruft die gesicherte S3-URL vom Backend ab
    const fetchSignedUrl = useCallback(async (trackId) => {
        setLoading(true);
        setError(null);
        setPlaybackUrl(null);
        try {
            // Endpunkt: /api/tracks/download/:trackId
            const response = await axios.get(`${API_URL}/tracks/download/${trackId}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            
            // Die URL wird vom Backend unter dem Schlüssel 'downloadUrl' erwartet
            setPlaybackUrl(response.data.downloadUrl);
        } catch (err) {
            console.error("Fehler beim Abrufen der URL:", err);
            setError("Wiedergabe nicht möglich. Fehler beim Laden der gesicherten URL.");
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        // Starte den Abruf der URL, sobald ein neuer Track ausgewählt wird
        if (track && track.track_id) {
            fetchSignedUrl(track.track_id);
        }
    }, [track, fetchSignedUrl]);

    if (!track) return null;

    return (
        <div className="p-4 bg-gray-800 shadow-xl rounded-lg fixed bottom-0 left-0 right-0 z-50 border-t-4 border-emerald-500 transition-all duration-300">
            <div className="max-w-4xl mx-auto flex flex-col sm:flex-row justify-between items-center">
                <div className="flex-grow min-w-0 mb-2 sm:mb-0">
                    <h3 className="text-sm font-semibold text-white">Aktueller Track:</h3>
                    <p className="text-lg font-bold text-emerald-400 truncate">
                        {track.title} – {track.artist_name}
                    </p>
                </div>

                <div className="w-full sm:w-2/3 lg:w-1/2">
                    {loading && (
                        <div className="flex items-center text-gray-400 justify-center sm:justify-start">
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-emerald-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            URL wird geladen...
                        </div>
                    )}

                    {error && <p className="text-red-400 text-sm text-center sm:text-left">{error}</p>}

                    {playbackUrl && (
                        <audio
                            key={track.track_id} // Wichtig, um das Audio-Element bei Track-Wechsel neu zu laden
                            controls
                            autoPlay
                            onEnded={onPlaybackEnd}
                            className="w-full mt-1 bg-gray-700 rounded-full"
                        >
                            <source src={playbackUrl} type="audio/mpeg" />
                            Ihr Browser unterstützt das Audio-Element nicht.
                        </audio>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AudioPlayer;

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

// Annahme: Die API-URL ist an dieser Stelle verfügbar
const API_URL = 'http://localhost:3000/api'; 

/**
 * Ein Dropdown-Button, um einen Track zu einer der vorhandenen Playlists hinzuzufügen.
 * @param {object} props - Eigenschaften
 * @param {number} props.trackId - Die ID des Tracks, der hinzugefügt werden soll.
 * @param {string} props.token - Der Authentifizierungs-Token des Benutzers.
 */
const AddToPlaylistButton = ({ trackId, token }) => {
    const [playlists, setPlaylists] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false);

    // Funktion zum Abrufen aller Playlists des Benutzers
    const fetchPlaylists = useCallback(async () => {
        if (!token) return;

        setIsLoading(true);
        setMessage(null);
        try {
            const response = await axios.get(`${API_URL}/playlists`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setPlaylists(response.data || []);
            setHasAttemptedLoad(true);
        } catch (error) {
            setMessage('Fehler beim Laden der Playlists.');
            setPlaylists([]); // Wichtig: Zustand bei Fehler leeren
            setHasAttemptedLoad(true);
        } finally {
            setIsLoading(false);
        }
    }, [token]);

    // Track zu einer Playlist hinzufügen
    const handleAddToPlaylist = async (playlistId, playlistName) => {
        setIsDropdownOpen(false); // Dropdown schließen
        setMessage(`Füge Track zu ${playlistName} hinzu...`);

        try {
            await axios.post(`${API_URL}/playlists/${playlistId}/tracks`, { trackId }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setMessage(`Track erfolgreich zu "${playlistName}" hinzugefügt!`);
            // Nachricht nach 3 Sekunden ausblenden
            setTimeout(() => setMessage(null), 3000); 

        } catch (error) {
            const errorMsg = error.response?.data?.message || `Fehler beim Hinzufügen zu ${playlistName}.`;
            setMessage(errorMsg);
            // Nachricht nach 5 Sekunden ausblenden
            setTimeout(() => setMessage(null), 5000); 
        }
    };

    // Öffnet das Dropdown und lädt die Playlists
    const handleOpenDropdown = () => {
        setIsDropdownOpen(prev => {
            if (!prev) {
                // Lädt Playlists nur, wenn das Dropdown geöffnet wird
                fetchPlaylists();
            }
            return !prev;
        });
    };

    // Schließt Dropdown, wenn außerhalb geklickt wird
    useEffect(() => {
        const closeDropdown = (event) => {
            if (isDropdownOpen && !event.target.closest('.add-to-playlist-container')) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', closeDropdown);
        return () => document.removeEventListener('mousedown', closeDropdown);
    }, [isDropdownOpen]);

    return (
        <div className="add-to-playlist-container">
            {/* Haupt-Button */}
            <button 
                className="add-to-playlist-button action-button" 
                onClick={handleOpenDropdown}
                disabled={!token} // Deaktiviere, wenn kein Token vorhanden ist
            >
                {isLoading ? 'Lädt...' : 'Zur Playlist hinzufügen'}
            </button>

            {/* Dropdown-Menü */}
            {isDropdownOpen && (
                <div className="playlist-dropdown">
                    {isLoading && <p className="dropdown-empty-message">Lade Playlists...</p>}
                    {hasAttemptedLoad && !isLoading && playlists.length === 0 && (
                        <p className="dropdown-empty-message">Keine Playlists gefunden.</p>
                    )}
                    
                    {playlists.length > 0 && !isLoading && (
                        playlists.map((playlist) => (
                            <button
                                key={playlist.playlist_id}
                                className="dropdown-item"
                                onClick={() => handleAddToPlaylist(playlist.playlist_id, playlist.name)}
                            >
                                {playlist.name}
                            </button>
                        ))
                    )}
                </div>
            )}
            
            {/* Status-Nachricht */}
            {message && <p className={`playlist-message ${message.includes('Fehler') ? 'error' : 'success'}`}>{message}</p>}
        </div>
    );
};

export default AddToPlaylistButton;

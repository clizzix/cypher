import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

const API_URL = 'http://localhost:3000/api';

const ProfilePage = ({ token, user }) => {
    const [userTracks, setUserTracks] = useState([]);
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    const fetchUserTracks = async () => {
        try {
            const response = await axios.get(`${API_URL}/tracks/user`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setUserTracks(response.data);
        } catch (error) {
            setMessage(error.response?.data?.message || 'Fehler beim Abrufen der Tracks.');
        }
    };

    useEffect(() => {
        fetchUserTracks();
    }, [token]);

    const handleDeleteTrack = async (trackId) => {
        if (window.confirm('Möchtest du diesen Track wirklich löschen?')) {
            try {
                await axios.delete(`${API_URL}/tracks/${trackId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                setMessage('Track erfolgreich gelöscht.');
                fetchUserTracks(); // Tracks nach dem Löschen neu laden
            } catch (error) {
                setMessage(error.response?.data?.message || 'Fehler beim Löschen des Tracks.');
            }
        }
    };

    return (
        <div style={{ padding: '20px', fontFamily: 'Arial' }}>
            <h1>Dein Profil</h1>
            <p><strong>E-Mail:</strong> {user.email}</p>
            <p><strong>Rolle:</strong> {user.role}</p>
            {user.artistName && <p><strong>Künstlername:</strong> {user.artistName}</p>}

            <h2>Deine hochgeladenen Tracks</h2>
            {message && <p style={{ color: 'red' }}>{message}</p>}
            {userTracks.length > 0 ? (
                <ul style={{ listStyleType: 'none', padding: 0 }}>
                    {userTracks.map(track => (
                        <li key={track.track_id} style={{ border: '1px solid #ccc', margin: '10px 0', padding: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3>{track.title}</h3>
                                <p>Genre: {track.genre}</p>
                                <p>Beschreibung: {track.description}</p>
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                {/* "Bearbeiten"-Link hinzufügen */}
                                <Link to={`/edit-track/${track.track_id}`} style={{ backgroundColor: 'orange', color: 'white', padding: '8px', border: 'none', textDecoration: 'none' }}>
                                    Bearbeiten
                                </Link>
                                <button onClick={() => handleDeleteTrack(track.track_id)} style={{ backgroundColor: 'red', color: 'white', padding: '8px', border: 'none' }}>
                                    Löschen
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            ) : (
                <p>Du hast noch keine Tracks hochgeladen.</p>
            )}
        </div>
    );
};

export default ProfilePage;
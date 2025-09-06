import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ProfilePage.css';

const API_URL = 'http://localhost:3000/api';

const ProfilePage = ({ token }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');

    const fetchProfile = async () => {
        try {
            const response = await axios.get(`${API_URL}/profile`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setUser(response.data);
        } catch (error) {
            setMessage('Fehler beim Abrufen des Profils.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfile();
    }, [token]);

    if (loading) {
        return <p className="loading-message">Lade Profil...</p>;
    }

    if (!user) {
        return <p className="message">Profil konnte nicht geladen werden.</p>;
    }

return (
    <div className="profile-container">
        <h1 className="page-title">Profil</h1>
        <div className="profile-card">
            {user.avatar ? (
                <img src={`${API_URL}/profile/avatar/${user.avatar}?token=${token}`} alt="Profil-Avatar" className="profile-avatar" />
            ) : (
                <img src="https://placehold.co/120x120?text=Avatar" alt="Standard-Avatar" className="profile-avatar" />
            )}
            <div className="profile-info">
                <h2 className="username">{user.username}</h2>
                <p className="user-email">{user.email}</p>
            </div>
            {message && <p className="message">{message}</p>}
            <button className="edit-button">Profil bearbeiten</button>
        </div>
    </div>
);
};

export default ProfilePage;
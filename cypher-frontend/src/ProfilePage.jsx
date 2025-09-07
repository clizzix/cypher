import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ProfilePage.css';

const API_URL = 'http://localhost:3000/api';

const ProfilePage = ({ token, logout }) => {

    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        artistName: '',
        bio: '',
        profilePic: null,
        currentPassword: '',
        newPassword: '',
    });
    const [profilePicUrl, setProfilePicUrl] = useState(null);

const fetchProfileData = async () => {
    try {
        setLoading(true);
        const response = await axios.get(`${API_URL}/profile`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const userData = response.data;

        // Stellen Sie sicher, dass user-Daten empfangen wurden
        if (!userData) {
            throw new Error("Benutzerdaten konnten nicht geladen werden.");
        }
        
        setUser(userData);
        setFormData({
            artistName: userData.artist_name || '',
            bio: userData.bio || '',
            profilePic: null,
            currentPassword: '',
            newPassword: '',
        });

        // Abruf der Profilbild-URL nur, wenn der Schlüssel vorhanden und nicht leer ist
        if (userData.profile_pic_key && userData.profile_pic_key.length > 0) {
            try {
                const picResponse = await axios.get(`${API_URL}/profile/picture/${userData.profile_pic_key}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (picResponse.data.url) {
                    setProfilePicUrl(picResponse.data.url);
                } else {
                    setProfilePicUrl(null);
                }
            } catch (picErr) {
                console.error('Fehler beim Abrufen der Profilbild-URL:', picErr);
                setProfilePicUrl(null); // Setzen auf null, um den Fehler zu ignorieren und die Seite zu laden
            }
        } else {
            setProfilePicUrl(null);
        }

    } catch (err) {
        console.error('Fehler beim Laden des Profils:', err);
        setError('Profil konnte nicht geladen werden.');
    } finally {
        setLoading(false);
    }
};

    useEffect(() => {
        fetchProfileData();
    }, [token]);

    const handleChange = (e) => {
        const { name, value, files } = e.target;
        setFormData(prevState => ({
            ...prevState,
            [name]: files ? files[0] : value
        }));
    };

    const handleUpdateSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const data = new FormData();
        data.append('artistName', formData.artistName);
        data.append('bio', formData.bio);
        if (formData.profilePic) {
            data.append('profilePic', formData.profilePic);
        }
        if (formData.currentPassword || formData.newPassword) {
            data.append('currentPassword', formData.currentPassword);
            data.append('newPassword', formData.newPassword);
        }

        try {
            const response = await axios.put(`${API_URL}/profile`, data, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
            
            await fetchProfileData();
            setIsEditing(false);
            setFormData(prevState => ({
                ...prevState,
                profilePic: null,
                currentPassword: '',
                newPassword: '',
            }));

        } catch (err) {
            setError(err.response?.data?.message || 'Fehler beim Aktualisieren des Profils.');
            console.error('Update Profile Error:', err.response?.data || err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div>Lade Profil...</div>;
    if (error) return <div>Fehler: {error}</div>;
    if (!user) return <div>Keine Benutzerdaten gefunden.</div>;

    return (
        <div className="profile-page-container">
            <h2 className="page-title">Mein Profil</h2>
            {!isEditing ? (
                <div className="profile-view">
                    {profilePicUrl && <img src={profilePicUrl} alt="Profilbild" className="profile-picture" />}
                    <p><strong>Name:</strong> {user.artist_name || user.email}</p>
                    {user.bio && <p><strong>Bio:</strong> {user.bio}</p>}
                    <p><strong>E-Mail:</strong> {user.email}</p>
                    <button onClick={() => setIsEditing(true)}>Profil bearbeiten</button>
                </div>
            ) : (
                <form onSubmit={handleUpdateSubmit} className="profile-edit-form">
                    <label>
                        Künstlername:
                        <input
                            type="text"
                            name="artistName"
                            value={formData.artistName}
                            onChange={handleChange}
                        />
                    </label>
                    <label>
                        Bio:
                        <textarea
                            name="bio"
                            value={formData.bio}
                            onChange={handleChange}
                            rows="4"
                        ></textarea>
                    </label>
                    <label>
                        Profilbild:
                        <input
                            type="file"
                            name="profilePic"
                            accept="image/*"
                            onChange={handleChange}
                        />
                    </label>
                    <label>
                        Aktuelles Passwort (zum Aktualisieren erforderlich):
                        <input
                            type="password"
                            name="currentPassword"
                            value={formData.currentPassword}
                            onChange={handleChange}
                        />
                    </label>
                    <label>
                        Neues Passwort:
                        <input
                            type="password"
                            name="newPassword"
                            value={formData.newPassword}
                            onChange={handleChange}
                        />
                    </label>
                    <div className="form-actions">
                        <button type="submit">Änderungen speichern</button>
                        <button type="button" onClick={() => {
                            setIsEditing(false);
                            fetchProfileData();
                        }}>Abbrechen</button>
                    </div>
                </form>
            )}
        </div>
    );
};

export default ProfilePage;
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './ProfilePage.css';

const API_URL = 'http://localhost:3000/api';

const ProfilePage = ({ token, user: appUser, setUser: setAppUser }) => {

    const navigate = useNavigate();
    const [user, setUser] = useState(appUser);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null); 
    const [isEditing, setIsEditing] = useState(false);
    
    const [formData, setFormData] = useState({
        artistName: '',
        bio: '',
        userRole: '', 
        profilePic: null,
        currentPassword: '',
        newPassword: '',
    });
    const [profilePicUrl, setProfilePicUrl] = useState(null);

    // Hilfsfunktion zur Aktualisierung des lokalen und globalen User-Zustands
    const updateLocalAndGlobalUser = (updatedUserData) => {
        const finalUserData = {
            ...user, 
            ...updatedUserData,
            userRole: updatedUserData.user_role || updatedUserData.userRole || user.userRole,
            artistName: updatedUserData.artist_name || updatedUserData.artistName || user.artistName,
            profile_pic_key: updatedUserData.profile_pic_key || updatedUserData.profilePicKey || user.profile_pic_key,
        };
        
        setUser(finalUserData);
        
        if (setAppUser) {
            setAppUser(finalUserData);
            // localStorage.setItem('user', JSON.stringify(finalUserData)); 
        }
    };
    
    // Funktion zum Abrufen und Setzen der Profilbild-URL basierend auf dem Key
    const fetchAndSetProfilePicUrl = useCallback(async (key) => {
        if (!key || key.length === 0) {
            setProfilePicUrl(null);
            return;
        }
        
        try {
            const picResponse = await axios.get(`${API_URL}/profile/picture/${key}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            const newUrl = picResponse.data.url || null;
            setProfilePicUrl(newUrl);
            
        } catch (picErr) {
            console.error('Fehler beim Abrufen der Profilbild-URL:', picErr.message);
            setProfilePicUrl(null);
        }
    }, [token]);


    const fetchProfileData = useCallback(async () => {
        try {
            setLoading(true);
            setSuccessMessage(null); 
            setError(null);
            
            // 1. Stammdaten abrufen
            const response = await axios.get(`${API_URL}/profile`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const userData = response.data;

            if (!userData || !userData.user_id) {
                throw new Error("Benutzerdaten konnten nicht geladen werden.");
            }
            
            updateLocalAndGlobalUser(userData);

            setFormData({
                artistName: userData.artist_name || '', 
                bio: userData.bio || '',
                userRole: userData.user_role || 'listener', 
                profilePic: null,
                currentPassword: '',
                newPassword: '',
            });

            // 2. Profilbild-URL abrufen
            await fetchAndSetProfilePicUrl(userData.profile_pic_key); 

        } catch (err) {
            console.error('Fehler beim Laden des Profils:', err);
            setError('Profil konnte nicht geladen werden.');
        } finally {
            setLoading(false);
        }
    }, [token, fetchAndSetProfilePicUrl]); 


    useEffect(() => {
        fetchProfileData();
    }, [fetchProfileData]); 

    useEffect(() => {
        if (appUser) {
            setUser(appUser);
            fetchAndSetProfilePicUrl(appUser.profile_pic_key);
        }
    }, [appUser, fetchAndSetProfilePicUrl]);


    const handleChange = (e) => {
        const { name, value, files } = e.target;
        setFormData(prevState => ({
            ...prevState,
            [name]: files ? files[0] : value
        }));
    };

    const handleRoleUpdate = async (newRole) => {
        try {
            const response = await axios.put(`${API_URL}/user/role`, { newRole }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            updateLocalAndGlobalUser(response.data.user);
            
            return 'Rolle erfolgreich aktualisiert!';
        } catch (err) {
            return err.response?.data?.message || 'Fehler beim Aktualisieren der Rolle.';
        }
    };


    const handleUpdateSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccessMessage(null); 
        let roleUpdateMessage = '';
        let profileUpdateMessage = '';
        let newProfilePicKey = null; 
        let profileUpdateSucceeded = false; 

        // 1. ROLLEN-UPDATE SEPARAT VERARBEITEN
        if (formData.userRole !== user.userRole) {
            roleUpdateMessage = await handleRoleUpdate(formData.userRole);
        }

        // 2. PROFIL-UPDATE (Bio, Name, Passwort, Bild)
        const data = new FormData();
        const currentArtistName = user.artistName || '';
        const currentBio = user.bio || '';


        const isNameChanged = formData.artistName !== currentArtistName;
        const isBioChanged = formData.bio !== currentBio;
        const isPasswordChanged = !!formData.newPassword;
        const isPicChanged = !!formData.profilePic;

        if (isNameChanged) data.append('artistName', formData.artistName);
        if (isBioChanged) data.append('bio', formData.bio);

        if (isPicChanged) {
            data.append('profilePic', formData.profilePic);
        }
        if (isPasswordChanged) {
            if (!formData.currentPassword) {
                 setError('Aktuelles Passwort ist erforderlich, um das Passwort zu ändern.');
                 setLoading(false);
                 return;
            }
            data.append('currentPassword', formData.currentPassword);
            data.append('newPassword', formData.newPassword);
        }


        if (isNameChanged || isBioChanged || isPicChanged || isPasswordChanged) {
            try {
                const response = await axios.put(`${API_URL}/profile`, data, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data'
                    }
                });
                
                updateLocalAndGlobalUser(response.data.user);
                profileUpdateMessage = 'Profil erfolgreich aktualisiert.';
                profileUpdateSucceeded = true; 
                
                newProfilePicKey = response.data.user.profile_pic_key || response.data.user.profilePicKey;

            } catch (err) {
                profileUpdateMessage = err.response?.data?.message || 'Fehler beim Aktualisieren des Profils.';
                console.error('Update Profile Error:', err.response?.data || err);
            }
        }
        
        // 3. FINISH
        
        setFormData(prevState => ({
            ...prevState,
            profilePic: null,
            currentPassword: '',
            newPassword: '',
        }));

        if (profileUpdateSucceeded && (newProfilePicKey || newProfilePicKey === null)) {
            await fetchAndSetProfilePicUrl(newProfilePicKey);
        } 
        
        const finalErrors = [roleUpdateMessage, profileUpdateMessage].filter(msg => msg && !msg.includes('erfolgreich')).join('; ') || null;
        const finalSuccesses = [roleUpdateMessage, profileUpdateMessage].filter(msg => msg && msg.includes('erfolgreich')).join('; ') || null;

        setError(finalErrors);
        setSuccessMessage(finalSuccesses); 

        setIsEditing(false);
        setLoading(false);
    };

    if (loading) return <div>Lade Profil...</div>;
    if (!user) return <div>Keine Benutzerdaten gefunden.</div>;

    return (
        <div className="profile-page-container">
            <h2 className="page-title">Mein Profil</h2>
            {!isEditing ? (
                <div className="profile-view">
                    {profilePicUrl ? (
                         <img src={profilePicUrl} alt="Profilbild" className="profile-picture" />
                    ) : (
                        <div className="profile-picture-placeholder">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-gray-500">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 19.5a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 0 12 17.25c-1.35 0-2.65-.29-3.9-.84-1.25-.55-2.4-.84-3.599-.84Z" />
                            </svg>
                        </div>
                    )}
                    <p><strong>Name:</strong> {user.artistName || user.email}</p>
                    {user.bio && <p><strong>Bio:</strong> {user.bio}</p>}
                    <p><strong>E-Mail:</strong> {user.email}</p>
                    <p><strong>Rolle:</strong> <span style={{ fontWeight: 'bold', color: user.userRole === 'creator' ? '#1ed760' : '#b3b3b3' }}>{user.userRole}</span></p>
                    <button onClick={() => {
                        setIsEditing(true);
                        setError(null);
                        setSuccessMessage(null);
                    }}>Profil bearbeiten</button>
                    {successMessage && <p style={{ color: '#1ed760', marginTop: '10px' }}>{successMessage}</p>}
                    {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
                </div>
            ) : (
                <form onSubmit={handleUpdateSubmit} className="profile-edit-form">
                    <label>
                        Rolle:
                        <select
                            name="userRole"
                            value={formData.userRole}
                            onChange={handleChange}
                            style={{ backgroundColor: '#333', color: '#fff' }}
                            disabled={loading}
                        >
                            <option value="listener">Hörer (Listener)</option>
                            <option value="creator">Künstler (Creator)</option>
                        </select>
                    </label>
                    <label>
                        Künstlername:
                        <input
                            type="text"
                            name="artistName"
                            value={formData.artistName}
                            onChange={handleChange}
                            required={formData.userRole === 'creator'}
                            disabled={formData.userRole === 'listener' || loading}
                        />
                    </label>
                    <label>
                        Bio:
                        <textarea
                            name="bio"
                            value={formData.bio}
                            onChange={handleChange}
                            rows="4"
                            disabled={loading}
                        ></textarea>
                    </label>
                    <label>
                        Profilbild:
                        <input
                            type="file"
                            name="profilePic"
                            accept="image/*"
                            onChange={handleChange}
                            disabled={loading}
                        />
                        {profilePicUrl && <img src={profilePicUrl} alt="Aktuelles Profilbild" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '50%', marginTop: '10px' }} />}
                    </label>
                    <label>
                        Aktuelles Passwort (zum Aktualisieren erforderlich):
                        <input
                            type="password"
                            name="currentPassword"
                            value={formData.currentPassword}
                            onChange={handleChange}
                            disabled={loading}
                        />
                    </label>
                    <label>
                        Neues Passwort:
                        <input
                            type="password"
                            name="newPassword"
                            value={formData.newPassword}
                            onChange={handleChange}
                            disabled={loading}
                        />
                    </label>
                    <div className="form-actions">
                        <button type="submit" disabled={loading}>{loading ? 'Speichere...' : 'Änderungen speichern'}</button>
                        <button type="button" onClick={() => {
                            setIsEditing(false);
                            fetchProfileData(); 
                        }} disabled={loading}>Abbrechen</button>
                    </div>
                    {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
                </form>
            )}
        </div>
    );
};

export default ProfilePage;
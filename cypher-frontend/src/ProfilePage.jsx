import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './ProfilePage.css';

const API_URL = 'http://localhost:3000/api';

// ERGÄNZT: Erwarte 'user' und 'setUser' als Props aus App.jsx
const ProfilePage = ({ token, user: appUser, setUser: setAppUser }) => {

    const navigate = useNavigate();

    // LOKALER ZUSTAND: Wird verwendet, um die Daten im Formular und der Anzeige zu handhaben
    const [user, setUser] = useState(appUser);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
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
        // Sicherstellen, dass die Daten das erwartete Format haben, falls das Backend ein gemischtes Objekt liefert
        const finalUserData = {
            ...updatedUserData,
            userRole: updatedUserData.user_role || updatedUserData.userRole,
            artistName: updatedUserData.artist_name || updatedUserData.artistName,
        };
        
        setUser(finalUserData);
        
        // Aktualisiere den globalen State in App.jsx und localStorage
        if (setAppUser) {
            setAppUser(finalUserData);
            localStorage.setItem('user', JSON.stringify(finalUserData));
        }
    };

    const fetchProfileData = async () => {
        try {
            setLoading(true);
            // Nutze /user/me, um die aktuellsten Benutzerdaten (inkl. Rolle) zu erhalten
            const response = await axios.get(`${API_URL}/user/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const userData = response.data.user;

            if (!userData) {
                throw new Error("Benutzerdaten konnten nicht geladen werden.");
            }
            
            // Initialisiere den lokalen und globalen Zustand
            updateLocalAndGlobalUser(userData);

            setFormData({
                artistName: userData.artistName || '',
                bio: userData.bio || '',
                userRole: userData.userRole || 'listener', 
                profilePic: null,
                currentPassword: '',
                newPassword: '',
            });

            // Abruf der Profilbild-URL
            if (userData.profile_pic_key && userData.profile_pic_key.length > 0) {
                try {
                    const picResponse = await axios.get(`${API_URL}/profile/picture/${userData.profile_pic_key}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    setProfilePicUrl(picResponse.data.url || null);
                } catch (picErr) {
                    console.error('Fehler beim Abrufen der Profilbild-URL:', picErr);
                    setProfilePicUrl(null);
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


    // Aktualisiert den Zustand, wenn Props sich ändern (z.B. nach globalem Update in App.jsx)
    useEffect(() => {
        setUser(appUser);
        setFormData(prevState => ({
            ...prevState,
            userRole: appUser?.userRole || 'listener',
            artistName: appUser?.artistName || '',
        }));
    }, [appUser]);


    const handleChange = (e) => {
        const { name, value, files } = e.target;
        setFormData(prevState => ({
            ...prevState,
            [name]: files ? files[0] : value
        }));
    };

    const handleRoleUpdate = async (newRole) => {
        // setError(null); // Fehler erst nach beiden Aktionen anzeigen
        try {
            const response = await axios.put(`${API_URL}/user/role`, { newRole }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            // Aktualisiere den globalen State mit der neuen Rolle
            const updatedUser = response.data.user;
            updateLocalAndGlobalUser(updatedUser);
            
            return 'Rolle erfolgreich aktualisiert!';
        } catch (err) {
            return err.response?.data?.message || 'Fehler beim Aktualisieren der Rolle.';
        }
    };


    const handleUpdateSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        let roleUpdateMessage = '';
        let profileUpdateMessage = '';

        // 1. ROLLEN-UPDATE SEPARAT VERARBEITEN
        // Nutze hier user.userRole, da das lokale 'user' Objekt das korrekte Feld 'userRole' hat (durch die updateLocalAndGlobalUser Anpassung)
        if (formData.userRole !== user.userRole) {
            roleUpdateMessage = await handleRoleUpdate(formData.userRole);
        }

        // 2. PROFIL-UPDATE (Bio, Name, Passwort, Bild)
        const data = new FormData();
        // Verwende 'user.artistName' für den Vergleich mit dem Frontend, da es aus der DB kommt
        const currentArtistName = user.artistName || '';
        const currentBio = user.bio || '';


        // Überprüfe, ob sich Name oder Bio geändert haben
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


        // Führe nur das Profil-Update aus, wenn andere Felder geändert wurden
        if (isNameChanged || isBioChanged || isPicChanged || isPasswordChanged) {
            try {
                const response = await axios.put(`${API_URL}/profile`, data, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data'
                    }
                });
                
                // Aktualisiere den Zustand nach dem Profil-Update
                updateLocalAndGlobalUser(response.data);
                profileUpdateMessage = 'Profil erfolgreich aktualisiert.';

            } catch (err) {
                profileUpdateMessage = err.response?.data?.message || 'Fehler beim Aktualisieren des Profils.';
                console.error('Update Profile Error:', err.response?.data || err);
            }
        }
        
        // 3. FINISH
        
        // Setze Passwörter und Bild zurück
        setFormData(prevState => ({
            ...prevState,
            profilePic: null,
            currentPassword: '',
            newPassword: '',
        }));

        // Zeige kombinierte Fehlermeldung
        const finalError = [roleUpdateMessage, profileUpdateMessage].filter(msg => msg && !msg.includes('erfolgreich')).join('; ') || null;
        const finalSuccess = [roleUpdateMessage, profileUpdateMessage].filter(msg => msg && msg.includes('erfolgreich')).join('; ') || null;

        setError(finalError);
        if (finalSuccess) {
            // Setze Erfolgsmeldung für die Anzeige im Profil-View, falls kein Fehler auftrat
            setError(finalSuccess);
        }

        setIsEditing(false);
        setLoading(false);

        // 🟢 FIX: Füge einen kleinen Timeout hinzu, um React Zeit zu geben, den globalen State 
        // (mit der neuen Rolle) vollständig zu aktualisieren, bevor die Route gewechselt wird.
        setTimeout(() => {
            navigate('/tracks');
        }, 50);
    };

    if (loading) return <div>Lade Profil...</div>;
    // Zeige Fehler im View-Modus an
    if (!isEditing && error && error.length > 0) return <div>{error}</div>;
    if (!user) return <div>Keine Benutzerdaten gefunden.</div>;

    return (
        <div className="profile-page-container">
            <h2 className="page-title">Mein Profil</h2>
            {!isEditing ? (
                <div className="profile-view">
                    {profilePicUrl && <img src={profilePicUrl} alt="Profilbild" className="profile-picture" />}
                    <p><strong>Name:</strong> {user.artistName || user.email}</p>
                    {user.bio && <p><strong>Bio:</strong> {user.bio}</p>}
                    <p><strong>E-Mail:</strong> {user.email}</p>
                    {/* Anzeige der aktuellen Rolle */}
                    <p><strong>Rolle:</strong> <span style={{ fontWeight: 'bold', color: user.userRole === 'creator' ? '#1ed760' : '#b3b3b3' }}>{user.userRole}</span></p>
                    <button onClick={() => setIsEditing(true)}>Profil bearbeiten</button>
                    {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
                </div>
            ) : (
                <form onSubmit={handleUpdateSubmit} className="profile-edit-form">
                    {/* Rollenauswahl */}
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
                    {error && <p style={{ color: error.includes('erfolgreich') ? 'green' : 'red', marginTop: '10px' }}>{error}</p>}
                </form>
            )}
        </div>
    );
};

export default ProfilePage;

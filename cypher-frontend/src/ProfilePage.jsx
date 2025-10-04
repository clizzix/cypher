import React, { useState, useEffect, useCallback } from 'react'; // Importiere useCallback
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
    // 🟢 NEU: Dedizierter State für Erfolgsmeldungen
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
        // Sicherstellen, dass die Daten das erwartete Format haben, falls das Backend ein gemischtes Objekt liefert
        const finalUserData = {
            ...updatedUserData,
            // Backend liefert oft snake_case, Frontend nutzt camelCase
            userRole: updatedUserData.user_role || updatedUserData.userRole,
            artistName: updatedUserData.artist_name || updatedUserData.artistName,
            profile_pic_key: updatedUserData.profile_pic_key || updatedUserData.profilePicKey,
        };
        
        setUser(finalUserData);
        
        // Aktualisiere den globalen State in App.jsx und localStorage
        if (setAppUser) {
            setAppUser(finalUserData);
            localStorage.setItem('user', JSON.stringify(finalUserData));
        }
    };
    
    // 🟢 NEU: Funktion zum Abrufen und Setzen der Profilbild-URL basierend auf dem Key
    const fetchAndSetProfilePicUrl = useCallback(async (key) => {
        if (!key || key.length === 0) {
            setProfilePicUrl(null);
            console.log('DEBUG (URL Fetch): Keine profile_pic_key vorhanden.');
            return;
        }
        
        // 🛠️ DEBUG-LOG 1: Prüfe, ob der Key vom Frontend gefunden wurde
        console.log('DEBUG (URL Fetch): profile_pic_key gefunden:', key); 
        try {
            const picResponse = await axios.get(`${API_URL}/profile/picture/${key}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            const newUrl = picResponse.data.url || null;
            setProfilePicUrl(newUrl);
            
            // 🛠️ DEBUG-LOG 2: Prüfe, welche URL abgerufen wurde
            console.log('DEBUG (URL Fetch): Profilbild-URL erfolgreich abgerufen:', newUrl); 
            
        } catch (picErr) {
            // 🛠️ DEBUG-LOG 3: Fehler beim Abrufen der URL
            console.error('Fehler beim Abrufen der Profilbild-URL:', picErr.message);
            setProfilePicUrl(null);
        }
    }, [token]);


    const fetchProfileData = useCallback(async () => {
        try {
            setLoading(true);
            setSuccessMessage(null); // Setze Meldungen beim Neuladen zurück
            setError(null);
            
            // 1. Stammdaten abrufen
            const response = await axios.get(`${API_URL}/user/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const userData = response.data.user;

            if (!userData) {
                throw new Error("Benutzerdaten konnten nicht geladen werden.");
            }
            
            // 🛠️ FINAL DEBUG-LOG: Ist der Key beim initialen Laden vom Server vorhanden?
            console.log('DEBUG (Initial Fetch): Server-Daten erhalten, profile_pic_key:', userData.profile_pic_key); 

            // State initialisieren/aktualisieren (setzt user, appUser, localStorage)
            updateLocalAndGlobalUser(userData);

            setFormData({
                artistName: userData.artistName || '',
                bio: userData.bio || '',
                userRole: userData.userRole || 'listener', 
                profilePic: null,
                currentPassword: '',
                newPassword: '',
            });

            // 2. Profilbild-URL abrufen (nutzt die neue Funktion)
            await fetchAndSetProfilePicUrl(userData.profile_pic_key); 

        } catch (err) {
            console.error('Fehler beim Laden des Profils:', err);
            setError('Profil konnte nicht geladen werden.');
        } finally {
            setLoading(false);
        }
    }, [token, fetchAndSetProfilePicUrl]); // Abhängigkeit von fetchAndSetProfilePicUrl hinzugefügt


    useEffect(() => {
        fetchProfileData();
    }, [fetchProfileData]); // Abhängigkeit auf fetchProfileData, da es nun useCallback ist


    // Aktualisiert den Zustand, wenn Props sich ändern (z.B. nach globalem Update in App.jsx)
    useEffect(() => {
        setUser(appUser);
        setFormData(prevState => ({
            ...prevState,
            userRole: appUser?.userRole || 'listener',
            artistName: appUser?.artistName || '',
        }));
        // Wenn der globale user sich ändert, muss das Bild ebenfalls neu geladen werden, 
        // falls der Key sich im Hintergrund geändert hat.
        fetchAndSetProfilePicUrl(appUser?.profile_pic_key); 
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
            
            // 🟢 FIX 2: Merge the sparse response data with the full current user data (user)
            // Dies garantiert, dass der profile_pic_key nicht überschrieben wird, wenn der Server ihn weglässt.
            const updatedUserFromResponse = response.data.user;
            const mergedUser = { ...user, ...updatedUserFromResponse }; 
            updateLocalAndGlobalUser(mergedUser);
            
            return 'Rolle erfolgreich aktualisiert!';
        } catch (err) {
            return err.response?.data?.message || 'Fehler beim Aktualisieren der Rolle.';
        }
    };


    const handleUpdateSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccessMessage(null); // Setze vorherige Erfolgsmeldungen zurück
        let roleUpdateMessage = '';
        let profileUpdateMessage = '';
        let newProfilePicKey = null; // Speichert den Key, falls das Bild hochgeladen wurde
        let profileUpdateSucceeded = false; // 🚩 Neu: Flag für Profil-Update-Erfolg

        // 1. ROLLEN-UPDATE SEPARAT VERARBEITEN
        if (formData.userRole !== user.userRole) {
            roleUpdateMessage = await handleRoleUpdate(formData.userRole);
        }

        // 2. PROFIL-UPDATE (Bio, Name, Passwort, Bild)
        const data = new FormData();
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
                
                // 🛠️ DEBUG-LOG 5: Prüfe die Antwort des Servers nach dem PUT-Update
                console.log('DEBUG: PUT response data (sollte neuen profile_pic_key enthalten):', response.data);
                
                // 🟢 FIX 1: Merge die Antwortdaten mit dem aktuellen 'user'-State, 
                // um sicherzustellen, dass der profile_pic_key erhalten bleibt, falls der Server ihn nicht zurückgibt.
                const mergedUserAfterProfileUpdate = { ...user, ...response.data.user };
                updateLocalAndGlobalUser(mergedUserAfterProfileUpdate);
                profileUpdateMessage = 'Profil erfolgreich aktualisiert.';
                profileUpdateSucceeded = true; // 🚩 Update war erfolgreich
                
                // 🟢 ZUSÄTZLICH: Neuen Key aus der gemergten Antwort extrahieren
                newProfilePicKey = mergedUserAfterProfileUpdate.profile_pic_key || mergedUserAfterProfileUpdate.profilePicKey;

            } catch (err) {
                // Setze die Fehlermeldung, bevor wir den Fehler loggen
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

        // 🟢 Wenn ein Bild hochgeladen wurde UND das Profil-Update erfolgreich war, rufen wir die URL ab.
        if (profileUpdateSucceeded && newProfilePicKey) {
            // Holen wir JETZT SOFORT die neue URL.
            await fetchAndSetProfilePicUrl(newProfilePicKey);
        } 
        
        // Zeige kombinierte Fehlermeldung
        const finalErrors = [roleUpdateMessage, profileUpdateMessage].filter(msg => msg && !msg.includes('erfolgreich')).join('; ') || null;
        const finalSuccesses = [roleUpdateMessage, profileUpdateMessage].filter(msg => msg && msg.includes('erfolgreich')).join('; ') || null;

        setError(finalErrors);
        setSuccessMessage(finalSuccesses); // 🟢 Verwende neuen Success State

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
                    {/* 🟢 profilePicUrl sollte jetzt korrekt gesetzt sein */}
                    {profilePicUrl && <img src={profilePicUrl} alt="Profilbild" className="profile-picture" />}
                    <p><strong>Name:</strong> {user.artistName || user.email}</p>
                    {user.bio && <p><strong>Bio:</strong> {user.bio}</p>}
                    <p><strong>E-Mail:</strong> {user.email}</p>
                    {/* Anzeige der aktuellen Rolle */}
                    <p><strong>Rolle:</strong> <span style={{ fontWeight: 'bold', color: user.userRole === 'creator' ? '#1ed760' : '#b3b3b3' }}>{user.userRole}</span></p>
                    <button onClick={() => {
                        setIsEditing(true);
                        setError(null);
                        setSuccessMessage(null);
                    }}>Profil bearbeiten</button>
                    {/* 🟢 Zeige Success und Error getrennt an */}
                    {successMessage && <p style={{ color: '#1ed760', marginTop: '10px' }}>{successMessage}</p>}
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
                            fetchProfileData(); // Daten neu laden, um Änderungen im Formular zu verwerfen
                        }} disabled={loading}>Abbrechen</button>
                    </div>
                    {/* 🔴 Anpassung der Fehleranzeige (keine 'erfolgreich' Prüfung mehr nötig) */}
                    {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
                </form>
            )}
        </div>
    );
};

export default ProfilePage;

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import axios from 'axios';

// Importiere alle Komponenten und CSS-Dateien
import TracksPage from './TracksPage.jsx';
import PlaylistsPage from './PlaylistsPage.jsx';
import UploadPage from './UploadPage.jsx';
import NotificationsPage from './NotificationsPage.jsx';
import ProfilePage from './ProfilePage.jsx';
import MyTracksPage from './MyTracksPage.jsx';
import './AuthPage.css';
import './Navbar.css';

const API_URL = 'http://localhost:3000/api';

function App() {
    const [token, setToken] = useState(null);
    const [user, setUser] = useState(null);
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [artistName, setArtistName] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [isAuthLoading, setIsAuthLoading] = useState(true);

    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');

        if (storedToken && storedUser) {
            setToken(storedToken);
            try {
                const parsedUser = JSON.parse(storedUser);
                setUser(parsedUser);
            } catch (e) {
                console.error('Failed to parse user from localStorage', e);
                // Im Fehlerfall den Benutzer ausloggen, um Probleme zu vermeiden
                handleLogout();
            }
        }
        // Setze den Ladezustand auf false, nachdem der localStorage geprüft wurde
        setIsAuthLoading(false);
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        try {
            let response;
            if (isLogin) {
                response = await axios.post(`${API_URL}/login`, { email, password });
            } else {
                response = await axios.post(`${API_URL}/register`, { email, password, userRole: 'creator', artistName });
            }
            setToken(response.data.token);
            setUser(response.data.user);
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
        } catch (error) {
            setMessage(error.response?.data?.message || 'Ein Fehler ist aufgetreten.');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setMessage('Erfolgreich abgemeldet.');
    };

    // Zeige einen Ladebildschirm an, bis die Authentifizierungsdaten geladen sind
    if (isAuthLoading) {
        return <div className="loading-container">Lade...</div>;
    }

    if (!token) {
        return (
            <div className="auth-container">
                <h1 className="auth-title">{isLogin ? 'Anmelden' : 'Registrieren'}</h1>
                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="form-group">
                        <label htmlFor="email" className="form-label">E-Mail</label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="form-input"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="password" className="form-label">Passwort</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="form-input"
                            required
                        />
                    </div>
                    {!isLogin && (
                        <div className="form-group">
                            <label htmlFor="artistName" className="form-label">Künstlername</label>
                            <input
                                type="text"
                                id="artistName"
                                value={artistName}
                                onChange={(e) => setArtistName(e.target.value)}
                                className="form-input"
                                required
                            />
                        </div>
                    )}
                    <button type="submit" className="auth-button" disabled={loading}>
                        {loading ? 'Lade...' : isLogin ? 'Anmelden' : 'Registrieren'}
                    </button>
                </form>
                {message && <p className="message">{message}</p>}
                <button onClick={() => setIsLogin(!isLogin)} className="toggle-button">
                    {isLogin ? 'Noch kein Konto? Registrieren' : 'Bereits ein Konto? Anmelden'}
                </button>
            </div>
        );
    }

    return (
        <Router>
            <nav className="navbar">
                <Link to="/tracks" className="navbar-brand">Cypher</Link>
                <ul className="navbar-links">
                    <li><Link to="/tracks" className="navbar-link">Tracks</Link></li>
                    <li><Link to="/playlists" className="navbar-link">Playlists</Link></li>
                    {user?.userRole === 'creator' && (
                        <>
                            <li><Link to="/upload" className="navbar-link">Upload</Link></li>
                            <li><Link to="/my-tracks" className="navbar-link">Meine Tracks</Link></li>
                        </>
                    )}
                    <li><Link to="/notifications" className="navbar-link">Notifications</Link></li>
                    <li><Link to="/profile" className="navbar-link">Profile</Link></li>
                </ul>
                <button onClick={handleLogout} className="navbar-button">Abmelden</button>
            </nav>

            <div style={{ padding: '20px' }}>
                <Routes>
                    <Route path="/tracks" element={<TracksPage token={token} />} />
                    <Route path="/playlists" element={<PlaylistsPage token={token} user={user} />} />
                    <Route path="/notifications" element={<NotificationsPage token={token} />} />
                    <Route path="/profile" element={<ProfilePage token={token} />} />
                    
                    {user?.userRole === 'creator' && (
                        <>
                            <Route path="/upload" element={<UploadPage token={token} />} />
                            <Route path="/my-tracks" element={<MyTracksPage token={token} />} />
                        </>
                    )}
                    <Route path="*" element={<Navigate to="/tracks" />} />
                </Routes>
            </div>
        </Router>
    );
}

export default App;
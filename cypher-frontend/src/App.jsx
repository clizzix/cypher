import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import axios from 'axios';

// Importiere alle Komponenten und CSS-Dateien
import TracksPage from './TracksPage.jsx';
import PlaylistsPage from './PlaylistsPage.jsx';
import UploadPage from './UploadPage.jsx';
import NotificationsPage from './NotificationsPage.jsx';
import ProfilePage from './ProfilePage.jsx';
import './AuthPage.css';
import './Navbar.css'; // <-- Importiere die neue Navbar.css

const API_URL = 'http://localhost:3000/api';

function App() {
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')));
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (token && user) {
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
        } else {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        }
    }, [token, user]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        try {
            let response;
            if (isLogin) {
                response = await axios.post(`${API_URL}/login`, { email, password });
            } else {
                response = await axios.post(`${API_URL}/register`, { username, email, password });
            }
            setToken(response.data.token);
            setUser(response.data.user);
        } catch (error) {
            setMessage(error.response?.data?.message || 'Ein Fehler ist aufgetreten.');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        setToken(null);
        setUser(null);
        setMessage('Erfolgreich abgemeldet.');
    };

    if (!token) {
        return (
            <div className="auth-container">
                <h1 className="auth-title">{isLogin ? 'Anmelden' : 'Registrieren'}</h1>
                <form onSubmit={handleSubmit} className="auth-form">
                    {!isLogin && (
                        <div className="form-group">
                            <label htmlFor="username" className="form-label">Benutzername</label>
                            <input
                                type="text"
                                id="username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="form-input"
                                required
                            />
                        </div>
                    )}
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
                    <li><Link to="/upload" className="navbar-link">Upload</Link></li>
                    <li><Link to="/notifications" className="navbar-link">Notifications</Link></li>
                    <li><Link to="/profile" className="navbar-link">Profile</Link></li>
                </ul>
                <button onClick={handleLogout} className="navbar-button">Abmelden</button>
            </nav>

            <div style={{ padding: '20px' }}>
                <Routes>
                    <Route path="/tracks" element={<TracksPage token={token} />} />
                    <Route path="/playlists" element={<PlaylistsPage token={token} user={user} />} />
                    <Route path="/upload" element={<UploadPage token={token} />} />
                    <Route path="/notifications" element={<NotificationsPage token={token} />} />
                    <Route path="/profile" element={<ProfilePage token={token} />} />
                    <Route path="*" element={<Navigate to="/tracks" />} />
                </Routes>
            </div>
        </Router>
    );
}

export default App;
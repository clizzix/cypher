import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import UploadPage from './UploadPage';
import TracksPage from './TracksPage';
import ProfilePage from './ProfilePage';
import PlaylistsPage from './PlaylistsPage';

const API_URL = 'http://localhost:3000/api';

const MainApp = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [artistName, setArtistName] = useState('');
  const [userRole, setUserRole] = useState('listener');
  const [message, setMessage] = useState('');
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (storedToken && storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleAuth = async (event) => {
    event.preventDefault();
    setMessage('');
    
    const endpoint = isLogin ? 'login' : 'register';
    const authData = isLogin
      ? { email, password }
      : { email, password, userRole, artistName: userRole === 'creator' ? artistName : undefined };

    try {
      const response = await axios.post(`${API_URL}/${endpoint}`, authData);
      setMessage(response.data.message);
      
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        setUser(response.data.user);
        navigate('/tracks');
      }
    } catch (error) {
      setMessage(error.response?.data?.message || 'Ein Fehler ist aufgetreten.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/');
  };

  if (!user) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'Arial' }}>
        <h1>{isLogin ? 'Anmelden' : 'Registrieren'}</h1>
        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '300px' }}>
          <input
            type="email"
            placeholder="E-Mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Passwort"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {!isLogin && (
            <>
              <label>
                Rolle:
                <select value={userRole} onChange={(e) => setUserRole(e.target.value)}>
                  <option value="listener">Listener</option>
                  <option value="creator">Creator</option>
                </select>
              </label>
              {userRole === 'creator' && (
                <input
                  type="text"
                  placeholder="Künstlername"
                  value={artistName}
                  onChange={(e) => setArtistName(e.target.value)}
                  required
                />
              )}
            </>
          )}
          <button type="submit">{isLogin ? 'Anmelden' : 'Registrieren'}</button>
        </form>
        <button onClick={() => setIsLogin(!isLogin)} style={{ marginTop: '10px' }}>
          {isLogin ? 'Zum Registrieren wechseln' : 'Zum Anmelden wechseln'}
        </button>
        {message && <p style={{ marginTop: '20px', color: 'red' }}>{message}</p>}
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <button onClick={handleLogout}>Abmelden</button>
        <nav style={{ display: 'flex', gap: '10px' }}>
          <Link to="/tracks">Tracks</Link>
          <Link to="/playlists">Playlists</Link>
          {user.role === 'creator' && (
            <>
              <Link to="/upload">Upload</Link>
              <Link to="/profile">Profil</Link>
            </>
          )}
        </nav>
      </div>
      <Routes>
        <Route path="/tracks" element={<TracksPage token={localStorage.getItem('token')} />} />
        <Route path="/playlists" element={<PlaylistsPage token={localStorage.getItem('token')} user={user} />} />
        {user.role === 'creator' && (
          <>
            <Route path="/upload" element={<UploadPage token={localStorage.getItem('token')} />} />
            <Route path="/profile" element={<ProfilePage token={localStorage.getItem('token')} user={user} />} />
          </>
        )}
      </Routes>
    </div>
  );
};

const App = () => (
  <Router>
    <MainApp />
  </Router>
);

export default App;
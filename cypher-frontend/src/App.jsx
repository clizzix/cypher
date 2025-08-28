import React, { useState } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

function App() {
    const [isLogin, setIsLogin ] = useState(true);
    const [email, setEmail ] = useState('');
    const [password, setPassword] = useState('');
    const [artistName, setArtistName] = useState('');
    const [userRole, setUserRole] = useState('listener');
    const [message, setMessage] = useState('');

    const handleAuth = async (event) => {
        event.preventDefault();
        setMessage('');

        const endpoint = isLogin ? 'login' : 'register';
        const authData = isLogin
            ? { email, password }
            : { email, password, userRole, artistName: userRole == 'creator' ? artistName: undefined };
        
        try {
            const response = await axios.post(`${API_URL}/${endpoint}`, authData);
            setMessage(response.data.message);
            console.log('Antwort vom Server:', response.data);
            if (response.data.token) {
                localStorage.setItem('token', response.data.token);
            }
        } catch (error) {
            setMessage(error.response?.data?.message || 'Ein Fehler ist aufgetreten.');
        }
    };

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
                        {userRole == 'creator' && (
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

export default App;
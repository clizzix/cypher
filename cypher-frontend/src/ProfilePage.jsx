import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

const ProfilePage = ({ token, user }) => {
  const [tracks, setTracks] = useState([]);
  const [message, setMessage] = useState('');
  const [currentAudio, setCurrentAudio] = useState(null);

  const fetchUserTracks = async () => {
    try {
      const response = await axios.get(`${API_URL}/tracks/user`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setTracks(response.data);
    } catch (error) {
      setMessage('Fehler beim Abrufen der Tracks.');
      console.error('Fehler beim Abrufen der Tracks:', error);
    }
  };

  useEffect(() => {
    fetchUserTracks();
  }, [token]);

  const handleDownload = async (trackId) => {
    try {
      const response = await axios.get(`${API_URL}/tracks/download/${trackId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data.downloadUrl;
    } catch (error) {
      setMessage('Fehler beim Generieren der Download-URL.');
      console.error('Fehler beim Herunterladen des Tracks:', error);
      return null;
    }
  };

  const handlePlay = async (track) => {
    const audioUrl = await handleDownload(track.track_id);
    if (audioUrl) {
      if (currentAudio) {
        currentAudio.pause();
      }
      const newAudio = new Audio(audioUrl);
      newAudio.play();
      setCurrentAudio(newAudio);
    }
  };

  const handleDelete = async (trackId) => {
    try {
      await axios.delete(`${API_URL}/tracks/${trackId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setMessage('Track erfolgreich gelöscht.');
      fetchUserTracks(); // Tracks nach dem Löschen neu laden
    } catch (error) {
      setMessage(error.response?.data?.message || 'Fehler beim Löschen des Tracks.');
      console.error('Löschfehler:', error);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1>Mein Profil</h1>
      <p>Willkommen, {user.artistName || user.email}!</p>
      <h2>Meine hochgeladenen Tracks</h2>
      {message && <p style={{ color: 'red' }}>{message}</p>}
      <ul style={{ listStyleType: 'none', padding: 0 }}>
        {tracks.length > 0 ? (
          tracks.map((track) => (
            <li key={track.track_id} style={{ border: '1px solid #ccc', margin: '10px 0', padding: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3>{track.title}</h3>
                <p>Genre: {track.genre}</p>
              </div>
              <div>
                <button onClick={() => handlePlay(track)} style={{ marginRight: '10px' }}>Wiedergabe</button>
                <button onClick={() => handleDelete(track.track_id)} style={{ backgroundColor: 'red', color: 'white', border: 'none' }}>Löschen</button>
              </div>
            </li>
          ))
        ) : (
          <p>Du hast noch keine Tracks hochgeladen.</p>
        )}
      </ul>
    </div>
  );
};

export default ProfilePage;
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

const PlaylistsPage = ({ token, user }) => {
  const [playlists, setPlaylists] = useState([]);
  const [message, setMessage] = useState('');
  const [newPlaylistName, setNewPlaylistName] = useState('');

  const fetchPlaylists = async () => {
    try {
      const response = await axios.get(`${API_URL}/playlists`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setPlaylists(response.data);
    } catch (error) {
      setMessage('Fehler beim Abrufen der Playlists.');
      console.error('Fehler beim Abrufen der Playlists:', error);
    }
  };

  useEffect(() => {
    fetchPlaylists();
  }, [token]);

  const handleCreatePlaylist = async (e) => {
    e.preventDefault();
    if (!newPlaylistName) {
      setMessage('Der Playlist-Name darf nicht leer sein.');
      return;
    }

    try {
      await axios.post(`${API_URL}/playlists`, { name: newPlaylistName }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setMessage('Playlist erfolgreich erstellt.');
      setNewPlaylistName('');
      fetchPlaylists(); // Playlists nach dem Erstellen neu laden
    } catch (error) {
      setMessage(error.response?.data?.message || 'Fehler beim Erstellen der Playlist.');
      console.error('Erstellungsfehler:', error);
    }
  };

  const handleDeletePlaylist = async (playlistId) => {
    try {
      await axios.delete(`${API_URL}/playlists/${playlistId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setMessage('Playlist erfolgreich gelöscht.');
      fetchPlaylists(); // Playlists nach dem Löschen neu laden
    } catch (error) {
      setMessage(error.response?.data?.message || 'Fehler beim Löschen der Playlist.');
      console.error('Löschfehler:', error);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1>Meine Playlists</h1>
      <form onSubmit={handleCreatePlaylist} style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        <input
          type="text"
          placeholder="Name der neuen Playlist"
          value={newPlaylistName}
          onChange={(e) => setNewPlaylistName(e.target.value)}
          style={{ flex: 1, padding: '8px' }}
          required
        />
        <button type="submit">Playlist erstellen</button>
      </form>

      {message && <p style={{ color: 'red' }}>{message}</p>}

      <ul style={{ listStyleType: 'none', padding: 0 }}>
        {playlists.length > 0 ? (
          playlists.map((playlist) => (
            <li key={playlist.playlist_id} style={{ border: '1px solid #ccc', margin: '10px 0', padding: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>{playlist.name}</h3>
              <button onClick={() => handleDeletePlaylist(playlist.playlist_id)} style={{ backgroundColor: 'red', color: 'white', border: 'none' }}>
                Löschen
              </button>
            </li>
          ))
        ) : (
          <p>Du hast noch keine Playlists erstellt.</p>
        )}
      </ul>
    </div>
  );
};

export default PlaylistsPage;
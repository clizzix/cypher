import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

const PlaylistsPage = ({ token, user }) => {
  const [playlists, setPlaylists] = useState([]);
  const [message, setMessage] = useState('');
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [expandedPlaylist, setExpandedPlaylist] = useState(null);
  const [currentAudio, setCurrentAudio] = useState(null);

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

  const fetchPlaylistDetails = async (playlistId) => {
    try {
      const response = await axios.get(`${API_URL}/playlists/${playlistId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      setMessage('Fehler beim Abrufen der Playlist-Details.');
      console.error('Fehler beim Abrufen der Playlist-Details:', error);
      return null;
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
      fetchPlaylists();
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
      fetchPlaylists();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Fehler beim Löschen der Playlist.');
      console.error('Löschfehler:', error);
    }
  };

  const handleToggleExpand = async (playlistId) => {
    if (expandedPlaylist === playlistId) {
      setExpandedPlaylist(null); // Zusammenklappen, wenn es bereits erweitert ist
    } else {
      const playlistDetails = await fetchPlaylistDetails(playlistId);
      if (playlistDetails) {
        setExpandedPlaylist({ ...playlistDetails }); // Erweitern und Details speichern
      }
    }
  };

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

  const handleRemoveTrack = async (playlistId, trackId) => {
    try {
      await axios.delete(`${API_URL}/playlists/${playlistId}/tracks/${trackId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setMessage('Track erfolgreich aus der Playlist entfernt.');
      // Update the expanded playlist state to reflect the removal
      setExpandedPlaylist(prevState => ({
        ...prevState,
        tracks: prevState.tracks.filter(track => track.track_id !== trackId)
      }));
    } catch (error) {
      setMessage(error.response?.data?.message || 'Fehler beim Entfernen des Tracks aus der Playlist.');
      console.error('Fehler beim Entfernen des Tracks:', error);
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

// ... (oberer Teil des Codes)

<ul style={{ listStyleType: 'none', padding: 0 }}>
    {playlists.length > 0 ? (
        playlists.map((playlist) => (
            <li key={playlist.playlist_id} style={{ border: '1px solid #ccc', margin: '10px 0', padding: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3>{playlist.name}</h3>
                    <div>
                        <button onClick={() => handleToggleExpand(playlist.playlist_id)}>
                            {expandedPlaylist?.playlist_id === playlist.playlist_id ? 'Verbergen' : 'Anzeigen'}
                        </button>
                        <button onClick={() => handleDeletePlaylist(playlist.playlist_id)} style={{ backgroundColor: 'red', color: 'white', border: 'none', marginLeft: '10px' }}>
                            Löschen
                        </button>
                    </div>
                </div>
                {expandedPlaylist?.playlist_id === playlist.playlist_id && (
                    <div style={{ marginTop: '10px' }}>
                        <h4>Tracks:</h4>
                        {expandedPlaylist.tracks.length > 0 ? (
                            <ul style={{ listStyleType: 'none', padding: 0 }}>
                                {expandedPlaylist.tracks.map(track => (
                                    <li key={track.track_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #eee', padding: '8px', margin: '5px 0' }}>
                                        <span>{track.title} von {track.artist_name}</span>
                                        <div>
                                            <button onClick={() => handlePlay(track)}>Wiedergabe</button>
                                            <button onClick={() => handleRemoveTrack(playlist.playlist_id, track.track_id)} style={{ backgroundColor: 'orange', color: 'white', border: 'none', marginLeft: '10px' }}>
                                                Entfernen
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p>Keine Tracks in dieser Playlist.</p>
                        )}
                    </div>
                )}
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
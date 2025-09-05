import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

const TracksPage = ({ token }) => {
  const [tracks, setTracks] = useState([]);
  const [message, setMessage] = useState('');
  const [currentAudio, setCurrentAudio] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [genres, setGenres] = useState([]); // Zustand für die Genres

  // Funktion zum Abrufen aller Tracks und Genres
  const fetchTracks = async () => {
    try {
      const response = await axios.get(`${API_URL}/tracks`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        params: {
          q: searchTerm,
          genre: selectedGenre
        }
      });
      setTracks(response.data);
    } catch (error) {
      setMessage('Fehler beim Abrufen der Tracks.');
      console.error('Fehler beim Abrufen der Tracks:', error);
    }
  };

  // Funktion zum Abrufen der Genres
  const fetchGenres = async () => {
    try {
      // Annahme: Dein Backend hat eine /genres Route
      // Wenn nicht, kannst du eine Liste manuell definieren
      // oder die Genres aus den Tracks extrahieren.
      // Fürs Erste definieren wir sie manuell.
      const availableGenres = ['Rock', 'Pop', 'Jazz', 'Hip Hop', 'Electronic', 'Techno'];
      setGenres(availableGenres);
    } catch (error) {
      console.error('Fehler beim Abrufen der Genres:', error);
    }
  };

  useEffect(() => {
    fetchTracks();
    fetchGenres();
  }, [token, searchTerm, selectedGenre]);

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

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1>Entdecke Musik</h1>
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        <input
          type="text"
          placeholder="Suche nach Titel oder Künstler"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ padding: '8px', width: '300px' }}
        />
        <select
          value={selectedGenre}
          onChange={(e) => setSelectedGenre(e.target.value)}
          style={{ padding: '8px' }}
        >
          <option value="">Alle Genres</option>
          {genres.map(genre => (
            <option key={genre} value={genre}>{genre}</option>
          ))}
        </select>
      </div>
      {message && <p style={{ color: 'red' }}>{message}</p>}
      <ul style={{ listStyleType: 'none', padding: 0 }}>
        {tracks.length > 0 ? (
          tracks.map((track) => (
            <li key={track.track_id} style={{ border: '1px solid #ccc', margin: '10px 0', padding: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3>{track.title}</h3>
                <p>Künstler: {track.artist_name}</p>
                <p>Genre: {track.genre}</p>
              </div>
              <button onClick={() => handlePlay(track)}>Wiedergabe</button>
            </li>
          ))
        ) : (
          <p>Keine Tracks gefunden, die den Kriterien entsprechen.</p>
        )}
      </ul>
    </div>
  );
};

export default TracksPage;
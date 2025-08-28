import React, { useState } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

const UploadPage = ({ token }) => {
    const [file, setFile] = useState(null);
    const [title, setTitle] = useState('');
    const [genre, setGenre] = useState('');
    const [description, setDescription] = useState('');
    const [message, setMessage] = useState('');

    const handleUpload = async (e) => {
        e.preventDefault();
        setMessage('');

        if (!file) {
            setMessage('Bitte wähle eine Datei aus.')
            return;
        }

        const formData = new FormData();
        formData.append('audioFile', file);
        formData.append('title', title);
        formData.append('genre', genre);
        formData.append('description', description);

        try {
            const response = await axios.post(`${API_URL}/upload`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${token}`
                }
            });
            setMessage(response.data.message);
            console.log('upload erfolgreich:', response.data);
        } catch (error) {
            setMessage(error.response?.data?.message || 'Upload fehlgeschlagen.');
            console.error('Upload-Fehler:', error.response?.data || error.message);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'Arial' }}>
            <h1>Musik hochladen</h1>
            <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '300px' }}>
                <input
                    type="file"
                    onChange={(e) => setFile(e.target.files[0])}
                    required
                />
                <input 
                    type="text"
                    placeholder="Titel"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                />
                <input 
                    type="text"
                    placeholder="Genre"
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    required
                />
                <textarea
                    placeholder="Beschreibung"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                />
                <button type="submit">Hochladen</button>
            </form>
            {message && <p style={{ marginTop: '20px', color: 'red' }}>{message}</p>}
        </div>
    );
};

export default UploadPage;
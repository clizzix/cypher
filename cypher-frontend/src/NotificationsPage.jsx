import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

const NotificationsPage = ({ token }) => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_URL}/notifications`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setNotifications(response.data);
            setMessage('');
        } catch (error) {
            console.error('Fehler beim Abrufen der Benachrichtigungen:', error);
            setMessage('Benachrichtigungen konnten nicht geladen werden.');
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAsRead = async (id) => {
        try {
            await axios.put(`${API_URL}/notifications/${id}/read`, {}, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            // Update the state to reflect the change
            setNotifications(prevNotifications =>
                prevNotifications.map(n =>
                    n.notification_id === id ? { ...n, is_read: true } : n
                )
            );
        } catch (error) {
            console.error('Fehler beim Markieren als gelesen:', error);
            setMessage('Fehler beim Aktualisieren der Benachrichtigung.');
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, [token]);

    if (loading) {
        return <p>Benachrichtigungen werden geladen...</p>;
    }

    return (
        <div style={{ padding: '20px', fontFamily: 'Arial' }}>
            <h1>Deine Benachrichtigungen</h1>
            {message && <p style={{ color: 'red' }}>{message}</p>}
            {notifications.length > 0 ? (
                <ul style={{ listStyleType: 'none', padding: 0 }}>
                    {notifications.map(notification => (
                        <li key={notification.notification_id} style={{
                            border: '1px solid #ccc',
                            margin: '10px 0',
                            padding: '15px',
                            borderRadius: '5px',
                            backgroundColor: notification.is_read ? '#f0f0f0' : '#ffffff',
                            position: 'relative'
                        }}>
                            <p><strong>Typ:</strong> {notification.notification_type}</p>
                            <p>{notification.message}</p>
                            <p style={{ fontSize: '0.8em', color: '#666' }}>
                                Gesendet am: {new Date(notification.created_at).toLocaleString()}
                            </p>
                            {!notification.is_read && (
                                <button
                                    onClick={() => handleMarkAsRead(notification.notification_id)}
                                    style={{
                                        position: 'absolute',
                                        top: '10px',
                                        right: '10px',
                                        backgroundColor: 'green',
                                        color: 'white',
                                        border: 'none',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Als gelesen markieren
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
            ) : (
                <p>Du hast keine Benachrichtigungen.</p>
            )}
        </div>
    );
};

export default NotificationsPage;
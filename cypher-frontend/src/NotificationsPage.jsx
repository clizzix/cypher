import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './NotificationsPage.css'; // <-- Importiere die neue CSS-Datei

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
        } catch (error) {
            setMessage(error.response?.data?.message || 'Fehler beim Laden der Benachrichtigungen.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, [token]);

    if (loading) {
        return <p className="loading-message">Lade Benachrichtigungen...</p>;
    }

    return (
        <div className="notifications-container">
            <h1 className="page-title">Benachrichtigungen</h1>

            {message && <p className="message">{message}</p>}

            {notifications.length > 0 ? (
                <ul className="notifications-list">
                    {notifications.map((notification) => (
                        <li key={notification.id} className="notification-item">
                            <span className="notification-content">{notification.message}</span>
                            <span className="notification-timestamp">{new Date(notification.timestamp).toLocaleString()}</span>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="empty-message">Du hast keine Benachrichtigungen.</p>
            )}
        </div>
    );
};

export default NotificationsPage;
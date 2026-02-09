import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationsAPI } from '../services/api';
import './NotificationsPopup.css';

export default function NotificationsPopup({ isOpen, onClose }) {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(false);
    const popupRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (isOpen) {
            fetchNotifications();
            markAllAsRead();
        }
    }, [isOpen]);

    useEffect(() => {
        function handleClickOutside(event) {
            if (popupRef.current && !popupRef.current.contains(event.target)) {
                onClose();
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const response = await notificationsAPI.getAll({ limit: 5 });
            setNotifications(response.data);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const markAllAsRead = async () => {
        try {
            // Mark all fetched unread notifications as read
            const unreadIds = notifications
                .filter(n => !n.is_read)
                .map(n => n.id);

            if (unreadIds.length > 0) {
                await Promise.all(unreadIds.map(id => notificationsAPI.markAsRead(id)));
            }
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    };

    const handleNotificationClick = async (notification) => {
        try {
            if (!notification.is_read) {
                await notificationsAPI.markAsRead(notification.id);
            }
            navigate(`/apply/${notification.event_type}/${notification.event_id}`);
            onClose();
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const handleViewAll = () => {
        navigate('/notifications');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="notifications-popup" ref={popupRef}>
            <div className="notifications-popup-header">
                <h3>Notifications</h3>
            </div>

            <div className="notifications-popup-body" data-lenis-prevent>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '2rem' }}>
                        <div className="loading"></div>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="notifications-empty">
                        <p>No notifications yet</p>
                    </div>
                ) : (
                    <div className="notifications-list">
                        {notifications.map((notification) => (
                            <div
                                key={notification.id}
                                className={`notification-item ${!notification.is_read ? 'unread' : ''}`}
                                onClick={() => handleNotificationClick(notification)}
                            >
                                <div className="notification-content">
                                    <div className="notification-title">{notification.title}</div>
                                    <div className="notification-message">{notification.message}</div>
                                    <div className="notification-time">
                                        {new Date(notification.created_at).toLocaleDateString()} at{' '}
                                        {new Date(notification.created_at).toLocaleTimeString()}
                                    </div>
                                </div>
                                {!notification.is_read && <div className="notification-dot"></div>}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="notifications-popup-footer">
                <button onClick={handleViewAll} className="btn btn-secondary" style={{ width: '100%' }}>
                    View All Notifications
                </button>
            </div>
        </div>
    );
}

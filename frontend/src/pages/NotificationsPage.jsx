import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationsAPI } from '../services/api';

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // all, unread, read
    const navigate = useNavigate();

    useEffect(() => {
        fetchNotifications();
    }, []); // Fetch once on mount

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const response = await notificationsAPI.getAll({});
            setNotifications(response.data);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleNotificationClick = async (notification) => {
        try {
            if (!notification.is_read) {
                await notificationsAPI.markAsRead(notification.id);
                // Update local state
                setNotifications(notifications.map(n =>
                    n.id === notification.id ? { ...n, is_read: true } : n
                ));
            }
            navigate(`/apply/${notification.event_type}/${notification.event_id}`);
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await notificationsAPI.markAllAsRead();
            fetchNotifications();
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    };

    const unreadCount = notifications.filter(n => !n.is_read).length;

    if (loading) {
        return (
            <div className="container" style={{ paddingTop: '2rem', textAlign: 'center' }}>
                <div className="loading" style={{ width: '40px', height: '40px' }}></div>
            </div>
        );
    }

    return (
        <div className="container" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <h1>Notifications</h1>
                    {unreadCount > 0 && (
                        <button onClick={handleMarkAllAsRead} className="btn btn-secondary">
                            Mark All as Read
                        </button>
                    )}
                </div>

                {/* Filter Tabs */}
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--color-border)' }}>
                    <button
                        onClick={() => setFilter('all')}
                        style={{
                            padding: '0.5rem 1rem',
                            background: 'none',
                            border: 'none',
                            borderBottom: filter === 'all' ? '2px solid var(--color-accent)' : '2px solid transparent',
                            color: filter === 'all' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                            fontWeight: filter === 'all' ? 600 : 400,
                            cursor: 'pointer',
                            transition: 'all var(--transition)'
                        }}
                    >
                        All ({notifications.length})
                    </button>
                    <button
                        onClick={() => setFilter('unread')}
                        style={{
                            padding: '0.5rem 1rem',
                            background: 'none',
                            border: 'none',
                            borderBottom: filter === 'unread' ? '2px solid var(--color-accent)' : '2px solid transparent',
                            color: filter === 'unread' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                            fontWeight: filter === 'unread' ? 600 : 400,
                            cursor: 'pointer',
                            transition: 'all var(--transition)'
                        }}
                    >
                        Unread ({unreadCount})
                    </button>
                    <button
                        onClick={() => setFilter('read')}
                        style={{
                            padding: '0.5rem 1rem',
                            background: 'none',
                            border: 'none',
                            borderBottom: filter === 'read' ? '2px solid var(--color-accent)' : '2px solid transparent',
                            color: filter === 'read' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                            fontWeight: filter === 'read' ? 600 : 400,
                            cursor: 'pointer',
                            transition: 'all var(--transition)'
                        }}
                    >
                        Read ({notifications.length - unreadCount})
                    </button>
                </div>

                {/* Notifications List */}
                {notifications.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                        <p style={{ color: 'var(--color-text-tertiary)' }}>No notifications to show</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {notifications
                            .filter(n => {
                                if (filter === 'unread') return !n.is_read;
                                if (filter === 'read') return n.is_read;
                                return true;
                            })
                            .map((notification) => (
                                <div
                                    key={notification.id}
                                    className="card"
                                    onClick={() => handleNotificationClick(notification)}
                                    style={{
                                        cursor: 'pointer',
                                        backgroundColor: !notification.is_read ? 'rgba(59, 130, 246, 0.05)' : 'var(--color-bg-card)',
                                        borderLeft: !notification.is_read ? '3px solid var(--color-accent)' : '3px solid transparent',
                                        padding: '1rem 1.25rem'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                                <h4 style={{ margin: 0, fontSize: '0.9375rem' }}>{notification.title}</h4>
                                                {!notification.is_read && (
                                                    <div style={{
                                                        width: '8px',
                                                        height: '8px',
                                                        backgroundColor: 'var(--color-accent)',
                                                        borderRadius: '50%'
                                                    }}></div>
                                                )}
                                            </div>
                                            <p style={{ margin: '0.5rem 0', fontSize: '0.875rem' }}>{notification.message}</p>
                                            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
                                                {new Date(notification.created_at).toLocaleDateString()} at{' '}
                                                {new Date(notification.created_at).toLocaleTimeString()}
                                            </p>
                                        </div>
                                        <span className={`badge badge-info`} style={{ marginLeft: '1rem' }}>
                                            {notification.event_type}
                                        </span>
                                    </div>
                                </div>
                            ))}
                    </div>
                )}
            </div>
        </div>
    );
}

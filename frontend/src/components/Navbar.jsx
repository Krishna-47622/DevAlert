import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { notificationsAPI } from '../services/api';
import NotificationsPopup from './NotificationsPopup';
import Magnetic from './Magnetic';

export default function Navbar() {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const [unreadCount, setUnreadCount] = useState(0);
    const [showNotifications, setShowNotifications] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        if (user) {
            fetchUnreadCount();
            // Poll for new notifications every 30 seconds
            const interval = setInterval(fetchUnreadCount, 30000);
            return () => clearInterval(interval);
        }
    }, [user]);

    const fetchUnreadCount = async () => {
        try {
            const response = await notificationsAPI.getUnreadCount();
            setUnreadCount(response.data.count);
        } catch (error) {
            console.error('Error fetching unread count:', error);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    const toggleNotifications = (e) => {
        e.stopPropagation();
        setShowNotifications(!showNotifications);
    };

    const toggleMobileMenu = () => {
        setIsMobileMenuOpen(!isMobileMenuOpen);
    };

    const navLinkClass = ({ isActive }) => isActive ? 'nav-link active' : 'nav-link';

    return (
        <nav className="navbar" style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)' }}>
            <div className="container">
                <div className="navbar-content" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '64px' }}>
                    <Link to="/" className="navbar-brand" style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-primary)', textDecoration: 'none' }}>
                        DevAlert
                        <span style={{ color: 'var(--primary-color)' }}>.</span>
                    </Link>

                    {/* Mobile Menu Toggle */}
                    <button className="mobile-menu-toggle" onClick={toggleMobileMenu}>
                        <span className="material-icons">{isMobileMenuOpen ? 'close' : 'menu'}</span>
                    </button>

                    <ul className={`navbar-nav ${isMobileMenuOpen ? 'mobile-active' : ''}`} style={{ display: 'flex', gap: '2rem', listStyle: 'none', margin: 0, padding: 0, alignItems: 'center' }}>
                        {user ? (
                            <>
                                <li>
                                    <Magnetic><NavLink to="/" className={navLinkClass} onClick={() => setIsMobileMenuOpen(false)} end>Dashboard</NavLink></Magnetic>
                                </li>
                                <li>
                                    <Magnetic><NavLink to="/about" className={navLinkClass} onClick={() => setIsMobileMenuOpen(false)}>About Us</NavLink></Magnetic>
                                </li>
                                {user.role === 'admin' && (
                                    <li>
                                        <Magnetic><NavLink to="/admin" className={navLinkClass} onClick={() => setIsMobileMenuOpen(false)}>Admin</NavLink></Magnetic>
                                    </li>
                                )}
                                {(user.role === 'hoster' || user.role === 'admin') && (
                                    <>
                                        <li>
                                            <Magnetic><NavLink to="/host-event" className={navLinkClass} onClick={() => setIsMobileMenuOpen(false)}>Host Event</NavLink></Magnetic>
                                        </li>
                                        <li>
                                            <Magnetic><NavLink to="/applicants" className={navLinkClass} onClick={() => setIsMobileMenuOpen(false)}>Applicants</NavLink></Magnetic>
                                        </li>
                                    </>
                                )}
                                <li>
                                    <Magnetic><NavLink to="/applicant" className={navLinkClass} onClick={() => setIsMobileMenuOpen(false)}>Opportunities</NavLink></Magnetic>
                                </li>
                                <li>
                                    <Magnetic><NavLink to="/settings" className={navLinkClass} onClick={() => setIsMobileMenuOpen(false)}>Settings</NavLink></Magnetic>
                                </li>
                                <li style={{ position: 'relative' }}>
                                    <Magnetic>
                                        <button
                                            onClick={toggleNotifications}
                                            className="nav-link"
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                padding: '0.5rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                color: showNotifications ? 'var(--primary-color)' : 'inherit'
                                            }}
                                        >
                                            <span className="material-icons">notifications</span>
                                            {unreadCount > 0 && (
                                                <span className="notification-badge" style={{
                                                    position: 'absolute',
                                                    top: '0',
                                                    right: '0',
                                                    backgroundColor: 'var(--danger-color)',
                                                    color: 'white',
                                                    borderRadius: '50%',
                                                    width: '18px',
                                                    height: '18px',
                                                    fontSize: '10px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}>{unreadCount}</span>
                                            )}
                                        </button>
                                    </Magnetic>
                                    <NotificationsPopup
                                        isOpen={showNotifications}
                                        onClose={() => setShowNotifications(false)}
                                    />
                                </li>
                                <li>
                                    <button onClick={handleLogout} className="btn" style={{
                                        padding: '0.5rem 1rem',
                                        backgroundColor: 'var(--surface-color)',
                                        border: '1px solid var(--border-color)',
                                        color: 'var(--text-secondary)',
                                        transition: 'all 0.2s',
                                        cursor: 'pointer'
                                    }}
                                        onMouseOver={(e) => {
                                            e.currentTarget.style.borderColor = 'var(--danger-color)';
                                            e.currentTarget.style.color = 'var(--danger-color)';
                                        }}
                                        onMouseOut={(e) => {
                                            e.currentTarget.style.borderColor = 'var(--border-color)';
                                            e.currentTarget.style.color = 'var(--text-secondary)';
                                        }}
                                    >
                                        Logout
                                    </button>
                                </li>
                            </>
                        ) : (
                            <li>
                                <NavLink to="/login" className={navLinkClass} onClick={() => setIsMobileMenuOpen(false)}>Login</NavLink>
                            </li>
                        )}
                    </ul>
                </div>
            </div>
        </nav>
    );
}

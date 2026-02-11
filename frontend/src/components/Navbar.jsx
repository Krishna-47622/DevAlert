import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { notificationsAPI } from '../services/api';
import NotificationsPopup from './NotificationsPopup';
import Magnetic from './Magnetic';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navbar({ theme, toggleTheme }) {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const [unreadCount, setUnreadCount] = useState(0);
    const [showNotifications, setShowNotifications] = useState(false);

    // Dynamic Island State
    const [isExpanded, setIsExpanded] = useState(false);

    // Ref for the notification button to anchor the portal
    const notificationBtnRef = useRef(null);

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

    const navLinkClass = ({ isActive }) => isActive ? 'nav-link active' : 'nav-link';

    const handleExpandToggle = (e) => {
        // Prevent toggle if clicking interactive elements inside
        if (e.target.closest('button') || e.target.closest('a')) return;

        if (!isExpanded) {
            setIsExpanded(true);
        }
    };

    const handleArrowClick = (e) => {
        e.stopPropagation();
        if (isExpanded) {
            setShowNotifications(false); // Close notifications when collapsing
            setIsExpanded(false);
        } else {
            setIsExpanded(true);
        }
    };

    return (
        <motion.nav
            className="navbar-dynamic-island"
            layout
            initial={false}
            animate={{
                width: isExpanded ? 'auto' : '180px',
                height: 60,
                borderRadius: '30px'
            }}
            transition={{
                type: "spring",
                stiffness: 400,
                damping: 30,
                mass: 1,
                layout: { duration: 0.3 }
            }}
            onClick={handleExpandToggle}
            style={{
                position: 'fixed',
                top: '20px',
                left: 0,
                right: 0,
                marginLeft: 'auto',
                marginRight: 'auto',
                zIndex: 1000,
                maxWidth: '95vw',
                backgroundColor: 'rgba(0,0,0,0.6)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.1)',
                padding: '0 20px', // Removed vertical padding, relying on flex alignment
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: isExpanded ? 'default' : 'pointer',
                overflow: 'hidden' // Always hidden is fine now that Popup is a Portal
            }}
        >
            {/* Logo Section - Always Visible */}
            <motion.div layout="position" style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                <Link to="/" className="navbar-brand" style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text-primary)', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
                    DevAlert
                    <span style={{ color: 'var(--primary-color)' }}>.</span>
                </Link>
            </motion.div>

            {/* Navigation Links - Hidden when collapsed */}
            <AnimatePresence mode="popLayout">
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, width: 0, scale: 0.9 }}
                        animate={{ opacity: 1, width: 'auto', scale: 1 }}
                        exit={{ opacity: 0, width: 0, scale: 0.9 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '2rem',
                            overflowX: 'auto', // Enable horizontal scroll
                            overflowY: 'hidden',
                            whiteSpace: 'nowrap',
                            height: '100%',
                            msOverflowStyle: 'none',  /* IE and Edge */
                            scrollbarWidth: 'none',   /* Firefox */
                            WebkitOverflowScrolling: 'touch' // Smooth scroll on iOS
                        }}
                        className="navbar-scroll-container"
                    >
                        <style>{`
                            .navbar-scroll-container::-webkit-scrollbar {
                                display: none; /* Hide scrollbar for Chrome, Safari and Opera */
                            }
                        `}</style>
                        <ul className="navbar-nav" style={{ display: 'flex', gap: '1.5rem', listStyle: 'none', margin: 0, padding: '0 10px', alignItems: 'center', whiteSpace: 'nowrap' }}>
                            {user ? (
                                <>
                                    <li>
                                        <NavLink to="/" className="nav-link" style={{ position: 'relative', padding: '0.4rem 0.8rem', color: 'inherit', textDecoration: 'none' }}>
                                            {({ isActive }) => (
                                                <>
                                                    <span style={{ position: 'relative', zIndex: 10, color: isActive ? 'var(--primary-color)' : 'inherit' }}>Dashboard</span>
                                                    {isActive && (
                                                        <motion.div
                                                            layoutId="navbar-pill"
                                                            style={{
                                                                position: 'absolute',
                                                                inset: 0,
                                                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                                                borderRadius: '20px',
                                                                zIndex: 1
                                                            }}
                                                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                                        />
                                                    )}
                                                </>
                                            )}
                                        </NavLink>
                                    </li>
                                    <li>
                                        <NavLink to="/about" className="nav-link" style={{ position: 'relative', padding: '0.4rem 0.8rem', color: 'inherit', textDecoration: 'none' }}>
                                            {({ isActive }) => (
                                                <>
                                                    <span style={{ position: 'relative', zIndex: 10, color: isActive ? 'var(--primary-color)' : 'inherit' }}>About</span>
                                                    {isActive && (
                                                        <motion.div
                                                            layoutId="navbar-pill"
                                                            style={{
                                                                position: 'absolute',
                                                                inset: 0,
                                                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                                                borderRadius: '20px',
                                                                zIndex: 1
                                                            }}
                                                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                                        />
                                                    )}
                                                </>
                                            )}
                                        </NavLink>
                                    </li>
                                    {user.role === 'admin' && (
                                        <li>
                                            <NavLink to="/admin" className="nav-link" style={{ position: 'relative', padding: '0.4rem 0.8rem', color: 'inherit', textDecoration: 'none' }}>
                                                {({ isActive }) => (
                                                    <>
                                                        <span style={{ position: 'relative', zIndex: 10, color: isActive ? 'var(--primary-color)' : 'inherit' }}>Admin</span>
                                                        {isActive && (
                                                            <motion.div
                                                                layoutId="navbar-pill"
                                                                style={{
                                                                    position: 'absolute',
                                                                    inset: 0,
                                                                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                                                    borderRadius: '20px',
                                                                    zIndex: 1
                                                                }}
                                                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                                            />
                                                        )}
                                                    </>
                                                )}
                                            </NavLink>
                                        </li>
                                    )}
                                    {(user.role === 'hoster' || user.role === 'admin') && (
                                        <>
                                            <li>
                                                <NavLink to="/host-event" className="nav-link" style={{ position: 'relative', padding: '0.4rem 0.8rem', color: 'inherit', textDecoration: 'none' }}>
                                                    {({ isActive }) => (
                                                        <>
                                                            <span style={{ position: 'relative', zIndex: 10, color: isActive ? 'var(--primary-color)' : 'inherit' }}>Host</span>
                                                            {isActive && (
                                                                <motion.div
                                                                    layoutId="navbar-pill"
                                                                    style={{
                                                                        position: 'absolute',
                                                                        inset: 0,
                                                                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                                                        borderRadius: '20px',
                                                                        zIndex: 1
                                                                    }}
                                                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                                                />
                                                            )}
                                                        </>
                                                    )}
                                                </NavLink>
                                            </li>
                                            <li>
                                                <NavLink to="/applicants" className="nav-link" style={{ position: 'relative', padding: '0.4rem 0.8rem', color: 'inherit', textDecoration: 'none' }}>
                                                    {({ isActive }) => (
                                                        <>
                                                            <span style={{ position: 'relative', zIndex: 10, color: isActive ? 'var(--primary-color)' : 'inherit' }}>Applicants</span>
                                                            {isActive && (
                                                                <motion.div
                                                                    layoutId="navbar-pill"
                                                                    style={{
                                                                        position: 'absolute',
                                                                        inset: 0,
                                                                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                                                        borderRadius: '20px',
                                                                        zIndex: 1
                                                                    }}
                                                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                                                />
                                                            )}
                                                        </>
                                                    )}
                                                </NavLink>
                                            </li>
                                        </>
                                    )}
                                    <li>
                                        <NavLink to="/opportunities" className="nav-link" style={{ position: 'relative', padding: '0.4rem 0.8rem', color: 'inherit', textDecoration: 'none' }}>
                                            {({ isActive }) => (
                                                <>
                                                    <span style={{ position: 'relative', zIndex: 10, color: isActive ? 'var(--primary-color)' : 'inherit' }}>Opportunities</span>
                                                    {isActive && (
                                                        <motion.div
                                                            layoutId="navbar-pill"
                                                            style={{
                                                                position: 'absolute',
                                                                inset: 0,
                                                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                                                borderRadius: '20px',
                                                                zIndex: 1
                                                            }}
                                                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                                        />
                                                    )}
                                                </>
                                            )}
                                        </NavLink>
                                    </li>
                                    <li>
                                        <NavLink to="/settings" className="nav-link" style={{ position: 'relative', padding: '0.4rem 0.8rem', color: 'inherit', textDecoration: 'none' }}>
                                            {({ isActive }) => (
                                                <>
                                                    <span style={{ position: 'relative', zIndex: 10, color: isActive ? 'var(--primary-color)' : 'inherit' }}>Settings</span>
                                                    {isActive && (
                                                        <motion.div
                                                            layoutId="navbar-pill"
                                                            style={{
                                                                position: 'absolute',
                                                                inset: 0,
                                                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                                                borderRadius: '20px',
                                                                zIndex: 1
                                                            }}
                                                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                                        />
                                                    )}
                                                </>
                                            )}
                                        </NavLink>
                                    </li>
                                    <li style={{ display: 'flex', alignItems: 'center' }}>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleTheme();
                                            }}
                                            className="nav-link"
                                            style={{
                                                background: 'rgba(255, 255, 255, 0.05)',
                                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                padding: '8px',
                                                borderRadius: '50%',
                                                color: theme === 'dark' ? '#fbbf24' : '#6366f1', // Amber for sun, Indigo for moon
                                                transition: 'all 0.3s ease',
                                                width: '36px',
                                                height: '36px'
                                            }}
                                            title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
                                        >
                                            <span className="material-icons" style={{ fontSize: '20px' }}>
                                                {theme === 'dark' ? 'light_mode' : 'dark_mode'}
                                            </span>
                                        </button>
                                    </li>
                                    <li style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                        <button
                                            ref={notificationBtnRef}
                                            onClick={toggleNotifications}
                                            className="nav-link"
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: showNotifications ? 'var(--primary-color)' : 'inherit', padding: '5px', position: 'relative' }}
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
                                                    minWidth: '16px',
                                                    height: '16px',
                                                    fontSize: '10px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    padding: '0 4px',
                                                    zIndex: 10
                                                }}>{unreadCount}</span>
                                            )}
                                        </button>
                                        <NotificationsPopup
                                            isOpen={showNotifications}
                                            onClose={() => setShowNotifications(false)}
                                            anchorRef={notificationBtnRef}
                                        />
                                    </li>
                                    <li>
                                        <motion.button
                                            onClick={handleLogout}
                                            className="btn logout-btn"
                                            whileHover={{
                                                backgroundColor: 'rgba(239, 68, 68, 0.2)',
                                                borderColor: 'var(--danger-color)',
                                                color: 'var(--danger-color)',
                                                boxShadow: '0 0 10px rgba(239, 68, 68, 0.3)'
                                            }}
                                            style={{
                                                padding: '0.4rem 1rem',
                                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                                color: 'var(--text-secondary)',
                                                borderRadius: '20px',
                                                cursor: 'pointer',
                                                transition: 'all 0.3s ease'
                                            }}
                                        >
                                            Logout
                                        </motion.button>
                                    </li>
                                </>
                            ) : (
                                <li>
                                    <NavLink to="/login" className="nav-link" style={{ position: 'relative', padding: '0.4rem 0.8rem', color: 'inherit', textDecoration: 'none' }}>
                                        {({ isActive }) => (
                                            <>
                                                <span style={{ position: 'relative', zIndex: 10, color: isActive ? 'var(--primary-color)' : 'inherit' }}>Login</span>
                                                {isActive && (
                                                    <motion.div
                                                        layoutId="navbar-pill"
                                                        style={{
                                                            position: 'absolute',
                                                            inset: 0,
                                                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                                            borderRadius: '20px',
                                                            zIndex: 1
                                                        }}
                                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                                    />
                                                )}
                                            </>
                                        )}
                                    </NavLink>
                                </li>
                            )}
                        </ul>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Toggle Arrow - Always Visible */}
            <motion.button
                layout="position"
                onClick={handleArrowClick}
                style={{
                    background: 'rgba(255,255,255,0.1)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: 'white',
                    marginLeft: '15px',
                    flexShrink: 0
                }}
                animate={{ rotate: isExpanded ? 0 : 180 }}
                whileHover={{ scale: 1.1, backgroundColor: 'rgba(255,255,255,0.15)' }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
                <span className="material-icons">keyboard_arrow_left</span>
            </motion.button>
        </motion.nav>
    );
}

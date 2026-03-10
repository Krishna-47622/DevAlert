import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { notificationsAPI } from '../services/api';
import NotificationsPopup from './NotificationsPopup';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navbar() {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const [unreadCount, setUnreadCount] = useState(0);
    const [showNotifications, setShowNotifications] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const notificationBtnRef = useRef(null);

    useEffect(() => {
        if (user) {
            fetchUnreadCount();
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

    const handleExpandToggle = (e) => {
        if (e.target.closest('button') || e.target.closest('a')) return;
        if (!isExpanded) setIsExpanded(true);
    };

    const handleArrowClick = (e) => {
        e.stopPropagation();
        if (isExpanded) {
            setShowNotifications(false);
            setIsExpanded(false);
        } else {
            setIsExpanded(true);
        }
    };

    /* ── Blackbird-style navbar ── */
    const navStyle = {
        backgroundColor: 'rgba(5, 5, 10, 0.85)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255,255,255,0.04)',
    };

    const NavItem = ({ to, label }) => (
        <li>
            <NavLink to={to} style={{ position: 'relative', padding: '0.4rem 0.8rem', color: 'inherit', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: "'Space Grotesk', monospace" }}>
                {({ isActive }) => (
                    <>
                        <span style={{ position: 'relative', zIndex: 10, color: isActive ? '#f0ece4' : 'inherit' }}>{label}</span>
                        {isActive && (
                            <motion.div
                                layoutId="navbar-pill"
                                style={{
                                    position: 'absolute',
                                    inset: 0,
                                    background: 'rgba(255, 255, 255, 0.06)',
                                    borderBottom: '1px solid rgba(255, 255, 255, 0.3)',
                                    zIndex: 1,
                                }}
                                transition={{ type: "spring", stiffness: 350, damping: 30 }}
                            />
                        )}
                    </>
                )}
            </NavLink>
        </li>
    );

    return (
        <motion.nav
            className="navbar-dynamic-island"
            layout
            initial={false}
            animate={{
                width: isExpanded ? 'auto' : '180px',
                height: 48,
            }}
            transition={{
                type: "spring",
                stiffness: 500,
                damping: 38,
                mass: 0.5,
                layout: { duration: 0.25 },
            }}
            onClick={handleExpandToggle}
            style={{
                position: 'fixed',
                top: '16px',
                left: 0,
                right: 0,
                marginLeft: 'auto',
                marginRight: 'auto',
                zIndex: 1000,
                maxWidth: '95vw',
                ...navStyle,
                padding: '0 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: isExpanded ? 'default' : 'pointer',
                overflow: 'hidden',
            }}
        >
            {/* ── Logo ── */}
            <motion.div layout="position" style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                <Link to="/" style={{
                    fontSize: '1.2rem', fontWeight: 800, color: '#f0ece4',
                    textDecoration: 'none', display: 'flex', alignItems: 'center', letterSpacing: '0.05em',
                    textTransform: 'uppercase', fontFamily: "'Inter', sans-serif",
                }}>
                    DevAlert
                </Link>
            </motion.div>

            {/* ── Nav Links (expanded) ── */}
            <AnimatePresence mode="popLayout">
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, width: 0, scale: 0.92, filter: 'blur(8px)' }}
                        animate={{ opacity: 1, width: 'auto', scale: 1, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, width: 0, scale: 0.92, filter: 'blur(8px)' }}
                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '2rem',
                            overflowX: 'auto', overflowY: 'hidden', whiteSpace: 'nowrap',
                            height: '100%', msOverflowStyle: 'none', scrollbarWidth: 'none',
                            WebkitOverflowScrolling: 'touch',
                        }}
                        className="navbar-scroll-container"
                    >
                        <style>{`.navbar-scroll-container::-webkit-scrollbar { display: none; }`}</style>
                        <ul style={{ display: 'flex', gap: '0.25rem', listStyle: 'none', margin: 0, padding: '0 8px', alignItems: 'center', whiteSpace: 'nowrap' }}>
                            {user ? (
                                <>
                                    <NavItem to="/" label="Dashboard" />
                                    <NavItem to="/about" label="About" />
                                    <NavItem to="/help" label="Help" />
                                    {user.role === 'admin' && <NavItem to="/admin" label="Admin" />}
                                    {(user.role === 'hoster' || user.role === 'admin') && (
                                        <>
                                            <NavItem to="/host-event" label="Host" />
                                            <NavItem to="/applicants" label="Applicants" />
                                        </>
                                    )}
                                    <NavItem to="/opportunities" label="Opportunities" />
                                    <NavItem to="/tracker" label="Tracker" />
                                    <NavItem to="/settings" label="Settings" />

                                    {/* Notification Bell */}
                                    <li style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                        <button
                                            ref={notificationBtnRef}
                                            onClick={toggleNotifications}
                                            style={{
                                                background: showNotifications ? 'rgba(255, 255, 255, 0.1)' : 'none',
                                                border: 'none', cursor: 'pointer', display: 'flex',
                                                alignItems: 'center', color: showNotifications ? '#fff' : 'inherit',
                                                padding: '6px', position: 'relative', borderRadius: '50%',
                                                transition: 'background 0.2s ease',
                                            }}
                                        >
                                            <span className="material-icons" style={{ fontSize: '1.2rem' }}>notifications</span>
                                            {unreadCount > 0 && (
                                                <span style={{
                                                    position: 'absolute', top: 0, right: 0,
                                                    backgroundColor: '#EF4444', color: 'white',
                                                    borderRadius: '50%', minWidth: '15px', height: '15px',
                                                    fontSize: '9px', fontWeight: 700,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    padding: '0 3px', zIndex: 10,
                                                    boxShadow: '0 0 8px rgba(239, 68, 68, 0.4)',
                                                }}>{unreadCount}</span>
                                            )}
                                        </button>
                                        <NotificationsPopup
                                            isOpen={showNotifications}
                                            onClose={() => setShowNotifications(false)}
                                            anchorRef={notificationBtnRef}
                                        />
                                    </li>

                                    {/* Logout */}
                                    <li>
                                        <motion.button
                                            onClick={handleLogout}
                                            whileHover={{
                                                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                                                borderColor: 'rgba(239, 68, 68, 0.4)',
                                                color: '#EF4444',
                                            }}
                                            style={{
                                                padding: '0.4rem 1rem',
                                                background: 'transparent',
                                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                                color: 'var(--text-secondary)',
                                                cursor: 'pointer',
                                                fontSize: '0.72rem', fontWeight: 600,
                                                letterSpacing: '0.1em',
                                                textTransform: 'uppercase',
                                                transition: 'all 0.25s ease',
                                            }}
                                        >
                                            Logout
                                        </motion.button>
                                    </li>
                                </>
                            ) : (
                                <>
                                    <NavItem to="/about" label="About" />
                                    <NavItem to="/help" label="Help" />
                                    <li>
                                        <motion.button
                                            onClick={() => navigate('/login')}
                                            whileHover={{ scale: 1.03, boxShadow: '0 0 20px rgba(255, 255, 255, 0.1)' }}
                                            whileTap={{ scale: 0.97 }}
                                            style={{
                                                padding: '0.4rem 1.2rem',
                                                background: '#f0ece4',
                                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                                color: '#000',
                                                cursor: 'pointer',
                                                fontSize: '0.72rem', fontWeight: 700,
                                                letterSpacing: '0.1em',
                                                textTransform: 'uppercase',
                                            }}
                                        >
                                            Sign In
                                        </motion.button>
                                    </li>
                                </>
                            )}
                        </ul>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Toggle Arrow ── */}
            <motion.button
                layout="position"
                onClick={handleArrowClick}
                style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    width: '28px', height: '28px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: 'rgba(255,255,255,0.5)',
                    marginLeft: '12px', flexShrink: 0,
                }}
                animate={{ rotate: isExpanded ? 0 : 180 }}
                whileHover={{ scale: 1.1, backgroundColor: 'rgba(255, 255, 255, 0.12)', borderColor: 'rgba(255, 255, 255, 0.15)' }}
                whileTap={{ scale: 0.92 }}
                transition={{ type: "spring", stiffness: 450, damping: 25 }}
            >
                <span className="material-icons" style={{ fontSize: '1.1rem' }}>keyboard_arrow_left</span>
            </motion.button>
        </motion.nav>
    );
}

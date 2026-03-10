import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { adminAPI, hackathonsAPI, internshipsAPI } from '../services/api';
import LiveFeed from '../components/LiveFeed';

export default function Dashboard() {
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [recentHackathons, setRecentHackathons] = useState([]);
    const [recentInternships, setRecentInternships] = useState([]);
    const [loading, setLoading] = useState(true);
    let user = null;
    try {
        user = JSON.parse(localStorage.getItem('user') || 'null');
    } catch (e) {
        console.error("Dashboard user parse error", e);
    }

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            if (user?.role === 'admin') {
                const statsResponse = await adminAPI.getStats();
                setStats(statsResponse.data);
            }
            const hackathonsResponse = await hackathonsAPI.getAll({ status: 'approved', sort_by: 'created_at', order: 'desc' });
            setRecentHackathons(hackathonsResponse.data.slice(0, 6));
            const internshipsResponse = await internshipsAPI.getAll({ status: 'approved', sort_by: 'created_at', order: 'desc' });
            setRecentInternships(internshipsResponse.data.slice(0, 6));
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCardClick = (type, id) => {
        navigate(`/opportunities?type=${type}&id=${id}`);
    };

    // Time-based greeting
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 17) return 'Good afternoon';
        return 'Good evening';
    };

    // Deadline helpers
    const getDeadlineInfo = (deadline) => {
        if (!deadline) return null;
        const now = new Date();
        const dl = new Date(deadline);
        const diff = dl - now;
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        if (days < 0) return { text: 'Expired', color: '#64748b', urgent: false };
        if (days <= 3) return { text: `${days}d left`, color: '#ef4444', urgent: true };
        if (days <= 7) return { text: `${days}d left`, color: '#f59e0b', urgent: false };
        return { text: `${days}d left`, color: '#94a3b8', urgent: false };
    };

    // Animation variants
    const stagger = {
        hidden: {},
        visible: { transition: { staggerChildren: 0.08 } },
    };
    const fadeUp = {
        hidden: { opacity: 0, y: 24 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
    };

    if (loading) {
        return (
            <div className="container" style={{ paddingTop: '2rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="skeleton" style={{ height: '100px', borderRadius: '14px' }} />
                    ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="skeleton" style={{ height: '140px', borderRadius: '14px' }} />
                    ))}
                </div>
            </div>
        );
    }

    const totalOpportunities = recentHackathons.length + recentInternships.length;
    const upcomingDeadlines = [...recentHackathons, ...recentInternships]
        .filter(item => {
            const dl = item.deadline || item.application_deadline;
            if (!dl) return false;
            return new Date(dl) > new Date();
        }).length;

    return (
        <motion.div
            className="container"
            style={{ paddingTop: '1.5rem', paddingBottom: '2rem' }}
            variants={stagger}
            initial="hidden"
            animate="visible"
        >
            {/* ─── Hero Greeting ─── */}
            <motion.div variants={fadeUp} style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem', letterSpacing: '-0.02em' }}>
                    {getGreeting()}, <span className="text-gradient">{user?.display_name || user?.full_name || user?.username}</span>
                </h1>
                <p style={{ color: 'var(--color-text-tertiary)', fontSize: '0.9rem', margin: 0 }}>
                    Here's what's happening with your opportunities today.
                </p>
            </motion.div>

            {/* ─── Stats Strip ─── */}
            <motion.div variants={fadeUp} style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '1rem',
                marginBottom: '2rem'
            }}>
                <div className="stat-card" style={{ borderLeft: '3px solid #8B5CF6' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <div className="stat-value">{totalOpportunities}</div>
                            <div className="stat-label">Opportunities</div>
                        </div>
                        <div className="stat-icon" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#A78BFA' }}>
                            <span className="material-icons" style={{ fontSize: '1.2rem' }}>explore</span>
                        </div>
                    </div>
                </div>

                <div className="stat-card" style={{ borderLeft: '3px solid #C084FC' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <div className="stat-value">{recentHackathons.length}</div>
                            <div className="stat-label">Hackathons</div>
                        </div>
                        <div className="stat-icon" style={{ background: 'rgba(192, 132, 252, 0.1)', color: '#E879F9' }}>
                            <span className="material-icons" style={{ fontSize: '1.2rem' }}>code</span>
                        </div>
                    </div>
                </div>

                <div className="stat-card" style={{ borderLeft: '3px solid #10b981' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <div className="stat-value">{recentInternships.length}</div>
                            <div className="stat-label">Internships</div>
                        </div>
                        <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#34d399' }}>
                            <span className="material-icons" style={{ fontSize: '1.2rem' }}>work</span>
                        </div>
                    </div>
                </div>

                <div className="stat-card" style={{ borderLeft: '3px solid #f59e0b' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <div className="stat-value">{upcomingDeadlines}</div>
                            <div className="stat-label">Active Deadlines</div>
                        </div>
                        <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#fbbf24' }}>
                            <span className="material-icons" style={{ fontSize: '1.2rem' }}>schedule</span>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* ─── Admin Stats (if admin) ─── */}
            {stats && user?.role === 'admin' && (
                <motion.div variants={fadeUp} className="premium-card" style={{ marginBottom: '2rem', padding: '1.25rem 1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                        <span className="material-icons" style={{ color: '#A78BFA', fontSize: '1.1rem' }}>admin_panel_settings</span>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-text-primary)' }}>Admin Overview</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
                        {[
                            { label: 'Hackathons', total: stats?.hackathons?.total, approved: stats?.hackathons?.approved, pending: stats?.hackathons?.pending },
                            { label: 'Internships', total: stats?.internships?.total, approved: stats?.internships?.approved, pending: stats?.internships?.pending },
                            { label: 'Users', total: stats?.users?.total, approved: stats?.users?.admins, pending: stats?.users?.applicants, labels: ['Total', 'Admins', 'Users'] },
                        ].map((section) => (
                            <div key={section.label}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                                    {section.label}
                                </div>
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <div>
                                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>{section.total || 0}</div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)' }}>{section.labels?.[0] || 'Total'}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#34d399' }}>{section.approved || 0}</div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)' }}>{section.labels?.[1] || 'Approved'}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fbbf24' }}>{section.pending || 0}</div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)' }}>{section.labels?.[2] || 'Pending'}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* ─── Main Grid: Content + Live Feed ─── */}
            <motion.div variants={fadeUp} style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.5rem' }}>
                <div>
                    {/* Recent Hackathons */}
                    <div style={{ marginBottom: '2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span className="material-icons" style={{ color: '#22d3ee', fontSize: '1.1rem' }}>code</span>
                                <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Recent Hackathons</h2>
                                <span style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#A78BFA', fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '9999px' }}>
                                    {recentHackathons.length}
                                </span>
                            </div>
                            <button
                                onClick={() => navigate('/opportunities')}
                                style={{ background: 'none', border: 'none', color: 'var(--color-text-tertiary)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                            >
                                View all <span className="material-icons" style={{ fontSize: '0.9rem' }}>arrow_forward</span>
                            </button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                            {recentHackathons.length > 0 ? (
                                recentHackathons.slice(0, 4).map((hackathon, index) => {
                                    const dlInfo = getDeadlineInfo(hackathon.deadline);
                                    return (
                                        <motion.div
                                            key={hackathon.id}
                                            className="card"
                                            onClick={() => handleCardClick('hackathon', hackathon.id)}
                                            style={{ cursor: 'pointer', padding: '1rem 1.25rem' }}
                                            whileHover={{ y: -3, transition: { duration: 0.2 } }}
                                            initial={{ opacity: 0, y: 16 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.06 }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                                <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, lineHeight: 1.3, flex: 1, paddingRight: '0.5rem' }}>{hackathon.title}</h3>
                                                {hackathon.source && (
                                                    <span style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', padding: '0.15rem 0.4rem', borderRadius: '4px', background: 'rgba(139, 92, 246, 0.12)', color: '#A78BFA', whiteSpace: 'nowrap' }}>
                                                        {hackathon.source}
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-tertiary)', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                                {hackathon.organizer && (
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                        <span className="material-icons" style={{ fontSize: '0.85rem' }}>business</span>
                                                        {hackathon.organizer}
                                                    </span>
                                                )}
                                                {hackathon.location && (
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                        <span className="material-icons" style={{ fontSize: '0.85rem' }}>location_on</span>
                                                        {hackathon.location}
                                                    </span>
                                                )}
                                            </div>
                                            {dlInfo && (
                                                <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.72rem', fontWeight: 600, color: dlInfo.color }}>
                                                    <span className="material-icons" style={{ fontSize: '0.85rem' }}>schedule</span>
                                                    {dlInfo.text}
                                                </div>
                                            )}
                                        </motion.div>
                                    );
                                })
                            ) : (
                                <p style={{ color: 'var(--color-text-tertiary)', gridColumn: '1 / -1' }}>No hackathons available yet.</p>
                            )}
                        </div>
                    </div>

                    {/* Recent Internships */}
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span className="material-icons" style={{ color: '#34d399', fontSize: '1.1rem' }}>work</span>
                                <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Recent Internships</h2>
                                <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#34d399', fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '9999px' }}>
                                    {recentInternships.length}
                                </span>
                            </div>
                            <button
                                onClick={() => navigate('/opportunities')}
                                style={{ background: 'none', border: 'none', color: 'var(--color-text-tertiary)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                            >
                                View all <span className="material-icons" style={{ fontSize: '0.9rem' }}>arrow_forward</span>
                            </button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                            {recentInternships.length > 0 ? (
                                recentInternships.slice(0, 4).map((internship, index) => {
                                    const dlInfo = getDeadlineInfo(internship.application_deadline || internship.deadline);
                                    return (
                                        <motion.div
                                            key={internship.id}
                                            className="card"
                                            onClick={() => handleCardClick('internship', internship.id)}
                                            style={{ cursor: 'pointer', padding: '1rem 1.25rem' }}
                                            whileHover={{ y: -3, transition: { duration: 0.2 } }}
                                            initial={{ opacity: 0, y: 16 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.06 }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                                <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, lineHeight: 1.3, flex: 1, paddingRight: '0.5rem' }}>{internship.title}</h3>
                                                {internship.source && (
                                                    <span style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', padding: '0.15rem 0.4rem', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.1)', color: '#34d399', whiteSpace: 'nowrap' }}>
                                                        {internship.source}
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-tertiary)', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                                {internship.company && (
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                        <span className="material-icons" style={{ fontSize: '0.85rem' }}>apartment</span>
                                                        {internship.company}
                                                    </span>
                                                )}
                                                {internship.location && (
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                        <span className="material-icons" style={{ fontSize: '0.85rem' }}>location_on</span>
                                                        {internship.location}
                                                    </span>
                                                )}
                                                {internship.duration && (
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                        <span className="material-icons" style={{ fontSize: '0.85rem' }}>timelapse</span>
                                                        {internship.duration}
                                                    </span>
                                                )}
                                            </div>
                                            {dlInfo && (
                                                <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.72rem', fontWeight: 600, color: dlInfo.color }}>
                                                    <span className="material-icons" style={{ fontSize: '0.85rem' }}>schedule</span>
                                                    {dlInfo.text}
                                                </div>
                                            )}
                                        </motion.div>
                                    );
                                })
                            ) : (
                                <p style={{ color: 'var(--color-text-tertiary)', gridColumn: '1 / -1' }}>No internships available yet.</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* ─── Sidebar: Live Feed ─── */}
                <div>
                    <LiveFeed />
                </div>
            </motion.div>
        </motion.div>
    );
}

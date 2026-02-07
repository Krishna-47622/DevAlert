import { useState, useEffect } from 'react';
import { applicationsAPI } from '../services/api';
import Card, { CardHeader, CardBody } from '../components/Card';
import { motion, AnimatePresence } from 'framer-motion';

export default function ApplicantsPage() {
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // all, pending, accepted, rejected
    const [popup, setPopup] = useState({ show: false, message: '', type: 'success' });

    const user = JSON.parse(localStorage.getItem('user') || 'null');

    useEffect(() => {
        fetchApplications();
    }, []);

    const fetchApplications = async () => {
        try {
            setLoading(true);
            const response = await applicationsAPI.getHosted();
            setApplications(response.data);
        } catch (error) {
            console.error('Error fetching applications:', error);
            showPopup('Failed to fetch applications', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (id, newStatus) => {
        try {
            await applicationsAPI.updateStatus(id, newStatus);
            setApplications(prev =>
                prev.map(app => app.id === id ? { ...app, status: newStatus } : app)
            );
            showPopup(`Application ${newStatus} successfully!`, 'success');
        } catch (error) {
            console.error('Error updating status:', error);
            showPopup('Failed to update status', 'error');
        }
    };

    const showPopup = (message, type) => {
        setPopup({ show: true, message, type });
        setTimeout(() => setPopup({ show: false, message: '', type: 'success' }), 3000);
    };

    const filteredApplications = applications.filter(app =>
        filter === 'all' ? true : app.status === filter
    );

    if (loading) {
        return (
            <div className="container" style={{ paddingTop: '5rem', textAlign: 'center' }}>
                <div className="loading" style={{ margin: '0 auto' }}></div>
                <p className="mt-3 text-muted">Loading applicants...</p>
            </div>
        );
    }

    return (
        <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-between items-center mb-4"
            >
                <div>
                    <h1 className="gradient-text">Applicant Management</h1>
                    <p className="text-muted">Manage candidates for your hosted opportunities</p>
                </div>

                <div className="flex gap-2">
                    {['all', 'pending', 'accepted', 'rejected'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`btn ${filter === f ? 'btn-primary' : 'btn-outline'}`}
                            style={{ textTransform: 'capitalize' }}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </motion.div>

            <AnimatePresence>
                {popup.show && (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className={`badge badge-${popup.type}`}
                        style={{
                            position: 'fixed',
                            top: '5rem',
                            right: '2rem',
                            zIndex: 1000,
                            padding: '1rem',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                        }}
                    >
                        {popup.message}
                    </motion.div>
                )}
            </AnimatePresence>

            {filteredApplications.length === 0 ? (
                <Card style={{ textAlign: 'center', padding: '4rem' }}>
                    <CardBody>
                        <h3 className="text-muted">No applicants found</h3>
                        <p>When users apply to your posts, they will appear here.</p>
                    </CardBody>
                </Card>
            ) : (
                <div className="grid grid-1 gap-4">
                    {filteredApplications.map((app) => (
                        <motion.div
                            key={app.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            layout
                        >
                            <Card className="applicant-card">
                                <CardBody>
                                    <div className="flex justify-between items-start">
                                        <div style={{ flex: 1 }}>
                                            <div className="flex items-center gap-2 mb-2">
                                                <h3 className="m-0">{app.name}</h3>
                                                <span className={`badge badge-${app.status === 'accepted' ? 'success' :
                                                    app.status === 'rejected' ? 'danger' :
                                                        'warning'
                                                    }`}>
                                                    {app.status}
                                                </span>
                                            </div>
                                            <p className="mb-1"><strong>Applied for:</strong> <span className="text-primary">{app.event_title}</span></p>
                                            <p className="mb-1"><strong>Email:</strong> {app.email}</p>
                                            {app.resume_link && (
                                                <p className="mb-2">
                                                    <strong>Resume:</strong> <a href={app.resume_link} target="_blank" rel="noopener noreferrer" className="text-link">View Document</a>
                                                </p>
                                            )}
                                            {app.cover_letter && (
                                                <div className="p-3 bg-darker rounded mb-3" style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                                                    <strong>Message:</strong><br />
                                                    {app.cover_letter}
                                                </div>
                                            )}
                                            <p className="text-muted mb-0" style={{ fontSize: '0.8rem' }}>
                                                Applied on: {new Date(app.created_at).toLocaleDateString()} at {new Date(app.created_at).toLocaleTimeString()}
                                            </p>
                                        </div>

                                        <div className="flex flex-column gap-2 items-end" style={{ minWidth: 'auto' }}>
                                            <a
                                                href={`mailto:${app.email}?subject=DevAlert: Regarding your application for ${app.event_title}`}
                                                className="btn btn-primary flex items-center justify-center gap-2"
                                                style={{ textDecoration: 'none', padding: '0 1rem', height: '40px', fontSize: '0.9rem' }}
                                            >
                                                <span className="material-icons" style={{ fontSize: '1.1rem' }}>email</span>
                                                Contact
                                            </a>

                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleStatusUpdate(app.id, 'accepted')}
                                                    className="btn btn-outline-success flex items-center justify-center"
                                                    style={{ width: '40px', height: '40px', padding: 0 }}
                                                    title="Accept Application"
                                                >
                                                    <span className="material-icons">check_circle</span>
                                                </button>
                                                <button
                                                    onClick={() => handleStatusUpdate(app.id, 'rejected')}
                                                    className="btn btn-outline-danger flex items-center justify-center"
                                                    style={{ width: '40px', height: '40px', padding: 0 }}
                                                    title="Reject Application"
                                                >
                                                    <span className="material-icons">cancel</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </CardBody>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            )}

            <style jsx="true">{`
                .applicant-card {
                    transition: transform 0.2s ease;
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }
                .applicant-card:hover {
                    border-color: var(--primary-color);
                }
                .bg-darker {
                    background: rgba(0, 0, 0, 0.2);
                }
                .text-link {
                    color: var(--primary-light);
                    text-decoration: underline;
                }
                .text-link:hover {
                    color: var(--primary-color);
                }
                .w-full {
                    width: 100%;
                }
            `}</style>
        </div>
    );
}

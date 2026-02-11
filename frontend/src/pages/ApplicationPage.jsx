import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { hackathonsAPI, internshipsAPI, applicationsAPI } from '../services/api';

export default function ApplicationPage() {
    const { type, id } = useParams();
    const navigate = useNavigate();
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        resume_link: '',
        cover_letter: ''
    });

    useEffect(() => {
        fetchEvent();
        try {
            const userObj = JSON.parse(localStorage.getItem('user') || 'null');
            if (userObj) {
                setFormData(prev => ({
                    ...prev,
                    name: userObj.full_name || '',
                    email: userObj.email || ''
                }));
            }
        } catch (e) {
            console.error("ApplicationPage user parse error", e);
        }
    }, [type, id]);

    const fetchEvent = async () => {
        try {
            let response;
            if (type === 'hackathon') {
                response = await hackathonsAPI.getById(id);
            } else {
                response = await internshipsAPI.getById(id);
            }
            setEvent(response.data);
        } catch (err) {
            setError('Failed to load event details');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');

        try {
            await applicationsAPI.submit({
                event_type: type,
                event_id: parseInt(id),
                ...formData
            });
            setSuccess(true);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to submit application');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="container" style={{ paddingTop: '2rem', textAlign: 'center' }}>
                <div className="loading" style={{ width: '40px', height: '40px' }}></div>
            </div>
        );
    }

    if (!event) {
        return (
            <div className="container" style={{ paddingTop: '2rem' }}>
                <h2>Event not found</h2>
                <button onClick={() => navigate('/')} className="btn btn-primary">Go Back</button>
            </div>
        );
    }

    // If external event, show link to external platform
    if (event.source && !['devalert', 'manual'].includes(event.source)) {
        const linkUrl = type === 'hackathon' ? event.registration_link : event.application_link;
        return (
            <div className="container" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
                <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                    <div className="card">
                        <h1>{event.title}</h1>
                        <p style={{ fontSize: '1.125rem', marginBottom: '2rem' }}>
                            This {type} is hosted externally on <strong>{event.source ? event.source.charAt(0).toUpperCase() + event.source.slice(1) : ''}</strong>
                        </p>

                        <div style={{ marginBottom: '2rem' }}>
                            <h3>Details</h3>
                            <p>{event.description}</p>
                            <p><strong>Location:</strong> {event.location}</p>
                            <p><strong>Mode:</strong> {event.mode}</p>
                            <p><strong>Deadline:</strong> {new Date(event.deadline).toLocaleDateString()}</p>
                            {type === 'hackathon' && event.prize_pool && (
                                <p><strong>Prize Pool:</strong> {event.prize_pool}</p>
                            )}
                            {type === 'internship' && event.stipend && (
                                <p><strong>Stipend:</strong> {event.stipend}</p>
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <a
                                href={linkUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-primary"
                                style={{ flex: 1 }}
                            >
                                Apply on {event.source ? event.source.charAt(0).toUpperCase() + event.source.slice(1) : 'External Site'}
                            </a>
                            <button onClick={() => navigate('/')} className="btn btn-secondary">
                                Back to Home
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // DevAlert-hosted event - show application form
    if (success) {
        return (
            <div className="container" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
                <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
                    <div className="card">
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
                        <h2>Application Submitted!</h2>
                        <p>Your application for <strong>{event.title}</strong> has been submitted successfully.</p>
                        <p>You will be contacted at <strong>{formData.email}</strong> if shortlisted.</p>
                        <button onClick={() => navigate('/')} className="btn btn-primary" style={{ marginTop: '1rem' }}>
                            Back to Home
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                <h1>Apply for {event.title}</h1>
                <p style={{ marginBottom: '2rem', color: 'var(--color-text-secondary)' }}>
                    {type === 'hackathon' ? 'Hackathon' : 'Internship'} • {event.location} • {event.mode}
                </p>

                {/* Event Details */}
                <div className="card" style={{ marginBottom: '2rem' }}>
                    <h3>About</h3>
                    <p>{event.description}</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                        <div>
                            <strong>Deadline:</strong><br />
                            {new Date(event.deadline).toLocaleDateString()}
                        </div>
                        {type === 'hackathon' ? (
                            <>
                                <div>
                                    <strong>Organizer:</strong><br />
                                    {event.organizer ? event.organizer.charAt(0).toUpperCase() + event.organizer.slice(1) : 'Not Specified'}
                                </div>
                                {event.prize_pool && (
                                    <div>
                                        <strong>Prize Pool:</strong><br />
                                        {event.prize_pool}
                                    </div>
                                )}
                            </>
                        ) : (
                            <>
                                <div>
                                    <strong>Company:</strong><br />
                                    {event.company}
                                </div>
                                {event.stipend && (
                                    <div>
                                        <strong>Stipend:</strong><br />
                                        {event.stipend}
                                    </div>
                                )}
                                {event.duration && (
                                    <div>
                                        <strong>Duration:</strong><br />
                                        {event.duration}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Application Form */}
                <form onSubmit={handleSubmit} className="card">
                    <h3 style={{ marginBottom: '1.5rem' }}>Application Form</h3>

                    {error && (
                        <div style={{
                            padding: '1rem',
                            backgroundColor: '#fee2e2',
                            color: '#991b1b',
                            borderRadius: '8px',
                            marginBottom: '1rem'
                        }}>
                            {error}
                        </div>
                    )}

                    <div className="form-group">
                        <label className="form-label">Full Name *</label>
                        <input
                            type="text"
                            name="name"
                            className="form-input"
                            value={formData.name}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Email *</label>
                        <input
                            type="email"
                            name="email"
                            className="form-input"
                            value={formData.email}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Resume Link</label>
                        <input
                            type="url"
                            name="resume_link"
                            className="form-input"
                            placeholder="https://drive.google.com/..."
                            value={formData.resume_link}
                            onChange={handleChange}
                        />
                        <small style={{ color: 'var(--color-text-tertiary)', fontSize: '0.75rem' }}>
                            Link to your resume (Google Drive, Dropbox, etc.)
                        </small>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Cover Letter</label>
                        <textarea
                            name="cover_letter"
                            className="form-textarea"
                            placeholder="Why are you interested in this opportunity?"
                            value={formData.cover_letter}
                            onChange={handleChange}
                            rows="6"
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={submitting}
                            style={{ flex: 1 }}
                        >
                            {submitting ? <span className="loading"></span> : 'Submit Application'}
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate('/')}
                            className="btn btn-secondary"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

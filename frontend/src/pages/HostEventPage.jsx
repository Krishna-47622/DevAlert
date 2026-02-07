import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { hackathonsAPI, internshipsAPI } from '../services/api';

export default function HostEventPage() {
    const navigate = useNavigate();
    const [eventType, setEventType] = useState('hackathon');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        organizer: '',
        company: '',
        location: '',
        mode: 'hybrid',
        deadline: '',
        start_date: '',
        end_date: '',
        prize_pool: '',
        stipend: '',
        duration: '',
        skills_required: ''
    });

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const eventData = {
                title: formData.title,
                description: formData.description,
                location: formData.location,
                mode: formData.mode,
                deadline: formData.deadline,
                start_date: formData.start_date || null,
                source: 'devalert',
                status: 'approved'
            };

            if (eventType === 'hackathon') {
                eventData.organizer = formData.organizer;
                eventData.prize_pool = formData.prize_pool;
                eventData.end_date = formData.end_date || null;
                const res = await hackathonsAPI.create(eventData);
                alert(res.data.message);
            } else {
                eventData.company = formData.company;
                eventData.stipend = formData.stipend;
                eventData.duration = formData.duration;
                eventData.skills_required = formData.skills_required;
                const res = await internshipsAPI.create(eventData);
                alert(res.data.message);
            }
            navigate('/');
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || err.response?.data?.msg || 'Failed to create event');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                <h1>Host an Event</h1>
                <p style={{ marginBottom: '2rem' }}>Create a hackathon or internship opportunity on DevAlert</p>

                {/* Event Type Toggle */}
                <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem' }}>
                    <button
                        onClick={() => setEventType('hackathon')}
                        className={`btn ${eventType === 'hackathon' ? 'btn-primary' : 'btn-secondary'}`}
                    >
                        Hackathon
                    </button>
                    <button
                        onClick={() => setEventType('internship')}
                        className={`btn ${eventType === 'internship' ? 'btn-primary' : 'btn-secondary'}`}
                    >
                        Internship
                    </button>
                </div>

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

                <form onSubmit={handleSubmit} className="card">
                    {/* Common Fields */}
                    <div className="form-group">
                        <label className="form-label">Title *</label>
                        <input
                            type="text"
                            name="title"
                            className="form-input"
                            value={formData.title}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Description *</label>
                        <textarea
                            name="description"
                            className="form-textarea"
                            value={formData.description}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    {eventType === 'hackathon' ? (
                        <div className="form-group">
                            <label className="form-label">Organizer *</label>
                            <input
                                type="text"
                                name="organizer"
                                className="form-input"
                                value={formData.organizer}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    ) : (
                        <div className="form-group">
                            <label className="form-label">Company *</label>
                            <input
                                type="text"
                                name="company"
                                className="form-input"
                                value={formData.company}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    )}

                    <div className="form-group">
                        <label className="form-label">Location *</label>
                        <input
                            type="text"
                            name="location"
                            className="form-input"
                            placeholder="e.g., Hyderabad, India"
                            value={formData.location}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Mode *</label>
                        <select
                            name="mode"
                            className="form-select"
                            value={formData.mode}
                            onChange={handleChange}
                        >
                            <option value="online">Online</option>
                            <option value="offline">In-Person</option>
                            <option value="hybrid">Hybrid</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Application Deadline *</label>
                        <input
                            type="date"
                            name="deadline"
                            className="form-input"
                            value={formData.deadline}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Start Date</label>
                        <input
                            type="date"
                            name="start_date"
                            className="form-input"
                            value={formData.start_date}
                            onChange={handleChange}
                        />
                    </div>

                    {eventType === 'hackathon' ? (
                        <>
                            <div className="form-group">
                                <label className="form-label">End Date</label>
                                <input
                                    type="date"
                                    name="end_date"
                                    className="form-input"
                                    value={formData.end_date}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Prize Pool</label>
                                <input
                                    type="text"
                                    name="prize_pool"
                                    className="form-input"
                                    placeholder="e.g., ₹5,00,000"
                                    value={formData.prize_pool}
                                    onChange={handleChange}
                                />
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="form-group">
                                <label className="form-label">Duration</label>
                                <input
                                    type="text"
                                    name="duration"
                                    className="form-input"
                                    placeholder="e.g., 6 months"
                                    value={formData.duration}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Stipend</label>
                                <input
                                    type="text"
                                    name="stipend"
                                    className="form-input"
                                    placeholder="e.g., ₹25,000/month"
                                    value={formData.stipend}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Skills Required</label>
                                <input
                                    type="text"
                                    name="skills_required"
                                    className="form-input"
                                    placeholder="e.g., React, Node.js, MongoDB"
                                    value={formData.skills_required}
                                    onChange={handleChange}
                                />
                            </div>
                        </>
                    )}

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading}
                            style={{ flex: 1 }}
                        >
                            {loading ? <span className="loading"></span> : `Create ${eventType === 'hackathon' ? 'Hackathon' : 'Internship'}`}
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

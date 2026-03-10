import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { hackathonsAPI, internshipsAPI, trackerAPI, authAPI } from '../services/api';
import Card, { CardHeader, CardBody, CardFooter } from '../components/Card';
import Modal from '../components/Modal';
import Popup from '../components/Popup';

export default function ApplicantPage() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [opportunities, setOpportunities] = useState({ hackathons: [], internships: [] });
    const [loading, setLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [filter, setFilter] = useState({ type: 'all', location: '' });
    const [highlightedId, setHighlightedId] = useState(null);
    const [highlightedType, setHighlightedType] = useState(null);
    const [popup, setPopup] = useState({ isOpen: false, title: '', message: '', type: 'info' });
    const [user, setUser] = useState(null);
    const highlightedCardRef = useRef(null);

    // Filter Logic
    const [domainFilter, setDomainFilter] = useState('all');

    // Collapsible Logic
    const [expanded, setExpanded] = useState({ hackathons: true, internships: true });

    useEffect(() => {
        fetchOpportunities();
        fetchUser();
    }, []);

    useEffect(() => {
        // Get URL parameters
        const type = searchParams.get('type');
        const id = searchParams.get('id');

        if (type && id) {
            setHighlightedType(type);
            setHighlightedId(parseInt(id));

            // Update filter to show the correct type
            if (type === 'hackathon') {
                setFilter(prev => ({ ...prev, type: 'hackathons' }));
            } else if (type === 'internship') {
                setFilter(prev => ({ ...prev, type: 'internships' }));
            }
        }
    }, [searchParams]);

    useEffect(() => {
        // Scroll to highlighted card when data is loaded and card is rendered
        if (highlightedCardRef.current && !loading) {
            setTimeout(() => {
                highlightedCardRef.current?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
            }, 100);
        }
    }, [opportunities, loading, highlightedId]);

    const fetchUser = async () => {
        try {
            const response = await authAPI.getCurrentUser();
            setUser(response.data);
        } catch (error) {
            console.error('Error fetching user:', error);
        }
    };

    const fetchOpportunities = async () => {
        try {
            const hackathonsResponse = await hackathonsAPI.getAll({ status: 'approved', sort_by: 'deadline', order: 'desc' });
            const internshipsResponse = await internshipsAPI.getAll({ status: 'approved', sort_by: 'deadline', order: 'desc' });

            setOpportunities({
                hackathons: hackathonsResponse.data,
                internships: internshipsResponse.data
            });
        } catch (error) {
            console.error('Error fetching opportunities:', error);
        } finally {
            setLoading(false);
        }
    };

    const openModal = (item, type) => {
        setSelectedItem({ ...item, type });
        setModalOpen(true);
    };

    const handleApply = (item) => {
        navigate(`/apply/${item.type}/${item.id}`);
    };

    const handleTrack = async (item, type) => {
        try {
            const response = await trackerAPI.add({
                event_type: type,
                event_id: item.id
            });
            setPopup({
                isOpen: true,
                title: 'Opportunity Tracked!',
                message: response.data.message || 'Added to your career cockpit.',
                type: 'success'
            });
        } catch (err) {
            console.error('Error adding to tracker:', err);
            setPopup({
                isOpen: true,
                title: 'Tracking Failed',
                message: 'Failed to add to tracker. Please ensure you are logged in.',
                type: 'error'
            });
        }
    };

    const filterOpportunities = () => {
        let filtered = { hackathons: [...opportunities.hackathons], internships: [...opportunities.internships] };

        // Location Filter
        if (filter.location) {
            filtered.hackathons = filtered.hackathons.filter(h =>
                h.location.toLowerCase().includes(filter.location.toLowerCase())
            );
            filtered.internships = filtered.internships.filter(i =>
                i.location.toLowerCase().includes(filter.location.toLowerCase())
            );
        }

        // Domain Filter
        if (domainFilter !== 'all') {
            const keywords = {
                'ai': ['ai', 'ml', 'machine learning', 'artificial intelligence', 'data science', 'nlp', 'computer vision'],
                'cyber': ['ethical', 'security', 'hacking', 'cyber', 'ctf'],
                'hardware': ['electrical', 'workshop', 'iot', 'hardware', 'robotics', 'embedded']
            };

            const targetKeywords = keywords[domainFilter] || [];

            const hasKeyword = (item) => {
                const text = `${item.title} ${item.description} ${item.skills_required || ''}`.toLowerCase();
                return targetKeywords.some(k => text.includes(k));
            };

            filtered.hackathons = filtered.hackathons.filter(hasKeyword);
            filtered.internships = filtered.internships.filter(hasKeyword);
        }

        return filtered;
    };

    const filtered = filterOpportunities();

    if (loading) {
        return (
            <div className="container" style={{ paddingTop: '2rem', textAlign: 'center' }}>
                <div className="loading" style={{ width: '40px', height: '40px' }}></div>
            </div>
        );
    }

    return (
        <div className="container" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
            <h1 className="mb-4">Browse Opportunities</h1>

            <div className="card mb-4">
                <CardBody>
                    <div className="flex gap-3" style={{ flexWrap: 'wrap' }}>
                        <div className="form-group" style={{ flex: 1, minWidth: '200px', marginBottom: 0 }}>
                            <label className="form-label">Filter by Type</label>
                            <select
                                className="form-select"
                                value={filter.type}
                                onChange={(e) => setFilter({ ...filter, type: e.target.value })}
                            >
                                <option value="all">All</option>
                                <option value="hackathons">Hackathons</option>
                                <option value="internships">Internships</option>
                            </select>
                        </div>
                        <div className="form-group" style={{ flex: 1, minWidth: '200px', marginBottom: 0 }}>
                            <label className="form-label">Filter by Domain</label>
                            <select
                                className="form-select"
                                value={domainFilter}
                                onChange={(e) => setDomainFilter(e.target.value)}
                            >
                                <option value="all">All Domains</option>
                                <option value="ai">AI / ML / Data Science</option>
                                <option value="cyber">Cyber Security</option>
                                <option value="hardware">Hardware / Robotics / IoT</option>
                            </select>
                        </div>
                        <div className="form-group" style={{ flex: 2, minWidth: '300px', marginBottom: 0 }}>
                            <label className="form-label">Filter by Location</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="e.g., Mumbai, Bangalore, Remote"
                                value={filter.location}
                                onChange={(e) => setFilter({ ...filter, location: e.target.value })}
                            />
                        </div>
                    </div>
                </CardBody>
            </div>

            {(filter.type === 'all' || filter.type === 'hackathons') && (
                <div style={{ marginBottom: '2rem' }}>
                    <div
                        onClick={() => setExpanded(prev => ({ ...prev, hackathons: !prev.hackathons }))}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            cursor: 'pointer',
                            marginBottom: '1rem',
                            userSelect: 'none'
                        }}
                    >
                        <h2 className="mb-0" style={{ flex: 1 }}>Hackathons ({filtered.hackathons.length})</h2>
                        <span className="material-icons" style={{
                            transform: expanded.hackathons ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 0.3s ease'
                        }}>
                            expand_more
                        </span>
                    </div>

                    {expanded.hackathons && (
                        <div className="grid grid-3">
                            {filtered.hackathons.length > 0 ? (
                                filtered.hackathons.map((hackathon) => {
                                    const isHighlighted = highlightedType === 'hackathon' && highlightedId === hackathon.id;
                                    return (
                                        <Card
                                            key={hackathon.id}
                                            ref={isHighlighted ? highlightedCardRef : null}
                                            style={isHighlighted ? {
                                                borderColor: 'var(--primary)',
                                                transform: 'translateY(-4px)'
                                            } : {}}
                                        >
                                            <CardHeader subtitle={hackathon.organizer}>{hackathon.title}</CardHeader>
                                            <CardBody>
                                                <p><span className="material-icons" style={{ fontSize: '1rem', verticalAlign: 'middle', marginRight: '4px' }}>location_on</span> {hackathon.location} · <strong>{hackathon.mode}</strong></p>
                                                <p><span className="material-icons" style={{ fontSize: '1rem', verticalAlign: 'middle', marginRight: '4px' }}>timer</span> Closes {new Date(hackathon.deadline).toLocaleDateString()}</p>
                                                {hackathon.prize_pool && <p><span className="material-icons" style={{ fontSize: '1rem', verticalAlign: 'middle', marginRight: '4px' }}>emoji_events</span> Prize: {hackathon.prize_pool}</p>}
                                            </CardBody>

                                            {user && user.resume_text ? (
                                                <div className="premium-card-ai-match" style={{ cursor: 'pointer' }} onClick={() => handleTrack(hackathon, 'hackathon')}>
                                                    <p className="premium-card-ai-match-label">AI Match</p>
                                                    <p className="premium-card-ai-match-text">Click Track to see AI Match score</p>
                                                </div>
                                            ) : (
                                                <div className="premium-card-ai-match" style={{ cursor: 'pointer' }} onClick={() => navigate('/settings')}>
                                                    <p className="premium-card-ai-match-label">AI Match</p>
                                                    <p className="premium-card-ai-match-text">Add Resume for AI Match</p>
                                                </div>
                                            )}

                                            <CardFooter>
                                                <div className="premium-card-actions-row">
                                                    <button
                                                        onClick={() => openModal(hackathon, 'hackathon')}
                                                        className="premium-btn-secondary"
                                                    >
                                                        Details
                                                    </button>
                                                    <button
                                                        onClick={() => handleTrack(hackathon, 'hackathon')}
                                                        className="premium-btn-secondary"
                                                    >
                                                        Track
                                                    </button>
                                                </div>
                                                <button
                                                    onClick={() => handleApply({ ...hackathon, type: 'hackathon' })}
                                                    className="premium-btn-primary"
                                                >
                                                    Apply Now
                                                </button>
                                            </CardFooter>
                                        </Card>
                                    );
                                })
                            ) : (
                                <p>No hackathons found</p>
                            )}
                        </div>
                    )}
                </div>
            )}

            {(filter.type === 'all' || filter.type === 'internships') && (
                <div>
                    <div
                        onClick={() => setExpanded(prev => ({ ...prev, internships: !prev.internships }))}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            cursor: 'pointer',
                            marginBottom: '1rem',
                            userSelect: 'none'
                        }}
                    >
                        <h2 className="mb-0" style={{ flex: 1 }}>Internships ({filtered.internships.length})</h2>
                        <span className="material-icons" style={{
                            transform: expanded.internships ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 0.3s ease'
                        }}>
                            expand_more
                        </span>
                    </div>

                    {expanded.internships && (
                        <div className="grid grid-3">
                            {filtered.internships.length > 0 ? (
                                filtered.internships.map((internship) => {
                                    const isHighlighted = highlightedType === 'internship' && highlightedId === internship.id;
                                    return (
                                        <Card
                                            key={internship.id}
                                            ref={isHighlighted ? highlightedCardRef : null}
                                            style={isHighlighted ? {
                                                borderColor: 'var(--primary)',
                                                transform: 'translateY(-4px)'
                                            } : {}}
                                        >
                                            <CardHeader subtitle={internship.company}>{internship.title}</CardHeader>
                                            <CardBody>
                                                <p><span className="material-icons" style={{ fontSize: '1rem', verticalAlign: 'middle', marginRight: '4px' }}>location_on</span> {internship.location} · <strong>{internship.mode}</strong></p>
                                                <p><span className="material-icons" style={{ fontSize: '1rem', verticalAlign: 'middle', marginRight: '4px' }}>timer</span> Closes {new Date(internship.deadline).toLocaleDateString()}</p>
                                                {internship.duration && <p><span className="material-icons" style={{ fontSize: '1rem', verticalAlign: 'middle', marginRight: '4px' }}>schedule</span> Duration: {internship.duration}</p>}
                                                {internship.stipend && <p><span className="material-icons" style={{ fontSize: '1rem', verticalAlign: 'middle', marginRight: '4px' }}>payments</span> Stipend: {internship.stipend}</p>}
                                            </CardBody>

                                            {user && user.resume_text ? (
                                                <div className="premium-card-ai-match" style={{ cursor: 'pointer' }} onClick={() => handleTrack(internship, 'internship')}>
                                                    <p className="premium-card-ai-match-label">AI Match</p>
                                                    <p className="premium-card-ai-match-text">Click Track to see AI Match score</p>
                                                </div>
                                            ) : (
                                                <div className="premium-card-ai-match" style={{ cursor: 'pointer' }} onClick={() => navigate('/settings')}>
                                                    <p className="premium-card-ai-match-label">AI Match</p>
                                                    <p className="premium-card-ai-match-text">Add Resume for AI Match</p>
                                                </div>
                                            )}

                                            <CardFooter>
                                                <div className="premium-card-actions-row">
                                                    <button
                                                        onClick={() => openModal(internship, 'internship')}
                                                        className="premium-btn-secondary"
                                                    >
                                                        Details
                                                    </button>
                                                    <button
                                                        onClick={() => handleTrack(internship, 'internship')}
                                                        className="premium-btn-secondary"
                                                    >
                                                        Track
                                                    </button>
                                                </div>
                                                <button
                                                    onClick={() => handleApply({ ...internship, type: 'internship' })}
                                                    className="premium-btn-primary"
                                                >
                                                    Apply Now
                                                </button>
                                            </CardFooter>
                                        </Card>
                                    );
                                })
                            ) : (
                                <p>No internships found</p>
                            )}
                        </div>
                    )}
                </div>
            )}

            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={selectedItem?.type === 'hackathon' ? 'Hackathon Details' : 'Internship Details'}
            >
                {selectedItem && (
                    <div>
                        <h3>{selectedItem.title}</h3>
                        {selectedItem.type === 'hackathon' ? (
                            <>
                                <p><strong>Organizer:</strong> {selectedItem.organizer}</p>
                                <p><strong>Location:</strong> {selectedItem.location}</p>
                                <p><strong>Mode:</strong> {selectedItem.mode}</p>
                                <p><strong>Deadline:</strong> {new Date(selectedItem.deadline).toLocaleDateString()}</p>
                                {selectedItem.start_date && <p><strong>Start Date:</strong> {new Date(selectedItem.start_date).toLocaleDateString()}</p>}
                                {selectedItem.end_date && <p><strong>End Date:</strong> {new Date(selectedItem.end_date).toLocaleDateString()}</p>}
                                {selectedItem.prize_pool && <p><strong>Prize Pool:</strong> {selectedItem.prize_pool}</p>}
                                <p><strong>Description:</strong></p>
                                <p>{selectedItem.description}</p>
                            </>
                        ) : (
                            <>
                                <p><strong>Company:</strong> {selectedItem.company}</p>
                                <p><strong>Location:</strong> {selectedItem.location}</p>
                                <p><strong>Mode:</strong> {selectedItem.mode}</p>
                                <p><strong>Duration:</strong> {selectedItem.duration}</p>
                                {selectedItem.stipend && <p><strong>Stipend:</strong> {selectedItem.stipend}</p>}
                                <p><strong>Deadline:</strong> {new Date(selectedItem.deadline).toLocaleDateString()}</p>
                                {selectedItem.start_date && <p><strong>Start Date:</strong> {new Date(selectedItem.start_date).toLocaleDateString()}</p>}
                                {selectedItem.skills_required && <p><strong>Skills Required:</strong> {selectedItem.skills_required}</p>}
                                <p><strong>Description:</strong></p>
                                <p>{selectedItem.description}</p>
                            </>
                        )}
                        <div className="mt-3">
                            <button
                                onClick={() => handleApply(selectedItem)}
                                className="btn btn-primary"
                                style={{ width: '100%' }}
                            >
                                Apply Now
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            <Popup
                isOpen={popup.isOpen}
                onClose={() => setPopup({ ...popup, isOpen: false })}
                title={popup.title}
                message={popup.message}
                type={popup.type}
            />
        </div>
    );
}

import { useState, useEffect } from 'react';
import { trackerAPI } from '../services/api';
import Card, { CardHeader, CardBody, CardFooter } from '../components/Card';
import Popup from '../components/Popup';
import './Tracker.css';

const COLUMNS = [
    { id: 'Saved', title: 'Saved' },
    { id: 'To Apply', title: 'To Apply' },
    { id: 'Applied', title: 'Applied' },
    { id: 'Interviewing', title: 'Interviewing' },
    { id: 'Finished', title: 'Finished' } // Offered or Rejected
];

export default function Tracker() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [expandedSections, setExpandedSections] = useState({
        'Saved': true,
        'To Apply': true,
        'Applied': true,
        'Interviewing': true,
        'Finished': true
    });
    const [popup, setPopup] = useState({ isOpen: false, title: '', message: '', type: 'info' });
    const [matchingItems, setMatchingItems] = useState({}); // Tracking which item IDs are currently matching

    useEffect(() => {
        fetchTrackedItems();
    }, []);

    const toggleSection = (sectionId) => {
        setExpandedSections(prev => ({
            ...prev,
            [sectionId]: !prev[sectionId]
        }));
    };

    const fetchTrackedItems = async () => {
        try {
            const response = await trackerAPI.getAll();
            setItems(response.data);
        } catch (err) {
            console.error('Error fetching tracked items:', err);
            setError('Failed to load tracked items.');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (itemId, newStatus) => {
        try {
            await trackerAPI.update(itemId, { status: newStatus });
            setItems(prev => prev.map(item =>
                item.id === itemId ? { ...item, status: newStatus } : item
            ));
            setPopup({
                isOpen: true,
                title: 'Status Updated',
                message: `You've successfully moved this to "${newStatus}"!`,
                type: 'success'
            });
        } catch (err) {
            console.error('Error updating status:', err);
            const errorMsg = err.response?.data?.error || 'Failed to update status.';
            setPopup({
                isOpen: true,
                title: 'Update Error',
                message: errorMsg,
                type: 'error'
            });
        }
    };

    const handleDelete = (itemId) => {
        setPopup({
            isOpen: true,
            title: 'Remove Opportunity?',
            message: 'Are you sure you want to remove this item from your tracker? This action cannot be undone.',
            type: 'confirm',
            onConfirm: async () => {
                try {
                    await trackerAPI.delete(itemId);
                    setItems(prev => prev.filter(item => item.id !== itemId));
                } catch (err) {
                    console.error('Error deleting item:', err);
                    const errorMsg = err.response?.data?.error || 'Failed to remove the item from your tracker.';
                    setPopup({
                        isOpen: true,
                        title: 'Error',
                        message: errorMsg,
                        type: 'error'
                    });
                }
            }
        });
    };

    const handleCalculateMatch = async (itemId) => {
        setMatchingItems(prev => ({ ...prev, [itemId]: true }));
        try {
            const response = await trackerAPI.calculateMatch(itemId);
            setItems(prev => prev.map(item =>
                item.id === itemId ? {
                    ...item,
                    match_score: response.data.match_score,
                    match_explanation: response.data.match_explanation
                } : item
            ));
            setPopup({
                isOpen: true,
                title: 'AI Analysis Complete',
                message: `Match Score: ${response.data.match_score}%\n${response.data.match_explanation}`,
                type: 'success'
            });
        } catch (err) {
            console.error('Error calculating match:', err);
            const errorMsg = err.response?.data?.error || 'Failed to calculate match score.';
            setPopup({
                isOpen: true,
                title: 'AI Error',
                message: errorMsg,
                type: 'error'
            });
        } finally {
            setMatchingItems(prev => ({ ...prev, [itemId]: false }));
        }
    };

    const renderCard = (item) => {
        const { event_details, event_type, id, status, match_score, match_explanation } = item;
        if (!event_details) return null;

        const isMatching = matchingItems[id];
        const getMatchClass = (score) => {
            if (score >= 75) return 'high';
            if (score >= 40) return 'medium';
            return 'low';
        };

        return (
            <div key={id} className="tracker-card">
                <div className="tracker-card-header">
                    <span className={`event-type-badge ${event_type}`}>
                        {event_type === 'hackathon' ? 'Hackathon' : 'Internship'}
                    </span>
                    <button className="delete-btn" onClick={() => handleDelete(id)} title="Remove">×</button>
                </div>
                <h4 className="tracker-card-title">{event_details.title}</h4>
                <p className="tracker-card-subtitle">{event_details.organizer || event_details.company}</p>

                {match_score !== null ? (
                    <div className="match-score-container">
                        <button
                            className="recalculate-match-btn"
                            onClick={() => handleCalculateMatch(id)}
                            disabled={isMatching}
                            title="Recalculate AI Match"
                        >
                            <span className="material-icons" style={{ fontSize: '18px' }}>
                                {isMatching ? 'sync' : 'psychology'}
                            </span>
                        </button>
                        <div className="match-score-header">
                            <span className="match-score-label">AI Match Score</span>
                            <div className={`match-score-badge ${getMatchClass(match_score)}`}>
                                <span className="material-icons" style={{ fontSize: '16px' }}>bolt</span>
                                {match_score}%
                            </div>
                        </div>
                        {match_explanation && (
                            <p className="match-explanation">{match_explanation}</p>
                        )}
                    </div>
                ) : (
                    <div className="no-match-score">
                        <p>No AI Match Score yet</p>
                        <button
                            className="mini-btn"
                            onClick={() => handleCalculateMatch(id)}
                            disabled={isMatching}
                        >
                            {isMatching ? 'Analyzing...' : 'Analyze Match'}
                        </button>
                    </div>
                )}

                <div className="tracker-card-footer">
                    <select
                        value={status === 'Offered' || status === 'Rejected' ? 'Finished' : status}
                        onChange={(e) => handleStatusChange(id, e.target.value)}
                        className="status-select"
                    >
                        {COLUMNS.map(col => (
                            <option key={col.id} value={col.id}>{col.title}</option>
                        ))}
                    </select>

                    {event_details.link && (
                        <a href={event_details.link} target="_blank" rel="noopener noreferrer" className="apply-link">
                            Link
                        </a>
                    )}
                </div>
            </div>
        );
    };

    if (loading) return <div className="loader">Loading your career cockpit...</div>;
    if (error) return <div className="error-message">{error}</div>;

    return (
        <div className="tracker-container">
            <header className="tracker-header">
                <h1>Application Tracker</h1>
                <p>Manage your journey from discovery to offer.</p>
            </header>

            <div className="tracker-rows">
                {COLUMNS.map(column => {
                    const columnItems = items.filter(item => {
                        if (column.id === 'Finished') {
                            return item.status === 'Finished' || item.status === 'Offered' || item.status === 'Rejected';
                        }
                        return item.status === column.id;
                    });
                    const isExpanded = expandedSections[column.id];

                    return (
                        <div key={column.id} className={`tracker-section ${isExpanded ? 'expanded' : 'collapsed'}`}>
                            <div className="section-header" onClick={() => toggleSection(column.id)}>
                                <div className="section-title-wrapper">
                                    <span className={`toggle-icon ${isExpanded ? 'rotated' : ''}`}>▼</span>
                                    <h3>{column.title}</h3>
                                    <span className="count">{columnItems.length}</span>
                                </div>
                            </div>
                            {isExpanded && (
                                <div className="section-content">
                                    {columnItems.length > 0 ? (
                                        <div className="cards-grid">
                                            {columnItems.map(item => renderCard(item))}
                                        </div>
                                    ) : (
                                        <p className="empty-category">No items in this category yet.</p>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <Popup
                isOpen={popup.isOpen}
                onClose={() => setPopup({ ...popup, isOpen: false })}
                title={popup.title}
                message={popup.message}
                type={popup.type}
                onConfirm={popup.onConfirm}
            />
        </div>
    );
}

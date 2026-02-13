import { useState, useEffect } from 'react';
import { hackathonsAPI, internshipsAPI } from '../services/api';
import './LiveFeed.css';

export default function LiveFeed() {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRecentActivity();
        const interval = setInterval(fetchRecentActivity, 300000); // Refresh every 5 mins
        return () => clearInterval(interval);
    }, []);

    const fetchRecentActivity = async () => {
        try {
            const [hResponse, iResponse] = await Promise.all([
                hackathonsAPI.getAll({ sort_by: 'created_at', order: 'desc', limit: 5 }),
                internshipsAPI.getAll({ sort_by: 'created_at', order: 'desc', limit: 5 })
            ]);

            const combined = [
                ...hResponse.data.map(h => ({ ...h, type: 'hackathon', time: new Date(h.created_at) })),
                ...iResponse.data.map(i => ({ ...i, type: 'internship', time: new Date(i.created_at) }))
            ].sort((a, b) => b.time - a.time).slice(0, 8);

            setActivities(combined);
        } catch (err) {
            console.error('Error fetching live feed:', err);
        } finally {
            setLoading(false);
        }
    };

    const getSourceColor = (source) => {
        const sources = {
            'LinkedIn': '#0077b5',
            'Unstop': '#ff9ffc',
            'Devfolio': '#3770ff',
            'Greenhouse': '#10b981',
            'Lever': '#333333'
        };
        return sources[source] || 'var(--primary-color)';
    };

    if (loading) return <div className="live-feed-loader">Scanning for updates...</div>;

    return (
        <div className="live-feed-container">
            <div className="live-feed-header">
                <div className="pulse-dot"></div>
                <h3>Live Activity Feed</h3>
            </div>
            <div className="activity-list">
                {activities.map((activity) => (
                    <div key={`${activity.type}-${activity.id}`} className="activity-item">
                        <div className="activity-indicator" style={{ backgroundColor: getSourceColor(activity.source) }}></div>
                        <div className="activity-content">
                            <div className="activity-meta">
                                <span className="activity-source" style={{ color: getSourceColor(activity.source) }}>
                                    {activity.source || 'DevAlert'}
                                </span>
                                <span className="activity-type-label">{activity.type}</span>
                            </div>
                            <p className="activity-text">
                                <strong>{activity.company || activity.organizer}</strong>: {activity.title}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

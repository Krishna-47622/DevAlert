import { useState, useEffect } from 'react';
import { adminAPI, hackathonsAPI, internshipsAPI } from '../services/api';
import Card, { CardHeader, CardBody } from '../components/Card';

export default function Dashboard() {
    const [stats, setStats] = useState(null);
    const [recentHackathons, setRecentHackathons] = useState([]);
    const [recentInternships, setRecentInternships] = useState([]);
    const [loading, setLoading] = useState(true);
    const user = JSON.parse(localStorage.getItem('user') || 'null');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            if (user?.role === 'admin') {
                const statsResponse = await adminAPI.getStats();
                setStats(statsResponse.data);
            }

            const hackathonsResponse = await hackathonsAPI.getAll({ status: 'approved' });
            setRecentHackathons(hackathonsResponse.data.slice(0, 3));

            const internshipsResponse = await internshipsAPI.getAll({ status: 'approved' });
            setRecentInternships(internshipsResponse.data.slice(0, 3));
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="container" style={{ paddingTop: '2rem', textAlign: 'center' }}>
                <div className="loading" style={{ width: '40px', height: '40px' }}></div>
            </div>
        );
    }

    return (
        <div className="container" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
            <h1 className="mb-4">Dashboard</h1>

            {stats && user?.role === 'admin' && (
                <div className="grid grid-3 mb-4">
                    <Card>
                        <CardHeader>Hackathons</CardHeader>
                        <CardBody>
                            <div className="flex justify-between mb-2">
                                <span>Total:</span>
                                <strong>{stats.hackathons.total}</strong>
                            </div>
                            <div className="flex justify-between mb-2">
                                <span>Approved:</span>
                                <strong className="badge badge-success">{stats.hackathons.approved}</strong>
                            </div>
                            <div className="flex justify-between">
                                <span>Pending:</span>
                                <strong className="badge badge-warning">{stats.hackathons.pending}</strong>
                            </div>
                        </CardBody>
                    </Card>

                    <Card>
                        <CardHeader>Internships</CardHeader>
                        <CardBody>
                            <div className="flex justify-between mb-2">
                                <span>Total:</span>
                                <strong>{stats.internships.total}</strong>
                            </div>
                            <div className="flex justify-between mb-2">
                                <span>Approved:</span>
                                <strong className="badge badge-success">{stats.internships.approved}</strong>
                            </div>
                            <div className="flex justify-between">
                                <span>Pending:</span>
                                <strong className="badge badge-warning">{stats.internships.pending}</strong>
                            </div>
                        </CardBody>
                    </Card>

                    <Card>
                        <CardHeader>Users</CardHeader>
                        <CardBody>
                            <div className="flex justify-between mb-2">
                                <span>Total:</span>
                                <strong>{stats.users.total}</strong>
                            </div>
                            <div className="flex justify-between mb-2">
                                <span>Admins:</span>
                                <strong>{stats.users.admins}</strong>
                            </div>
                            <div className="flex justify-between">
                                <span>Applicants:</span>
                                <strong>{stats.users.applicants}</strong>
                            </div>
                        </CardBody>
                    </Card>
                </div>
            )}

            <h2 className="mb-3">Recent Hackathons</h2>
            <div className="grid grid-3 mb-4">
                {recentHackathons.length > 0 ? (
                    recentHackathons.map((hackathon) => (
                        <Card key={hackathon.id}>
                            <CardHeader>{hackathon.title}</CardHeader>
                            <CardBody>
                                <p><strong>Organizer:</strong> {hackathon.organizer}</p>
                                <p><strong>Location:</strong> {hackathon.location}</p>
                                <p><strong>Deadline:</strong> {new Date(hackathon.deadline).toLocaleDateString()}</p>
                                {hackathon.prize_pool && <p><strong>Prize:</strong> {hackathon.prize_pool}</p>}
                            </CardBody>
                        </Card>
                    ))
                ) : (
                    <p>No hackathons available</p>
                )}
            </div>

            <h2 className="mb-3">Recent Internships</h2>
            <div className="grid grid-3">
                {recentInternships.length > 0 ? (
                    recentInternships.map((internship) => (
                        <Card key={internship.id}>
                            <CardHeader>{internship.title}</CardHeader>
                            <CardBody>
                                <p><strong>Company:</strong> {internship.company}</p>
                                <p><strong>Location:</strong> {internship.location}</p>
                                <p><strong>Duration:</strong> {internship.duration}</p>
                                {internship.stipend && <p><strong>Stipend:</strong> {internship.stipend}</p>}
                            </CardBody>
                        </Card>
                    ))
                ) : (
                    <p>No internships available</p>
                )}
            </div>
        </div>
    );
}

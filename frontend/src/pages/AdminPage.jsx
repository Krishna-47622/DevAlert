import { useState, useEffect } from 'react';
import { adminAPI, hackathonsAPI, internshipsAPI } from '../services/api';
import Card, { CardHeader, CardBody, CardFooter } from '../components/Card';
import Modal from '../components/Modal';
import Popup from '../components/Popup';

export default function AdminPage() {
    const [pending, setPending] = useState({ hackathons: [], internships: [] });
    const [hostRequests, setHostRequests] = useState([]);
    const [allOpportunities, setAllOpportunities] = useState({ hackathons: [], internships: [] });
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('pending'); // 'pending', 'users', 'manage', 'hostRequests'
    const [searchTerm, setSearchTerm] = useState('');
    const [isScanning, setIsScanning] = useState(false);

    // Popup State
    const [popup, setPopup] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info', // success, error, warning, confirm
        onConfirm: () => { }
    });

    const showPopup = (title, message, type = 'info', onConfirm = () => { }) => {
        setPopup({
            isOpen: true,
            title,
            message,
            type,
            onConfirm
        });
    };

    const closePopup = () => {
        setPopup(prev => ({ ...prev, isOpen: false }));
    };

    useEffect(() => {
        fetchPending();
        fetchUsers();
        if (activeTab === 'manage') {
            fetchAllOpportunities();
        } else if (activeTab === 'hostRequests') {
            fetchHostRequests();
        }
    }, [activeTab]);

    const fetchHostRequests = async () => {
        try {
            const response = await adminAPI.getHostRequests();
            setHostRequests(response.data);
        } catch (error) {
            console.error('Error fetching host requests:', error);
            showPopup('Error', 'Failed to fetch host requests', 'error');
        }
    };

    const fetchPending = async () => {
        try {
            const response = await adminAPI.getPending();
            setPending(response.data);
        } catch (error) {
            console.error('Error fetching pending items:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAllOpportunities = async () => {
        try {
            const response = await adminAPI.getAllOpportunities();
            setAllOpportunities(response.data);
        } catch (error) {
            console.error('Error fetching all opportunities:', error);
        }
    };

    const fetchUsers = async () => {
        try {
            const response = await adminAPI.getUsers();
            setUsers(response.data);
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

    const handleApprove = async (type, id) => {
        try {
            await adminAPI.approve(type, id);
            fetchPending();
            fetchAllOpportunities();
            setModalOpen(false);
            showPopup('Success', `${type === 'hackathon' ? 'Hackathon' : 'Internship'} approved successfully!`, 'success');
        } catch (error) {
            console.error('Error approving:', error);
            showPopup('Error', 'Failed to approve item.', 'error');
        }
    };

    const handleReject = async (type, id) => {
        try {
            await adminAPI.reject(type, id);
            fetchPending();
            fetchAllOpportunities();
            setModalOpen(false);
            showPopup('Success', `${type === 'hackathon' ? 'Hackathon' : 'Internship'} rejected successfully!`, 'success');
        } catch (error) {
            console.error('Error rejecting:', error);
            showPopup('Error', 'Failed to reject item.', 'error');
        }
    };

    const handleApproveHost = async (userId) => {
        try {
            await adminAPI.approveHost(userId);
            fetchHostRequests();
            showPopup('Success', 'Host request approved successfully!', 'success');
        } catch (error) {
            console.error('Error approving host:', error);
            showPopup('Error', 'Failed to approve host request.', 'error');
        }
    };

    const handleDeleteOpportunity = (type, id) => {
        showPopup(
            'Confirm Deletion',
            'Are you sure you want to delete this opportunity? This action cannot be undone.',
            'confirm',
            async () => {
                try {
                    if (type === 'hackathon') {
                        await hackathonsAPI.delete(id);
                    } else {
                        await internshipsAPI.delete(id);
                    }
                    fetchAllOpportunities();
                    fetchPending();
                    showPopup('Deleted', 'Opportunity deleted successfully.', 'success');
                } catch (error) {
                    console.error('Error deleting opportunity:', error);
                    showPopup('Error', 'Failed to delete opportunity.', 'error');
                }
            }
        );
    };

    const openModal = (item, type) => {
        setSelectedItem({ ...item, type });
        setModalOpen(true);
    };

    const handleDeleteUser = (userId) => {
        showPopup(
            'Confirm Deletion',
            'Are you sure you want to delete this user? This action cannot be undone.',
            'confirm',
            async () => {
                try {
                    await adminAPI.deleteUser(userId);
                    fetchUsers();
                    showPopup('Deleted', 'User deleted successfully.', 'success');
                } catch (error) {
                    console.error('Error deleting user:', error);
                    showPopup('Error', 'Failed to delete user.', 'error');
                }
            }
        );
    };

    const handleRoleUpdate = async (userId, newRole) => {
        try {
            await adminAPI.updateUserRole(userId, newRole);
            fetchUsers();
            showPopup('Updated', 'User role updated successfully.', 'success');
        } catch (error) {
            console.error('Error updating user role:', error);
            showPopup('Error', 'Failed to update user role.', 'error');
        }
    };

    // Style constants for reuse
    const tabButtonStyle = (isActive) => ({
        padding: '0.75rem 1.5rem',
        background: isActive ? 'var(--color-primary)' : 'rgba(255, 255, 255, 0.05)',
        color: 'white',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: '500',
        transition: 'all 0.2s',
        backdropFilter: 'blur(10px)'
    });

    const tableHeaderStyle = {
        textAlign: 'left',
        padding: '1rem',
        color: 'var(--color-text-secondary)',
        borderBottom: '1px solid var(--color-border)',
        fontWeight: '600'
    };

    const tableCellStyle = {
        padding: '1rem',
        borderBottom: '1px solid var(--color-border-light)',
        color: 'var(--color-text-primary)'
    };

    return (
        <div className="container" style={{ paddingTop: '2rem' }}>
            <Popup
                isOpen={popup.isOpen}
                onClose={closePopup}
                title={popup.title}
                message={popup.message}
                type={popup.type}
                onConfirm={popup.onConfirm}
            />

            <h1 className="text-center mb-4 text-glow" style={{ color: 'white' }}>Admin Dashboard</h1>

            {/* Quick Actions */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
                <button
                    disabled={isScanning}
                    onClick={async () => {
                        setIsScanning(true);
                        try {
                            await adminAPI.triggerScan();
                            showPopup('Scan Triggered', 'AI Scan has been triggered successfully. Check notifications for results.', 'success');
                        } catch (e) {
                            console.error(e);
                            showPopup('Error', 'Failed to trigger scan: ' + (e.response?.data?.error || e.message), 'error');
                        } finally {
                            setIsScanning(false);
                        }
                    }}
                    className="btn btn-primary"
                    style={{
                        background: isScanning ? 'rgba(99, 102, 241, 0.1)' : 'rgba(99, 102, 241, 0.2)',
                        backdropFilter: 'blur(10px)',
                        fontWeight: 'bold',
                        border: '1px solid var(--color-primary)',
                        padding: '0.75rem 1.5rem',
                        fontSize: '1rem',
                        color: 'white',
                        boxShadow: isScanning ? 'none' : '0 0 15px rgba(99, 102, 241, 0.3)',
                        opacity: isScanning ? 0.7 : 1,
                        cursor: isScanning ? 'wait' : 'pointer'
                    }}
                >
                    {isScanning ? (
                        <>
                            <span className="loading mr-2"></span>
                            SCANNING...
                        </>
                    ) : 'TRIGGER AI SCAN'}
                </button>
            </div>

            {/* Tab Navigation */}
            <div style={{
                display: 'flex',
                gap: '1rem',
                marginBottom: '2rem',
                overflowX: 'auto',
                paddingBottom: '0.5rem',
                borderBottom: '1px solid var(--color-border)'
            }}>
                <button
                    onClick={() => setActiveTab('pending')}
                    style={tabButtonStyle(activeTab === 'pending')}
                >
                    Pending Approvals
                </button>
                <button
                    onClick={() => setActiveTab('manage')}
                    style={tabButtonStyle(activeTab === 'manage')}
                >
                    Manage Opportunities
                </button>
                <button
                    onClick={() => setActiveTab('users')}
                    style={tabButtonStyle(activeTab === 'users')}
                >
                    User Management
                </button>
                <button
                    onClick={() => setActiveTab('hostRequests')}
                    style={tabButtonStyle(activeTab === 'hostRequests')}
                >
                    Host Requests ({hostRequests.length})
                </button>
            </div>

            {/* Search Input */}
            <div style={{ marginBottom: '2rem' }}>
                <input
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                        width: '100%',
                        padding: '1rem',
                        borderRadius: '12px',
                        border: '1px solid var(--color-border)',
                        fontSize: '1rem',
                        backgroundColor: 'rgba(0, 0, 0, 0.2)',
                        color: 'white',
                        backdropFilter: 'blur(5px)'
                    }}
                />
            </div>

            {/* Pending Approvals Tab */}
            {activeTab === 'pending' && (
                <div className="fade-in">
                    <h2 className="mb-3 text-white">Pending Hackathons ({pending.hackathons.length})</h2>
                    <div className="grid grid-3 mb-4">
                        {pending.hackathons
                            .filter(h => h.title.toLowerCase().includes(searchTerm.toLowerCase()) || h.organizer.toLowerCase().includes(searchTerm.toLowerCase()))
                            .map((hackathon) => (
                                <Card key={hackathon.id}>
                                    <CardHeader>{hackathon.title}</CardHeader>
                                    <CardBody>
                                        <p><strong>Organizer:</strong> {hackathon.organizer}</p>
                                        <p><strong>Location:</strong> {hackathon.location}</p>
                                        <p><strong>Source:</strong> <span className="badge badge-info">{hackathon.source}</span></p>
                                        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                                            {hackathon.description.substring(0, 100)}...
                                        </p>
                                    </CardBody>
                                    <CardFooter>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                                            <button onClick={() => openModal(hackathon, 'hackathon')} className="btn btn-secondary" style={{ fontSize: '0.8rem' }}>View</button>
                                            <button onClick={() => handleApprove('hackathon', hackathon.id)} className="btn btn-success" style={{ fontSize: '0.8rem' }}>Approve</button>
                                            <button onClick={() => handleReject('hackathon', hackathon.id)} className="btn btn-danger" style={{ fontSize: '0.8rem' }}>Reject</button>
                                        </div>
                                    </CardFooter>
                                </Card>
                            ))}
                        {pending.hackathons.length === 0 && <p className="text-gray-400">No pending hackathons</p>}
                    </div>

                    <h2 className="mb-3 text-white">Pending Internships ({pending.internships.length})</h2>
                    <div className="grid grid-3">
                        {pending.internships
                            .filter(i => i.title.toLowerCase().includes(searchTerm.toLowerCase()) || i.company.toLowerCase().includes(searchTerm.toLowerCase()))
                            .map((internship) => (
                                <Card key={internship.id}>
                                    <CardHeader>{internship.title}</CardHeader>
                                    <CardBody>
                                        <p><strong>Company:</strong> {internship.company}</p>
                                        <p><strong>Location:</strong> {internship.location}</p>
                                        <p><strong>Source:</strong> <span className="badge badge-info">{internship.source}</span></p>
                                        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                                            {internship.description.substring(0, 100)}...
                                        </p>
                                    </CardBody>
                                    <CardFooter>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                                            <button onClick={() => openModal(internship, 'internship')} className="btn btn-secondary" style={{ fontSize: '0.8rem' }}>View</button>
                                            <button onClick={() => handleApprove('internship', internship.id)} className="btn btn-success" style={{ fontSize: '0.8rem' }}>Approve</button>
                                            <button onClick={() => handleReject('internship', internship.id)} className="btn btn-danger" style={{ fontSize: '0.8rem' }}>Reject</button>
                                        </div>
                                    </CardFooter>
                                </Card>
                            ))}
                        {pending.internships.length === 0 && <p className="text-gray-400">No pending internships</p>}
                    </div>
                </div>
            )}

            {/* Manage Opportunities Tab */}
            {activeTab === 'manage' && (
                <div className="fade-in">
                    <h2 className="mb-3 text-white">Manage Hackathons</h2>
                    <div className="card mb-4" style={{ overflowX: 'auto', padding: '0' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr>
                                    <th style={tableHeaderStyle}>Title</th>
                                    <th style={tableHeaderStyle}>Organizer</th>
                                    <th style={tableHeaderStyle}>Status</th>
                                    <th style={tableHeaderStyle}>Created At</th>
                                    <th style={tableHeaderStyle}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {allOpportunities.hackathons
                                    .filter(h => h.title.toLowerCase().includes(searchTerm.toLowerCase()) || h.organizer.toLowerCase().includes(searchTerm.toLowerCase()))
                                    .map((hackathon) => (
                                        <tr key={hackathon.id}>
                                            <td style={tableCellStyle}>{hackathon.title}</td>
                                            <td style={tableCellStyle}>{hackathon.organizer}</td>
                                            <td style={tableCellStyle}>
                                                <span className={`badge badge-${hackathon.status === 'approved' ? 'success' : hackathon.status === 'rejected' ? 'danger' : 'warning'}`}>
                                                    {hackathon.status}
                                                </span>
                                            </td>
                                            <td style={tableCellStyle}>{new Date(hackathon.created_at).toLocaleDateString()}</td>
                                            <td style={tableCellStyle}>
                                                <div className="flex gap-2">
                                                    <button onClick={() => openModal(hackathon, 'hackathon')} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>View</button>
                                                    <button onClick={() => handleDeleteOpportunity('hackathon', hackathon.id)} className="btn btn-danger" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>Delete</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>

                    <h2 className="mb-3 text-white">Manage Internships</h2>
                    <div className="card" style={{ overflowX: 'auto', padding: '0' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr>
                                    <th style={tableHeaderStyle}>Title</th>
                                    <th style={tableHeaderStyle}>Company</th>
                                    <th style={tableHeaderStyle}>Status</th>
                                    <th style={tableHeaderStyle}>Created At</th>
                                    <th style={tableHeaderStyle}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {allOpportunities.internships
                                    .filter(i => i.title.toLowerCase().includes(searchTerm.toLowerCase()) || i.company.toLowerCase().includes(searchTerm.toLowerCase()))
                                    .map((internship) => (
                                        <tr key={internship.id}>
                                            <td style={tableCellStyle}>{internship.title}</td>
                                            <td style={tableCellStyle}>{internship.company}</td>
                                            <td style={tableCellStyle}>
                                                <span className={`badge badge-${internship.status === 'approved' ? 'success' : internship.status === 'rejected' ? 'danger' : 'warning'}`}>
                                                    {internship.status}
                                                </span>
                                            </td>
                                            <td style={tableCellStyle}>{new Date(internship.created_at).toLocaleDateString()}</td>
                                            <td style={tableCellStyle}>
                                                <div className="flex gap-2">
                                                    <button onClick={() => openModal(internship, 'internship')} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>View</button>
                                                    <button onClick={() => handleDeleteOpportunity('internship', internship.id)} className="btn btn-danger" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>Delete</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* User Management Tab */}
            {activeTab === 'users' && (
                <div className="card fade-in" style={{ padding: '0', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                <th style={tableHeaderStyle}>Username</th>
                                <th style={tableHeaderStyle}>Email</th>
                                <th style={tableHeaderStyle}>Role</th>
                                <th style={tableHeaderStyle}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users
                                .filter(u => u.username.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase()))
                                .map((user) => (
                                    <tr key={user.id}>
                                        <td style={tableCellStyle}>{user.username}</td>
                                        <td style={tableCellStyle}>{user.email}</td>
                                        <td style={tableCellStyle}>
                                            <select
                                                value={user.role}
                                                onChange={(e) => handleRoleUpdate(user.id, e.target.value)}
                                                className="form-select"
                                                style={{ width: 'auto', padding: '0.4rem' }}
                                            >
                                                <option value="participant">Participant</option>
                                                <option value="hoster">Hoster</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                        </td>
                                        <td style={tableCellStyle}>
                                            <button onClick={() => handleDeleteUser(user.id)} className="btn btn-danger" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>Delete</button>
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Host Requests Tab */}
            {activeTab === 'hostRequests' && (
                <div className="fade-in">
                    <h2 className="mb-3 text-white">Host Requests ({hostRequests.length})</h2>
                    {hostRequests.length === 0 ? (
                        <div className="card text-center p-5">
                            <p className="text-gray-400">No pending host requests.</p>
                        </div>
                    ) : (
                        <div className="card" style={{ padding: '0', overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr>
                                        <th style={tableHeaderStyle}>Username</th>
                                        <th style={tableHeaderStyle}>Email</th>
                                        <th style={tableHeaderStyle}>Organization</th>
                                        <th style={tableHeaderStyle}>Designation</th>
                                        <th style={tableHeaderStyle}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {hostRequests
                                        .filter(u => u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                            u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                            (u.organization && u.organization.toLowerCase().includes(searchTerm.toLowerCase())))
                                        .map((user) => (
                                            <tr key={user.id}>
                                                <td style={tableCellStyle}>{user.username}</td>
                                                <td style={tableCellStyle}>{user.email}</td>
                                                <td style={tableCellStyle}>{user.organization || '-'}</td>
                                                <td style={tableCellStyle}>{user.designation || '-'}</td>
                                                <td style={tableCellStyle}>
                                                    <button
                                                        onClick={() => handleApproveHost(user.id)}
                                                        className="btn btn-success"
                                                        style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}
                                                    >
                                                        Approve Host
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Modal */}
            {modalOpen && selectedItem && (
                <Modal
                    isOpen={modalOpen}
                    onClose={() => setModalOpen(false)}
                    title={selectedItem.title}
                >
                    <div style={{ color: 'var(--color-text-primary)' }}>
                        <p><strong>Description:</strong></p>
                        <p style={{ color: 'var(--color-text-secondary)' }}>{selectedItem.description}</p>
                        <div style={{ margin: '1rem 0' }}>
                            {selectedItem.type === 'hackathon' ? (
                                <>
                                    <p><strong>Organizer:</strong> {selectedItem.organizer}</p>
                                    <p><strong>Prize Pool:</strong> {selectedItem.prize_pool}</p>
                                    <p><strong>Deadline:</strong> {new Date(selectedItem.deadline).toLocaleDateString()}</p>
                                </>
                            ) : (
                                <>
                                    <p><strong>Company:</strong> {selectedItem.company}</p>
                                    <p><strong>Stipend:</strong> {selectedItem.stipend}</p>
                                    <p><strong>Duration:</strong> {selectedItem.duration}</p>
                                </>
                            )}
                            <p><strong>Location:</strong> {selectedItem.location}</p>
                            <p><strong>Mode:</strong> {selectedItem.mode}</p>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}

import { useState, useEffect } from 'react';
import { adminAPI, hackathonsAPI, internshipsAPI } from '../services/api';
import Card, { CardHeader, CardBody, CardFooter } from '../components/Card';
import Modal from '../components/Modal';
import Popup from '../components/Popup';
import { motion, AnimatePresence } from 'framer-motion';

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
    const [autoApproveEnabled, setAutoApproveEnabled] = useState(false);
    const [autoApproveLoading, setAutoApproveLoading] = useState(false);
    const [collapsedSections, setCollapsedSections] = useState({ hackathons: false, internships: false });
    const toggleSection = (key) => setCollapsedSections(prev => ({ ...prev, [key]: !prev[key] }));

    // Bulk Selection State
    const [selectedItems, setSelectedItems] = useState(new Set()); // Stores strings: "{type}-{id}"

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
        fetchHostRequests();
        fetchAutoApproveStatus();
        if (activeTab === 'manage') {
            fetchAllOpportunities();
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

    const fetchAutoApproveStatus = async () => {
        try {
            const response = await adminAPI.getAutoApproveStatus();
            setAutoApproveEnabled(response.data.enabled);
        } catch (error) {
            console.error('Error fetching auto-approve status:', error);
        }
    };

    const handleToggleAutoApprove = async () => {
        setAutoApproveLoading(true);
        try {
            const newState = !autoApproveEnabled;
            const response = await adminAPI.toggleAutoApprove(newState);
            setAutoApproveEnabled(response.data.enabled);
            showPopup(
                response.data.enabled ? '✅ Auto-Approve Enabled' : '⏸ Auto-Approve Disabled',
                response.data.message,
                'success'
            );
        } catch (error) {
            console.error('Error toggling auto-approve:', error);
            showPopup('Error', 'Failed to update auto-approve setting.', 'error');
        } finally {
            setAutoApproveLoading(false);
        }
    };

    const handleAutoApprove = async () => {
        showPopup('Confirm Auto-Approve', 'Are you sure you want to approve the 5 oldest pending hackathons and internships?', 'confirm', async () => {
            try {
                const response = await adminAPI.autoApprove();
                fetchPending();
                showPopup('Success', response.data.message, 'success');
            } catch (error) {
                console.error('Error auto-approving:', error);
                showPopup('Error', 'Failed to auto-approve items.', 'error');
            }
        });
    };

    const activeTabStyle = {
        cursor: 'pointer',
        userSelect: 'none'
    };

    // Triple click logic for title
    const [titleClickCount, setTitleClickCount] = useState(0);

    useEffect(() => {
        if (titleClickCount === 0) return;

        const timer = setTimeout(() => {
            setTitleClickCount(0);
        }, 800);

        if (titleClickCount === 3) {
            handleTitleCycle();
            handleSelectionCycle(); // Trigger the selection cycle
            setTitleClickCount(0);
        }

        return () => clearTimeout(timer);
    }, [titleClickCount]);

    const [selectionStage, setSelectionStage] = useState(0); // 0: None, 1: Enable, 2: All, 3: Approved, 4: Rejected

    const handleSelectionCycle = () => {
        setSelectionStage(prev => {
            const nextStage = (prev + 1) % 5; // 0 -> 1 -> 2 -> 3 -> 4 -> 0
            const newSelected = new Set();

            let items = [];
            if (activeTab === 'manage') {
                items = [...allOpportunities.hackathons, ...allOpportunities.internships];
            } else if (activeTab === 'pending') {
                items = [...pending.hackathons, ...pending.internships];
            }

            if (nextStage === 1) { // Enable Selection Mode
                // showPopup('Selection Mode', 'Click items to select them manually.', 'info');
                // Don't select anything yet, just enable the mode
            } else if (nextStage === 2) { // Select All
                items.forEach(item => {
                    const type = item.organizer ? 'hackathon' : 'internship';
                    newSelected.add(`${type}-${item.id}`);
                });
                // showPopup('Selection', `Selected ALL items (${newSelected.size})`, 'info');
            } else if (nextStage === 3) { // Select Approved
                items.filter(i => i.status === 'approved').forEach(item => {
                    const type = item.organizer ? 'hackathon' : 'internship';
                    newSelected.add(`${type}-${item.id}`);
                });
                // showPopup('Selection', `Selected APPROVED items (${newSelected.size})`, 'info');
            } else if (nextStage === 4) { // Select Rejected
                items.filter(i => i.status === 'rejected').forEach(item => {
                    const type = item.organizer ? 'hackathon' : 'internship';
                    newSelected.add(`${type}-${item.id}`);
                });
                // showPopup('Selection', `Selected REJECTED items (${newSelected.size})`, 'info');
            } else {
                // showPopup('Selection', 'Selection Cleared', 'info');
            }

            setSelectedItems(newSelected);
            return nextStage;
        });
    };

    // Reset selection stage when tab changes or manual selection occurs
    useEffect(() => {
        setSelectionStage(0);
        setSelectedItems(new Set());
    }, [activeTab]);

    // Bulk Selection Logic
    const toggleSelection = (type, id) => {
        // Only allow selection if in selection mode (stage > 0)
        // Note: Manual toggling shouldn't necessarily reset the stage to 0, 
        // but it might break the "cycle" logic if we rely on stage for the Next step.
        // Let's decide: does manual clicking keep us in "Selection Mode"? Yes.
        // We just need to make sure we don't automatically reset selectionStage to 0 here unless we want to exit mode.
        // User didn't specify, but "ability to select" implies staying in the mode.

        if (selectionStage === 0) return; // Prevent selection in View mode

        const key = `${type}-${id}`;
        const newSelected = new Set(selectedItems);
        if (newSelected.has(key)) {
            newSelected.delete(key);
        } else {
            newSelected.add(key);
        }
        setSelectedItems(newSelected);
        // setSelectionStage(0); // REMOVED: Keep selection mode active
    };

    const toggleSelectAll = (items, type) => {
        const newSelected = new Set(selectedItems);
        const allSelected = items.every(i => selectedItems.has(`${type}-${i.id}`));

        if (allSelected) {
            items.forEach(i => newSelected.delete(`${type}-${i.id}`));
        } else {
            items.forEach(i => newSelected.add(`${type}-${i.id}`));
        }
        setSelectedItems(newSelected);
    };

    const handleBulkAction = async (action) => {
        if (selectedItems.size === 0) return;

        showPopup('Confirm Bulk Action', `Are you sure you want to ${action} ${selectedItems.size} items?`, 'confirm', async () => {
            try {
                // Determine types and IDs
                const hackathonIds = [];
                const internshipIds = [];

                selectedItems.forEach(key => {
                    const [type, id] = key.split('-');
                    if (type === 'hackathon') hackathonIds.push(id);
                    else if (type === 'internship') internshipIds.push(id);
                });

                if (hackathonIds.length > 0) {
                    await adminAPI.bulkAction({ type: 'hackathon', ids: hackathonIds, action });
                }
                if (internshipIds.length > 0) {
                    await adminAPI.bulkAction({ type: 'internship', ids: internshipIds, action });
                }

                showPopup('Success', 'Bulk action completed successfully', 'success');
                setSelectedItems(new Set());
                setSelectionStage(0);
                fetchPending();
                fetchAllOpportunities();
            } catch (error) {
                console.error('Bulk action error:', error);
                showPopup('Error', 'Failed to perform bulk action', 'error');
            }
        });
    };

    const handlePurgeAll = (type) => {
        showPopup('DANGER: PURGE ALL', `Are you sure you want to PERMANENTLY DELETE ALL ${type.toUpperCase()}S? This action is IRREVERSIBLE!`, 'confirm', async () => {
            try {
                await adminAPI.purgeAll(type);
                showPopup('Purged', `All ${type}s have been deleted.`, 'success');
                setSelectionStage(0);
                fetchAllOpportunities();
                fetchPending();
            } catch (error) {
                showPopup('Error', 'Failed to purge data', 'error');
            }
        });
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
        background: isActive ? 'var(--primary-color)' : 'rgba(255, 255, 255, 0.03)',
        color: isActive ? 'white' : 'var(--color-text-secondary)',
        border: '1px solid',
        borderColor: isActive ? 'var(--primary-color)' : 'rgba(255, 255, 255, 0.08)',
        borderRadius: '10px',
        cursor: 'pointer',
        fontWeight: '600',
        fontSize: '0.9rem',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        backdropFilter: 'blur(10px)',
        whiteSpace: 'nowrap'
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

            <h1
                className="text-center mb-4 text-glow"
                style={{ color: 'white', userSelect: 'none', cursor: 'pointer' }}
                onClick={() => setTitleClickCount(prev => prev + 1)}
            >
                Admin Dashboard
            </h1>

            {/* Quick Actions */}
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                marginBottom: '2.5rem'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '16px',
                    padding: '0.5rem',
                    backdropFilter: 'blur(10px)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
                }}>
                    {/* AI Scan Button */}
                    <motion.button
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
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        style={{
                            background: isScanning
                                ? 'rgba(99, 102, 241, 0.15)'
                                : 'linear-gradient(135deg, #6366f1, #4f46e5)',
                            border: 'none',
                            padding: '0.85rem 1.75rem',
                            fontSize: '0.9rem',
                            color: 'white',
                            fontWeight: '600',
                            borderRadius: '12px',
                            letterSpacing: '0.5px',
                            boxShadow: isScanning ? 'none' : '0 4px 15px rgba(99, 102, 241, 0.35)',
                            opacity: isScanning ? 0.7 : 1,
                            cursor: isScanning ? 'wait' : 'pointer',
                            transition: 'all 0.3s ease',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.6rem',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        {isScanning ? (
                            <>
                                <span className="loading" style={{ width: '16px', height: '16px' }}></span>
                                Scanning...
                            </>
                        ) : (
                            <>
                                <span className="material-icons" style={{ fontSize: '18px' }}>auto_awesome</span>
                                Trigger AI Scan
                            </>
                        )}
                    </motion.button>

                    {/* Divider */}
                    <div style={{
                        width: '1px',
                        height: '36px',
                        background: 'rgba(255,255,255,0.12)',
                        margin: '0 0.5rem',
                        flexShrink: 0
                    }} />

                    {/* Auto-Approve Toggle */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.6rem 1.25rem',
                        borderRadius: '12px',
                        background: autoApproveEnabled ? 'rgba(34, 197, 94, 0.1)' : 'transparent',
                        transition: 'all 0.3s ease',
                        cursor: autoApproveLoading ? 'wait' : 'pointer',
                        opacity: autoApproveLoading ? 0.7 : 1,
                        userSelect: 'none',
                    }} onClick={!autoApproveLoading ? handleToggleAutoApprove : undefined}>
                        <span className="material-icons" style={{
                            color: autoApproveEnabled ? '#22c55e' : '#6b7280',
                            fontSize: '18px',
                            transition: 'color 0.3s'
                        }}>
                            schedule
                        </span>
                        <div>
                            <div style={{ color: 'white', fontWeight: '600', fontSize: '0.85rem', lineHeight: 1.2 }}>
                                Auto-Approve
                            </div>
                            <div style={{ color: autoApproveEnabled ? '#22c55e' : '#6b7280', fontSize: '0.72rem', transition: 'color 0.3s' }}>
                                {autoApproveEnabled ? 'Every 24h · ON' : 'Scheduled · OFF'}
                            </div>
                        </div>
                        {/* Toggle pill */}
                        <div style={{
                            width: '40px', height: '22px',
                            borderRadius: '11px',
                            background: autoApproveEnabled ? '#22c55e' : 'rgba(255,255,255,0.15)',
                            position: 'relative',
                            transition: 'background 0.3s ease',
                            flexShrink: 0
                        }}>
                            <div style={{
                                position: 'absolute',
                                top: '3px',
                                left: autoApproveEnabled ? '21px' : '3px',
                                width: '16px', height: '16px',
                                borderRadius: '50%',
                                background: 'white',
                                transition: 'left 0.3s ease',
                                boxShadow: '0 1px 4px rgba(0,0,0,0.3)'
                            }} />
                        </div>
                    </div>
                </div>
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
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                        <button
                            onClick={handleSelectionCycle}
                            style={{
                                padding: '0.75rem 1.5rem',
                                background: selectionStage === 0 ? 'var(--color-bg-card)' :
                                    selectionStage === 1 ? 'var(--primary-color)' :
                                        selectionStage === 2 ? '#6366f1' : // Indigo
                                            selectionStage === 3 ? '#10b981' : // Success Green
                                                '#f59e0b', // Warning Amber
                                color: 'white',
                                border: '1px solid var(--color-border)',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                fontWeight: '600',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                transition: 'all 0.3s ease',
                                boxShadow: selectionStage > 0 ? '0 4px 12px rgba(99, 102, 241, 0.2)' : 'none'
                            }}
                        >
                            <span className="material-icons">
                                {selectionStage === 0 ? 'filter_list' :
                                    selectionStage === 1 ? 'check_box_outline_blank' :
                                        selectionStage === 2 ? 'done_all' :
                                            selectionStage === 3 ? 'check_circle' : 'cancel'}
                            </span>
                            {selectionStage === 0 ? 'Select' :
                                selectionStage === 1 ? 'Select (Manual)' :
                                    selectionStage === 2 ? 'Select (All)' :
                                        selectionStage === 3 ? 'Select (Approved)' :
                                            selectionStage === 4 ? 'Select (Rejected)' : 'Select'}
                        </button>

                        <button
                            onClick={handleAutoApprove}
                            className="btn"
                            style={{
                                padding: '0.75rem 1.5rem',
                                background: 'linear-gradient(135deg, #10b981, #059669)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                fontWeight: '600',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                                transition: 'transform 0.2s ease'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        >
                            <span className="material-icons">fact_check</span>
                            Auto Approve Oldest 5
                        </button>
                    </div>
                    <h2 className="mb-3 text-white">Pending Hackathons ({pending.hackathons.length})</h2>
                    <div className="grid grid-3 mb-4">
                        {pending.hackathons
                            .filter(h => h.title.toLowerCase().includes(searchTerm.toLowerCase()) || h.organizer.toLowerCase().includes(searchTerm.toLowerCase()))
                            .map((hackathon) => (
                                <Card
                                    key={hackathon.id}
                                    onClick={() => {
                                        if (selectionStage > 0) {
                                            toggleSelection('hackathon', hackathon.id);
                                        } else {
                                            openModal(hackathon, 'hackathon');
                                        }
                                    }}
                                    style={{
                                        cursor: 'pointer',
                                        border: selectedItems.has(`hackathon-${hackathon.id}`) ? '2px solid var(--primary-color)' : '1px solid rgba(255,255,255,0.1)',
                                        transform: selectedItems.has(`hackathon-${hackathon.id}`) ? 'scale(1.02)' : 'scale(1)',
                                        transition: 'all 0.2s ease',
                                        opacity: selectionStage === 0 ? 1 : (selectedItems.has(`hackathon-${hackathon.id}`) ? 1 : 0.7)
                                    }}
                                >
                                    <div style={{ position: 'absolute', top: '1rem', right: '1rem', zIndex: 50 }}>
                                    </div>
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
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', width: '100%', position: 'relative', zIndex: 20, pointerEvents: 'auto' }}>
                                            <button onClick={(e) => { e.stopPropagation(); openModal(hackathon, 'hackathon'); }} className="btn btn-secondary" style={{ fontSize: '0.85rem', padding: '0.5rem', borderRadius: '8px', cursor: 'pointer' }}>View</button>
                                            <button onClick={(e) => { e.stopPropagation(); handleApprove('hackathon', hackathon.id); }} className="btn btn-success" style={{ fontSize: '0.85rem', padding: '0.5rem', borderRadius: '8px', cursor: 'pointer' }}>Approve</button>
                                            <button onClick={(e) => { e.stopPropagation(); handleReject('hackathon', hackathon.id); }} className="btn btn-danger" style={{ fontSize: '0.85rem', padding: '0.5rem', borderRadius: '8px', cursor: 'pointer' }}>Reject</button>
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
                                <Card
                                    key={internship.id}
                                    onClick={() => {
                                        if (selectionStage > 0) {
                                            toggleSelection('internship', internship.id);
                                        } else {
                                            openModal(internship, 'internship');
                                        }
                                    }}
                                    style={{
                                        cursor: 'pointer',
                                        border: selectedItems.has(`internship-${internship.id}`) ? '2px solid var(--primary-color)' : '1px solid rgba(255,255,255,0.1)',
                                        transform: selectedItems.has(`internship-${internship.id}`) ? 'scale(1.02)' : 'scale(1)',
                                        transition: 'all 0.2s ease',
                                        opacity: selectionStage === 0 ? 1 : (selectedItems.has(`internship-${internship.id}`) ? 1 : 0.7)
                                    }}
                                >
                                    <div style={{ position: 'absolute', top: '1rem', right: '1rem', zIndex: 50 }}>
                                    </div>
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
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', width: '100%', position: 'relative', zIndex: 20, pointerEvents: 'auto' }}>
                                            <button onClick={(e) => { e.stopPropagation(); openModal(internship, 'internship'); }} className="btn btn-secondary" style={{ fontSize: '0.85rem', padding: '0.5rem', borderRadius: '8px', cursor: 'pointer' }}>View</button>
                                            <button onClick={(e) => { e.stopPropagation(); handleApprove('internship', internship.id); }} className="btn btn-success" style={{ fontSize: '0.85rem', padding: '0.5rem', borderRadius: '8px', cursor: 'pointer' }}>Approve</button>
                                            <button onClick={(e) => { e.stopPropagation(); handleReject('internship', internship.id); }} className="btn btn-danger" style={{ fontSize: '0.85rem', padding: '0.5rem', borderRadius: '8px', cursor: 'pointer' }}>Reject</button>
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
                    {/* Collapsible Hackathons Section Header */}
                    <div
                        onClick={() => toggleSection('hackathons')}
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: collapsedSections.hackathons ? '1rem' : '0.75rem',
                            padding: '1rem 1.25rem',
                            background: 'rgba(99,102,241,0.08)',
                            border: '1px solid rgba(99,102,241,0.2)',
                            borderRadius: collapsedSections.hackathons ? '12px' : '12px 12px 0 0',
                            cursor: 'pointer',
                            userSelect: 'none',
                            transition: 'all 0.3s ease'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <span className="material-icons" style={{ color: '#6366f1', fontSize: '20px' }}>table_chart</span>
                            <h2 style={{ margin: 0, color: 'white', fontSize: '1.1rem', fontWeight: '700' }}>
                                Hackathons
                                <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem', color: '#6b7280', fontWeight: '400' }}>
                                    ({allOpportunities.hackathons.length})
                                </span>
                            </h2>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleSelectionCycle(); }}
                                style={{
                                    padding: '0.4rem 0.9rem',
                                    background: selectionStage === 0 ? 'rgba(255,255,255,0.08)' : 'var(--primary-color)',
                                    color: 'white', border: '1px solid rgba(255,255,255,0.15)',
                                    borderRadius: '8px', cursor: 'pointer', fontWeight: '600',
                                    fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem'
                                }}
                            >
                                <span className="material-icons" style={{ fontSize: '1rem' }}>
                                    {selectionStage === 0 ? 'filter_list' : selectionStage === 1 ? 'check_box_outline_blank' : selectionStage === 2 ? 'done_all' : selectionStage === 3 ? 'check_circle' : 'cancel'}
                                </span>
                                {selectionStage === 0 ? 'Select' : selectionStage === 1 ? 'Manual' : selectionStage === 2 ? 'All' : selectionStage === 3 ? 'Approved' : 'Rejected'}
                            </button>
                            <span className="material-icons" style={{
                                color: '#9ca3af', fontSize: '20px',
                                transform: collapsedSections.hackathons ? 'rotate(-90deg)' : 'rotate(0deg)',
                                transition: 'transform 0.3s ease'
                            }}>expand_more</span>
                        </div>
                    </div>
                    {!collapsedSections.hackathons && (
                        <div className="card mb-4" style={{ overflowX: 'auto', padding: '0', borderRadius: '0 0 12px 12px', borderTop: 'none' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr>
                                        <th style={tableHeaderStyle}>Title</th>
                                        <th style={tableHeaderStyle}>Organizer</th>
                                        <th style={tableHeaderStyle}>Status</th>
                                        <th style={tableHeaderStyle}>Created At</th>
                                        <th style={tableHeaderStyle}>
                                            Actions
                                            <button
                                                onClick={() => handlePurgeAll('hackathon')}
                                                style={{
                                                    marginLeft: '0.5rem',
                                                    background: 'none',
                                                    border: 'none',
                                                    color: '#ef4444',
                                                    cursor: 'pointer',
                                                    fontSize: '0.8rem',
                                                    textDecoration: 'underline'
                                                }}
                                            >
                                                Purge All
                                            </button>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {allOpportunities.hackathons
                                        .filter(h => h.title.toLowerCase().includes(searchTerm.toLowerCase()) || h.organizer.toLowerCase().includes(searchTerm.toLowerCase()))
                                        .map((hackathon) => (
                                            <tr
                                                key={hackathon.id}
                                                onClick={() => {
                                                    if (selectionStage > 0) {
                                                        toggleSelection('hackathon', hackathon.id);
                                                    }
                                                    // Table rows usually don't have "View" as default click action, but maybe they should?
                                                    // For now, only toggle valid in selection mode.
                                                }}
                                                style={{
                                                    ...tableCellStyle,
                                                    background: selectedItems.has(`hackathon-${hackathon.id}`) ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                                                    cursor: selectionStage > 0 ? 'pointer' : 'default',
                                                    transition: 'background 0.2s',
                                                    opacity: selectionStage === 0 ? 1 : (selectedItems.has(`hackathon-${hackathon.id}`) ? 1 : 0.7)
                                                }}
                                            >
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
                                                        <button onClick={(e) => { e.stopPropagation(); openModal(hackathon, 'hackathon'); }} className="btn btn-secondary" style={{ fontSize: '0.85rem', padding: '0.5rem 1rem', borderRadius: '8px' }}>View</button>
                                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteOpportunity('hackathon', hackathon.id); }} className="btn btn-danger" style={{ fontSize: '0.85rem', padding: '0.5rem 1rem', borderRadius: '8px' }}>Delete</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Collapsible Internships Section Header */}
            <div
                onClick={() => toggleSection('internships')}
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: collapsedSections.internships ? '1rem' : '0.75rem',
                    padding: '1rem 1.25rem',
                    background: 'rgba(16,185,129,0.08)',
                    border: '1px solid rgba(16,185,129,0.2)',
                    borderRadius: collapsedSections.internships ? '12px' : '12px 12px 0 0',
                    cursor: 'pointer',
                    userSelect: 'none',
                    transition: 'all 0.3s ease'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span className="material-icons" style={{ color: '#10b981', fontSize: '20px' }}>work</span>
                    <h2 style={{ margin: 0, color: 'white', fontSize: '1.1rem', fontWeight: '700' }}>
                        Internships
                        <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem', color: '#6b7280', fontWeight: '400' }}>
                            ({allOpportunities.internships.length})
                        </span>
                    </h2>
                </div>
                <span className="material-icons" style={{
                    color: '#9ca3af', fontSize: '20px',
                    transform: collapsedSections.internships ? 'rotate(-90deg)' : 'rotate(0deg)',
                    transition: 'transform 0.3s ease'
                }}>expand_more</span>
            </div>
            {
                !collapsedSections.internships && (
                    <div className="card" style={{ padding: '0', overflowX: 'auto', borderRadius: '0 0 12px 12px', borderTop: 'none' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr>
                                    <th style={tableHeaderStyle}>Title</th>
                                    <th style={tableHeaderStyle}>Company</th>
                                    <th style={tableHeaderStyle}>Status</th>
                                    <th style={tableHeaderStyle}>Created At</th>
                                    <th style={tableHeaderStyle}>
                                        Actions
                                        <button
                                            onClick={() => handlePurgeAll('internship')}
                                            style={{
                                                marginLeft: '0.5rem',
                                                background: 'none',
                                                border: 'none',
                                                color: '#ef4444',
                                                cursor: 'pointer',
                                                fontSize: '0.8rem',
                                                textDecoration: 'underline'
                                            }}
                                        >
                                            Purge All
                                        </button>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {allOpportunities.internships
                                    .filter(i => i.title.toLowerCase().includes(searchTerm.toLowerCase()) || i.company.toLowerCase().includes(searchTerm.toLowerCase()))
                                    .map((internship) => (
                                        <tr
                                            key={internship.id}
                                            onClick={() => {
                                                if (selectionStage > 0) {
                                                    toggleSelection('internship', internship.id);
                                                }
                                            }}
                                            style={{
                                                ...tableCellStyle,
                                                background: selectedItems.has(`internship-${internship.id}`) ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                                                cursor: selectionStage > 0 ? 'pointer' : 'default',
                                                transition: 'background 0.2s',
                                                opacity: selectionStage === 0 ? 1 : (selectedItems.has(`internship-${internship.id}`) ? 1 : 0.7)
                                            }}
                                        >
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
                                                    <button onClick={(e) => { e.stopPropagation(); openModal(internship, 'internship'); }} className="btn btn-secondary" style={{ fontSize: '0.85rem', padding: '0.5rem 1rem', borderRadius: '8px' }}>View</button>
                                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteOpportunity('internship', internship.id); }} className="btn btn-danger" style={{ fontSize: '0.85rem', padding: '0.5rem 1rem', borderRadius: '8px' }}>Delete</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                )}
        </div>
    )
}

{/* User Management Tab */ }
{
    activeTab === 'users' && (
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
    )
}

{/* Host Requests Tab */ }
{
    activeTab === 'hostRequests' && (
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
                                                style={{ fontSize: '0.85rem', padding: '0.6rem 1.2rem', borderRadius: '8px' }}
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
    )
}

{/* Modal */ }
{
    modalOpen && selectedItem && (
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
    )
}

{/* Bulk Action Bar */ }
<AnimatePresence>
    {selectedItems.size > 0 && (
        <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            style={{
                position: 'fixed',
                bottom: '2rem',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(15, 23, 42, 0.9)',
                backdropFilter: 'blur(10px)',
                padding: '1rem 2rem',
                borderRadius: '16px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                gap: '1.5rem',
                zIndex: 1000,
                border: '1px solid rgba(255,255,255,0.1)'
            }}
        >
            <span style={{ color: 'white', fontWeight: '600' }}>
                {selectedItems.size} selected
            </span>

            <div style={{ height: '24px', width: '1px', background: 'rgba(255,255,255,0.2)' }}></div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                    onClick={() => handleBulkAction('approve')}
                    className="btn btn-success"
                    style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                >
                    Approve Selected
                </button>
                <button
                    onClick={() => handleBulkAction('reject')}
                    className="btn btn-danger"
                    style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', background: '#eab308', borderColor: '#eab308', color: 'black' }}
                >
                    Reject Selected
                </button>
                <button
                    onClick={() => handleBulkAction('delete')}
                    className="btn btn-danger"
                    style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                >
                    Delete Selected
                </button>
            </div>

            <button
                onClick={() => {
                    setSelectedItems(new Set());
                    setSelectionStage(0);
                }}
                style={{
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255,255,255,0.6)',
                    cursor: 'pointer',
                    marginLeft: '0.5rem'
                }}
            >
                <span className="material-icons">close</span>
            </button>
        </motion.div>
    )}
</AnimatePresence>
        </div >
    );
}

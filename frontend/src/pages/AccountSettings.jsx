import { useState, useEffect } from 'react';
import { authAPI } from '../services/api';

export default function AccountSettings() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('profile');

    // Password change state
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' });

    // 2FA state
    const [twoFASetup, setTwoFASetup] = useState(null);
    const [twoFACode, setTwoFACode] = useState('');
    const [twoFALoading, setTwoFALoading] = useState(false);
    const [twoFAMessage, setTwoFAMessage] = useState({ type: '', text: '' });

    // Email verification state
    const [emailVerificationLoading, setEmailVerificationLoading] = useState(false);
    const [emailVerificationMessage, setEmailVerificationMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        fetchUser();
    }, []);

    const fetchUser = async () => {
        try {
            const response = await authAPI.getCurrentUser();
            setUser(response.data);
        } catch (err) {
            console.error('Failed to fetch user:', err);
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        setPasswordMessage({ type: '', text: '' });

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setPasswordMessage({ type: 'error', text: 'Passwords do not match' });
            return;
        }

        if (passwordData.newPassword.length < 6) {
            setPasswordMessage({ type: 'error', text: 'Password must be at least 6 characters' });
            return;
        }

        setPasswordLoading(true);
        try {
            await authAPI.changePassword(passwordData.currentPassword, passwordData.newPassword);
            setPasswordMessage({ type: 'success', text: 'Password changed successfully' });
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err) {
            setPasswordMessage({ type: 'error', text: err.response?.data?.error || 'Failed to change password' });
        } finally {
            setPasswordLoading(false);
        }
    };

    const handleResendVerification = async () => {
        setEmailVerificationLoading(true);
        setEmailVerificationMessage({ type: '', text: '' });

        try {
            await authAPI.resendVerification();
            setEmailVerificationMessage({ type: 'success', text: 'Verification email sent! Check your inbox.' });
        } catch (err) {
            setEmailVerificationMessage({ type: 'error', text: err.response?.data?.error || 'Failed to send verification email' });
        } finally {
            setEmailVerificationLoading(false);
        }
    };

    const handleSetup2FA = async () => {
        setTwoFALoading(true);
        setTwoFAMessage({ type: '', text: '' });

        try {
            const response = await authAPI.setup2FA();
            setTwoFASetup(response.data);
            setTwoFAMessage({ type: 'info', text: response.data.message });
        } catch (err) {
            setTwoFAMessage({ type: 'error', text: err.response?.data?.error || 'Failed to setup 2FA' });
        } finally {
            setTwoFALoading(false);
        }
    };

    const handleEnable2FA = async (e) => {
        e.preventDefault();
        setTwoFALoading(true);
        setTwoFAMessage({ type: '', text: '' });

        try {
            await authAPI.enable2FA(twoFACode);
            setTwoFAMessage({ type: 'success', text: '2FA enabled successfully!' });
            setTwoFASetup(null);
            setTwoFACode('');
            fetchUser(); // Refresh user data
        } catch (err) {
            setTwoFAMessage({ type: 'error', text: err.response?.data?.error || 'Invalid code' });
        } finally {
            setTwoFALoading(false);
        }
    };

    const handleDisable2FA = async (e) => {
        e.preventDefault();
        setTwoFALoading(true);
        setTwoFAMessage({ type: '', text: '' });

        try {
            await authAPI.disable2FA(twoFACode);
            setTwoFAMessage({ type: 'success', text: '2FA disabled successfully' });
            setTwoFACode('');
            fetchUser(); // Refresh user data
        } catch (err) {
            setTwoFAMessage({ type: 'error', text: err.response?.data?.error || 'Invalid code' });
        } finally {
            setTwoFALoading(false);
        }
    };

    if (loading) {
        return (
            <div className="container" style={{ paddingTop: '6rem', textAlign: 'center' }}>
                <div className="loading" style={{ width: '40px', height: '40px', margin: '0 auto' }}></div>
            </div>
        );
    }

    return (
        <div className="container" style={{ paddingTop: '6rem' }}>
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                <h1 style={{ marginBottom: '2rem' }}>Account Settings</h1>

                {/* Tab Navigation */}
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '2px solid var(--color-border)' }}>
                    {['profile', 'security', '2fa'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            style={{
                                background: 'none',
                                border: 'none',
                                padding: '0.75rem 1rem',
                                cursor: 'pointer',
                                color: activeTab === tab ? 'var(--primary-color)' : 'var(--color-text-secondary)',
                                borderBottom: activeTab === tab ? '2px solid var(--primary-color)' : '2px solid transparent',
                                fontWeight: activeTab === tab ? '600' : '400',
                                transition: 'all 0.3s ease'
                            }}
                        >
                            {tab === 'profile' ? 'Profile' : tab === 'security' ? 'Security' : '2FA'}
                        </button>
                    ))}
                </div>

                {/* Profile Tab */}
                {activeTab === 'profile' && (
                    <div className="card">
                        <div className="card-header">
                            <h2>Profile Information</h2>
                        </div>
                        <div className="card-body">
                            <div style={{ display: 'grid', gap: '1rem' }}>
                                <div>
                                    <label className="form-label">Username</label>
                                    <p style={{ margin: '0.5rem 0 0 0', color: 'var(--color-text)' }}>{user?.username}</p>
                                </div>
                                <div>
                                    <label className="form-label">Email</label>
                                    <p style={{ margin: '0.5rem 0 0 0', color: 'var(--color-text)' }}>{user?.email}</p>
                                    {!user?.email_verified && (
                                        <div style={{ marginTop: '0.5rem' }}>
                                            <span className="badge" style={{ background: 'var(--color-warning)', marginRight: '0.5rem' }}>Unverified</span>
                                            <button
                                                onClick={handleResendVerification}
                                                className="btn btn-secondary"
                                                style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}
                                                disabled={emailVerificationLoading}
                                            >
                                                {emailVerificationLoading ? 'Sending...' : 'Resend Verification'}
                                            </button>
                                            {emailVerificationMessage.text && (
                                                <div className={`alert alert-${emailVerificationMessage.type === 'success' ? 'success' : 'danger'}`} style={{ marginTop: '1rem' }}>
                                                    <span className="material-icons">{emailVerificationMessage.type === 'success' ? 'check_circle' : 'error'}</span>
                                                    <span>{emailVerificationMessage.text}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {user?.email_verified && (
                                        <span className="badge" style={{ background: 'var(--color-success)', marginTop: '0.5rem', display: 'inline-block' }}>Verified ✓</span>
                                    )}
                                </div>
                                <div>
                                    <label className="form-label">Role</label>
                                    <p style={{ margin: '0.5rem 0 0 0', color: 'var(--color-text)', textTransform: 'capitalize' }}>{user?.role}</p>
                                </div>
                                {user?.oauth_provider && (
                                    <div>
                                        <label className="form-label">Connected Account</label>
                                        <p style={{ margin: '0.5rem 0 0 0', color: 'var(--color-text)' }}>
                                            <span style={{ textTransform: 'capitalize' }}>{user.oauth_provider}</span> OAuth
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Security Tab */}
                {activeTab === 'security' && (
                    <div className="card">
                        <div className="card-header">
                            <h2>Change Password</h2>
                        </div>
                        <div className="card-body">
                            {passwordMessage.text && (
                                <div className={`alert alert-${passwordMessage.type === 'success' ? 'success' : 'danger'}`} style={{ marginBottom: '1.5rem' }}>
                                    <span className="material-icons">{passwordMessage.type === 'success' ? 'check_circle' : 'error'}</span>
                                    <span>{passwordMessage.text}</span>
                                </div>
                            )}

                            <form onSubmit={handlePasswordChange}>
                                <div className="form-group">
                                    <label className="form-label">Current Password</label>
                                    <input
                                        type="password"
                                        className="form-input"
                                        value={passwordData.currentPassword}
                                        onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">New Password</label>
                                    <input
                                        type="password"
                                        className="form-input"
                                        value={passwordData.newPassword}
                                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Confirm New Password</label>
                                    <input
                                        type="password"
                                        className="form-input"
                                        value={passwordData.confirmPassword}
                                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                        required
                                    />
                                </div>
                                <button type="submit" className="btn btn-primary" disabled={passwordLoading}>
                                    {passwordLoading ? <span className="loading"></span> : 'Change Password'}
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {/* 2FA Tab */}
                {activeTab === '2fa' && (
                    <div className="card">
                        <div className="card-header">
                            <h2>Two-Factor Authentication</h2>
                        </div>
                        <div className="card-body">
                            {twoFAMessage.text && (
                                <div className={`alert alert-${twoFAMessage.type === 'success' ? 'success' : twoFAMessage.type === 'info' ? 'info' : 'danger'}`} style={{ marginBottom: '1.5rem' }}>
                                    <span className="material-icons">
                                        {twoFAMessage.type === 'success' ? 'check_circle' : twoFAMessage.type === 'info' ? 'info' : 'error'}
                                    </span>
                                    <span>{twoFAMessage.text}</span>
                                </div>
                            )}

                            {!user?.two_factor_enabled && !twoFASetup && (
                                <div>
                                    <p style={{ marginBottom: '1.5rem' }}>
                                        Add an extra layer of security to your account with two-factor authentication.
                                    </p>
                                    <button onClick={handleSetup2FA} className="btn btn-primary" disabled={twoFALoading}>
                                        {twoFALoading ? <span className="loading"></span> : 'Enable 2FA'}
                                    </button>
                                </div>
                            )}

                            {!user?.two_factor_enabled && twoFASetup && (
                                <div>
                                    <p style={{ marginBottom: '1rem' }}>Scan this QR code with your authenticator app:</p>
                                    <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                                        <img src={twoFASetup.qr_code} alt="2FA QR Code" style={{ maxWidth: '250px', border: '1px solid var(--color-border)', borderRadius: '8px' }} />
                                    </div>
                                    <p style={{ marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                                        Or enter this secret manually: <code style={{ background: 'var(--color-background)', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>{twoFASetup.secret}</code>
                                    </p>

                                    <form onSubmit={handleEnable2FA} style={{ marginTop: '1.5rem' }}>
                                        <div className="form-group">
                                            <label className="form-label">Enter Verification Code</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                value={twoFACode}
                                                onChange={(e) => setTwoFACode(e.target.value)}
                                                placeholder="000000"
                                                maxLength="6"
                                                required
                                            />
                                        </div>
                                        <button type="submit" className="btn btn-primary" disabled={twoFALoading}>
                                            {twoFALoading ? <span className="loading"></span> : 'Verify and Enable'}
                                        </button>
                                    </form>
                                </div>
                            )}

                            {user?.two_factor_enabled && (
                                <div>
                                    <div className="alert alert-success" style={{ marginBottom: '1.5rem' }}>
                                        <span className="material-icons">verified_user</span>
                                        <span>Two-factor authentication is enabled on your account</span>
                                    </div>

                                    <form onSubmit={handleDisable2FA}>
                                        <div className="form-group">
                                            <label className="form-label">Enter Verification Code to Disable</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                value={twoFACode}
                                                onChange={(e) => setTwoFACode(e.target.value)}
                                                placeholder="000000"
                                                maxLength="6"
                                                required
                                            />
                                        </div>
                                        <button type="submit" className="btn btn-danger" disabled={twoFALoading}>
                                            {twoFALoading ? <span className="loading"></span> : 'Disable 2FA'}
                                        </button>
                                    </form>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

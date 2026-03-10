import { useState, useEffect, useRef } from 'react';
import { authAPI } from '../services/api';
import Popup from '../components/Popup';
import { motion } from 'framer-motion';
import { auth, RecaptchaVerifier, signInWithPhoneNumber } from '../firebase';

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

    // Resume state
    const [resumeText, setResumeText] = useState('');
    const [resumeLink, setResumeLink] = useState('');
    const [resumeLoading, setResumeLoading] = useState(false);

    // Phone verification state
    const [phoneNumber, setPhoneNumber] = useState('');
    const [phoneOtpCode, setPhoneOtpCode] = useState('');
    const [phoneStep, setPhoneStep] = useState('input'); // 'input' | 'otp'
    const [phoneLoading, setPhoneLoading] = useState(false);
    const [phoneMessage, setPhoneMessage] = useState({ type: '', text: '' });
    const [phoneConfirmation, setPhoneConfirmation] = useState(null);
    const phoneRecaptchaRef = useRef(null);
    const phoneRecaptchaVerifierRef = useRef(null);

    // Add email state (for phone users)
    const [newEmail, setNewEmail] = useState('');
    const [emailUpdateLoading, setEmailUpdateLoading] = useState(false);
    const [emailUpdateMessage, setEmailUpdateMessage] = useState({ type: '', text: '' });

    // Set password state (for phone/OAuth users without password)
    const [newPwdData, setNewPwdData] = useState({ newPassword: '', confirmPassword: '' });
    const [newPwdLoading, setNewPwdLoading] = useState(false);
    const [newPwdMessage, setNewPwdMessage] = useState({ type: '', text: '' });

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
        fetchUser();
    }, []);

    const fetchUser = async () => {
        try {
            const response = await authAPI.getCurrentUser();
            setUser(response.data);
            setResumeText(response.data.resume_text || '');
            setResumeLink(response.data.resume_link || '');
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

    const handleSaveResume = async () => {
        setResumeLoading(true);
        try {
            await authAPI.updateResume(resumeText, resumeLink);
            showPopup('Success', 'Resume updated successfully! AI Match Scores will now be more accurate.', 'success');
        } catch (err) {
            showPopup('Error', err.response?.data?.error || 'Failed to update resume', 'error');
        } finally {
            setResumeLoading(false);
        }
    };

    // Phone verification handlers
    const handleSendPhoneOTP = async (e) => {
        e.preventDefault();
        setPhoneLoading(true);
        setPhoneMessage({ type: '', text: '' });

        if (!auth) {
            setPhoneMessage({ type: 'error', text: 'Phone auth not configured.' });
            setPhoneLoading(false);
            return;
        }

        const formattedPhone = `+91${phoneNumber}`;
        try {
            if (phoneRecaptchaVerifierRef.current) {
                phoneRecaptchaVerifierRef.current.clear();
                phoneRecaptchaVerifierRef.current = null;
            }
            phoneRecaptchaVerifierRef.current = new RecaptchaVerifier(auth, 'phone-recaptcha-settings', {
                size: 'invisible',
                callback: () => { },
            });
            const result = await signInWithPhoneNumber(auth, formattedPhone, phoneRecaptchaVerifierRef.current);
            setPhoneConfirmation(result);
            setPhoneStep('otp');
            setPhoneMessage({ type: 'info', text: `OTP sent to ${formattedPhone}` });
        } catch (err) {
            setPhoneMessage({ type: 'error', text: err.message || 'Failed to send OTP' });
        } finally {
            setPhoneLoading(false);
        }
    };

    const handleVerifyPhoneOTP = async (e) => {
        e.preventDefault();
        setPhoneLoading(true);
        setPhoneMessage({ type: '', text: '' });
        try {
            const result = await phoneConfirmation.confirm(phoneOtpCode);
            const idToken = await result.user.getIdToken();
            // Send to backend to update user's phone number
            await authAPI.phoneLogin(idToken);
            setPhoneMessage({ type: 'success', text: 'Phone number verified and linked!' });
            setPhoneStep('input');
            setPhoneOtpCode('');
            fetchUser(); // Refresh user data
        } catch (err) {
            setPhoneMessage({ type: 'error', text: err.response?.data?.error || err.message || 'Verification failed' });
        } finally {
            setPhoneLoading(false);
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
            <Popup
                isOpen={popup.isOpen}
                onClose={closePopup}
                title={popup.title}
                message={popup.message}
                type={popup.type}
                onConfirm={popup.onConfirm}
            />
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                <h1 style={{ marginBottom: '2rem' }}>Account Settings</h1>

                {/* Tab Navigation */}
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '2px solid var(--color-border)' }}>
                    {['profile', 'resume', 'security', '2fa'].map(tab => (
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
                            {tab === 'profile' ? 'Profile' : tab === 'resume' ? 'Resume' : tab === 'security' ? 'Security' : '2FA'}
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
                                {/* Immutable Username */}
                                <div style={{ marginBottom: '0.5rem' }}>
                                    <label className="form-label">Username</label>
                                    <p style={{ margin: '0.25rem 0 1rem 0', color: 'var(--color-text-secondary)', fontWeight: '500' }}>
                                        @{user?.username}
                                    </p>
                                </div>

                                {/* Display Name Edit */}
                                <div>
                                    <label className="form-label">Display Name</label>
                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={user?.display_name ?? ''}
                                            onChange={(e) => setUser({ ...user, display_name: e.target.value })}
                                            placeholder={user?.username || "Enter your display name"}
                                        />
                                        <button
                                            className="btn btn-primary"
                                            onClick={async () => {
                                                try {
                                                    await authAPI.updateProfile({ display_name: user.display_name });
                                                    showPopup('Success', 'Display name updated successfully!', 'success');
                                                    // Update local storage
                                                    localStorage.setItem('user', JSON.stringify(user));
                                                } catch (err) {
                                                    showPopup('Error', err.response?.data?.error || 'Failed to update display name', 'error');
                                                }
                                            }}
                                        >
                                            Save
                                        </button>
                                    </div>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)', marginTop: '0.5rem' }}>
                                        This is how you will appear to other users.
                                    </p>
                                </div>

                                {/* Full Name Edit */}
                                <div>
                                    <label className="form-label">Full Name</label>
                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={user?.full_name || ''}
                                            onChange={(e) => setUser({ ...user, full_name: e.target.value })}
                                            placeholder="Enter your full name"
                                        />
                                        <button
                                            className="btn btn-primary"
                                            onClick={async () => {
                                                try {
                                                    await authAPI.updateProfile({ full_name: user.full_name });
                                                    showPopup('Success', 'Name updated successfully!', 'success');
                                                    // Update local storage
                                                    localStorage.setItem('user', JSON.stringify(user));
                                                } catch (err) {
                                                    showPopup('Error', err.response?.data?.error || 'Failed to update name', 'error');
                                                }
                                            }}
                                        >
                                            Save
                                        </button>
                                    </div>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)', marginTop: '0.5rem' }}>
                                        You can update your full name only 2 times per week.
                                    </p>
                                </div>

                                {/* Email */}
                                <div>
                                    <label className="form-label">Email</label>
                                    {user?.email?.includes('@phone.devalert.local') ? (
                                        <div style={{ marginTop: '0.5rem' }}>
                                            {emailUpdateMessage.text && (
                                                <div className={`alert alert-${emailUpdateMessage.type === 'success' ? 'success' : 'danger'}`} style={{ marginBottom: '0.75rem' }}>
                                                    <span className="material-icons" style={{ fontSize: '1rem' }}>{emailUpdateMessage.type === 'success' ? 'check_circle' : 'error'}</span>
                                                    <span>{emailUpdateMessage.text}</span>
                                                </div>
                                            )}
                                            <form onSubmit={async (e) => {
                                                e.preventDefault();
                                                setEmailUpdateLoading(true);
                                                setEmailUpdateMessage({ type: '', text: '' });
                                                try {
                                                    const response = await authAPI.updateEmail(newEmail);
                                                    setUser(response.data.user);
                                                    localStorage.setItem('user', JSON.stringify(response.data.user));
                                                    setEmailUpdateMessage({ type: 'success', text: 'Email added! Verification email sent.' });
                                                    setNewEmail('');
                                                } catch (err) {
                                                    setEmailUpdateMessage({ type: 'error', text: err.response?.data?.error || 'Failed to update email' });
                                                } finally {
                                                    setEmailUpdateLoading(false);
                                                }
                                            }}>
                                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                    <input type="email" className="form-input" style={{ flex: 1 }}
                                                        value={newEmail}
                                                        onChange={(e) => setNewEmail(e.target.value)}
                                                        placeholder="Enter your email address" required />
                                                    <button type="submit" className="btn btn-primary"
                                                        style={{ padding: '0.55rem 1rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                                                        disabled={emailUpdateLoading || !newEmail.includes('@')}>
                                                        {emailUpdateLoading ? 'Saving...' : 'Add Email'}
                                                    </button>
                                                </div>
                                                <p style={{ fontSize: '0.78rem', color: 'var(--color-text-tertiary)', marginTop: '0.4rem' }}>
                                                    A verification link will be sent to this address.
                                                </p>
                                            </form>
                                        </div>
                                    ) : (
                                        <>
                                            <p style={{ margin: '0.5rem 0 0 0', color: 'var(--color-text)' }}>{user?.email}</p>
                                            {!user?.email_verified && (
                                                <div style={{ marginTop: '0.5rem' }}>
                                                    <span className="badge" style={{ background: 'var(--color-warning)', color: '#000', marginRight: '0.5rem' }}>Unverified</span>
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
                                                <span className="badge" style={{ background: 'var(--color-success)', color: '#fff', marginTop: '0.5rem', display: 'inline-block' }}>Verified ✓</span>
                                            )}
                                        </>
                                    )}
                                </div>

                                {/* Phone Number */}
                                <div>
                                    <label className="form-label">Phone Number</label>
                                    {phoneMessage.text && (
                                        <div className={`alert alert-${phoneMessage.type === 'success' ? 'success' : phoneMessage.type === 'info' ? 'info' : 'danger'}`} style={{ marginBottom: '0.75rem', marginTop: '0.5rem' }}>
                                            <span className="material-icons" style={{ fontSize: '1rem' }}>{phoneMessage.type === 'success' ? 'check_circle' : phoneMessage.type === 'info' ? 'info' : 'error'}</span>
                                            <span>{phoneMessage.text}</span>
                                        </div>
                                    )}
                                    {user?.phone_number ? (
                                        <div style={{ marginTop: '0.5rem' }}>
                                            <p style={{ margin: '0', color: 'var(--color-text)' }}>{user.phone_number}</p>
                                            <span className="badge" style={{ background: 'var(--color-success)', color: '#fff', marginTop: '0.5rem', display: 'inline-block' }}>Verified ✓</span>
                                        </div>
                                    ) : (
                                        <div style={{ marginTop: '0.5rem' }}>
                                            {phoneStep === 'input' && (
                                                <form onSubmit={handleSendPhoneOTP} style={{ marginTop: '0.25rem' }}>
                                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                        <span style={{
                                                            padding: '0.55rem 0.65rem',
                                                            background: 'rgba(255,255,255,0.05)',
                                                            border: '1px solid rgba(255,255,255,0.1)',
                                                            borderRadius: 'var(--radius-md)',
                                                            color: 'var(--color-text-secondary)',
                                                            fontSize: '0.85rem',
                                                        }}>+91</span>
                                                        <input type="tel" className="form-input" style={{ flex: 1 }}
                                                            value={phoneNumber}
                                                            onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9]/g, ''))}
                                                            placeholder="10-digit number" maxLength="10" required />
                                                        <button type="submit" className="btn btn-primary"
                                                            style={{ padding: '0.55rem 1rem', fontSize: '0.85rem' }}
                                                            disabled={phoneLoading || phoneNumber.length < 10}>
                                                            {phoneLoading ? <span className="loading"></span> : 'Verify'}
                                                        </button>
                                                    </div>
                                                </form>
                                            )}
                                            {phoneStep === 'otp' && (
                                                <form onSubmit={handleVerifyPhoneOTP} style={{ marginTop: '0.25rem' }}>
                                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                        <input type="text" className="form-input"
                                                            style={{ flex: 1, textAlign: 'center', fontSize: '1.1rem', letterSpacing: '0.3rem' }}
                                                            value={phoneOtpCode}
                                                            onChange={(e) => setPhoneOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                                                            placeholder="Enter OTP" maxLength="6" required autoFocus />
                                                        <button type="submit" className="btn btn-primary"
                                                            style={{ padding: '0.55rem 1rem', fontSize: '0.85rem' }}
                                                            disabled={phoneLoading || phoneOtpCode.length < 6}>
                                                            {phoneLoading ? <span className="loading"></span> : 'Confirm'}
                                                        </button>
                                                        <button type="button" className="btn btn-secondary"
                                                            style={{ padding: '0.55rem 0.75rem', fontSize: '0.85rem' }}
                                                            onClick={() => { setPhoneStep('input'); setPhoneOtpCode(''); setPhoneMessage({ type: '', text: '' }); }}>
                                                            ✕
                                                        </button>
                                                    </div>
                                                    <p style={{ fontSize: '0.78rem', color: 'var(--color-text-tertiary)', marginTop: '0.4rem' }}>
                                                        Code sent to +91{phoneNumber}
                                                    </p>
                                                </form>
                                            )}
                                        </div>
                                    )}
                                    <div id="phone-recaptcha-settings" ref={phoneRecaptchaRef}></div>
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


                {/* Resume Tab */}
                {activeTab === 'resume' && (
                    <div className="card">
                        <div className="card-header">
                            <h2>AI Resume Management</h2>
                        </div>
                        <div className="card-body">
                            <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                                Paste your resume or a summary of your skills and experience.
                                Our AI uses this to calculate how well you match with internships and hackathons in your tracker.
                            </p>
                            <div className="form-group">
                                <label className="form-label">Resume Text</label>
                                <textarea
                                    className="form-input"
                                    style={{ minHeight: '300px', resize: 'vertical', fontFamily: 'inherit', lineHeight: '1.5', fontSize: '0.9rem' }}
                                    value={resumeText}
                                    onChange={(e) => setResumeText(e.target.value)}
                                    placeholder="Paste your full resume here (Contact Info, Experience, Education, Skills)..."
                                />
                            </div>
                            <div className="form-group" style={{ marginTop: '1.5rem' }}>
                                <label className="form-label">Resume Link (Public URL)</label>
                                <input
                                    type="url"
                                    className="form-input"
                                    value={resumeLink}
                                    onChange={(e) => setResumeLink(e.target.value)}
                                    placeholder="https://drive.google.com/your-resume.pdf"
                                />
                                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)', marginTop: '0.5rem' }}>
                                    Provide a public link to your resume (Drive, Dropbox, Personal Website).
                                    Our AI will attempt to read this link for match analysis.
                                </p>
                            </div>
                            <button
                                className="btn btn-primary"
                                onClick={handleSaveResume}
                                disabled={resumeLoading}
                                style={{ marginTop: '1rem' }}
                            >
                                {resumeLoading ? <span className="loading"></span> : 'Save Resume'}
                            </button>
                            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)', marginTop: '1rem' }}>
                                <span className="material-icons" style={{ fontSize: '1rem', verticalAlign: 'middle', marginRight: '4px' }}>lock</span>
                                Your resume data is stored securely and only used for match score calculations.
                            </p>
                        </div>
                    </div>
                )}

                {/* Security Tab */}
                {activeTab === 'security' && (
                    <div className="card">
                        <div className="card-header">
                            <h2>{!user?.has_password ? 'Set Password' : 'Change Password'}</h2>
                        </div>
                        <div className="card-body">
                            {/* Set Password (phone/OAuth users without password) */}
                            {!user?.has_password ? (
                                <>
                                    <div className="alert alert-info" style={{ marginBottom: '1.25rem' }}>
                                        <span className="material-icons" style={{ fontSize: '1rem' }}>info</span>
                                        <span>You signed in via phone/OAuth and don't have a password yet. Set one to enable email + password login.</span>
                                    </div>
                                    {newPwdMessage.text && (
                                        <div className={`alert alert-${newPwdMessage.type === 'success' ? 'success' : 'danger'}`} style={{ marginBottom: '1.25rem' }}>
                                            <span className="material-icons">{newPwdMessage.type === 'success' ? 'check_circle' : 'error'}</span>
                                            <span>{newPwdMessage.text}</span>
                                        </div>
                                    )}
                                    <form onSubmit={async (e) => {
                                        e.preventDefault();
                                        if (newPwdData.newPassword !== newPwdData.confirmPassword) {
                                            setNewPwdMessage({ type: 'error', text: 'Passwords do not match' });
                                            return;
                                        }
                                        if (newPwdData.newPassword.length < 6) {
                                            setNewPwdMessage({ type: 'error', text: 'Password must be at least 6 characters' });
                                            return;
                                        }
                                        setNewPwdLoading(true);
                                        setNewPwdMessage({ type: '', text: '' });
                                        try {
                                            await authAPI.setPassword(newPwdData.newPassword);
                                            setNewPwdMessage({ type: 'success', text: 'Password set successfully! You can now sign in with email + password.' });
                                            setNewPwdData({ newPassword: '', confirmPassword: '' });
                                            // Refresh user data so the UI switches to change-password mode
                                            const res = await authAPI.getCurrentUser();
                                            setUser(res.data);
                                            localStorage.setItem('user', JSON.stringify(res.data));
                                        } catch (err) {
                                            setNewPwdMessage({ type: 'error', text: err.response?.data?.error || 'Failed to set password' });
                                        } finally {
                                            setNewPwdLoading(false);
                                        }
                                    }}>
                                        <div className="form-group">
                                            <label className="form-label">New Password</label>
                                            <input type="password" className="form-input"
                                                value={newPwdData.newPassword}
                                                onChange={(e) => setNewPwdData({ ...newPwdData, newPassword: e.target.value })}
                                                placeholder="Min. 6 characters" required />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Confirm Password</label>
                                            <input type="password" className="form-input"
                                                value={newPwdData.confirmPassword}
                                                onChange={(e) => setNewPwdData({ ...newPwdData, confirmPassword: e.target.value })}
                                                required />
                                        </div>
                                        <button type="submit" className="btn btn-primary" disabled={newPwdLoading}>
                                            {newPwdLoading ? 'Setting...' : 'Set Password'}
                                        </button>
                                    </form>
                                </>
                            ) : (
                                /* Change Password (users who already have a password) */
                                <>
                                    {passwordMessage.text && (
                                        <div className={`alert alert-${passwordMessage.type === 'success' ? 'success' : 'danger'}`} style={{ marginBottom: '1.5rem' }}>
                                            <span className="material-icons">{passwordMessage.type === 'success' ? 'check_circle' : 'error'}</span>
                                            <span>{passwordMessage.text}</span>
                                        </div>
                                    )}
                                    <form onSubmit={handlePasswordChange}>
                                        <div className="form-group">
                                            <label className="form-label">Current Password</label>
                                            <input type="password" className="form-input"
                                                value={passwordData.currentPassword}
                                                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                                required />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">New Password</label>
                                            <input type="password" className="form-input"
                                                value={passwordData.newPassword}
                                                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                                required />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Confirm New Password</label>
                                            <input type="password" className="form-input"
                                                value={passwordData.confirmPassword}
                                                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                                required />
                                        </div>
                                        <button type="submit" className="btn btn-primary" disabled={passwordLoading}>
                                            {passwordLoading ? 'Changing...' : 'Change Password'}
                                        </button>
                                    </form>
                                </>
                            )}
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

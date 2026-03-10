import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { authAPI } from '../services/api';
import { auth, RecaptchaVerifier, signInWithPhoneNumber } from '../firebase';

export default function Login() {
    const navigate = useNavigate();
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // 2FA State
    const [requires2FA, setRequires2FA] = useState(false);
    const [twoFACode, setTwoFACode] = useState('');
    const [tempUser, setTempUser] = useState(null);

    // Phone Auth State
    const [phoneStep, setPhoneStep] = useState('input'); // 'input' | 'otp' | 'profile'
    const [showPhoneAuth, setShowPhoneAuth] = useState(false);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const [confirmationResult, setConfirmationResult] = useState(null);
    const [firebaseIdToken, setFirebaseIdToken] = useState(null);
    const [phoneName, setPhoneName] = useState('');
    const [phoneUsername, setPhoneUsername] = useState('');
    const recaptchaContainerRef = useRef(null);
    const recaptchaVerifierRef = useRef(null);

    useEffect(() => {
        const handleOAuthMessage = (event) => {
            if (event.origin !== window.location.origin) return;
            if (event.data.type === 'oauth_success') {
                const { token, user } = event.data;
                localStorage.setItem('token', token);
                localStorage.setItem('user', JSON.stringify(user));
                navigate('/');
            } else if (event.data.type === 'oauth_error') {
                setError(event.data.error || 'OAuth login failed');
                setLoading(false);
            }
        };
        window.addEventListener('message', handleOAuthMessage);
        return () => window.removeEventListener('message', handleOAuthMessage);
    }, [navigate]);

    const [formData, setFormData] = useState({
        username: '', email: '', password: '',
        role: 'participant', organization: '', designation: ''
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
    };

    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const response = await authAPI.login({
                username: formData.username,
                password: formData.password
            });
            if (response.data.requires_2fa) {
                setRequires2FA(true);
                setTempUser({ username: formData.username, password: formData.password });
                setLoading(false);
                return;
            }
            localStorage.setItem('token', response.data.access_token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.error || 'Invalid credentials');
            setLoading(false);
        }
    };

    const handle2FASubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const response = await authAPI.login({
                username: tempUser.username,
                password: tempUser.password,
                two_fa_code: twoFACode
            });
            localStorage.setItem('token', response.data.access_token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.error || 'Invalid 2FA code');
            setLoading(false);
        }
    };

    const handleRegisterSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const response = await authAPI.register(formData);
            localStorage.setItem('token', response.data.access_token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.error || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    // Phone Auth - cleanup on unmount
    useEffect(() => {
        return () => {
            if (recaptchaVerifierRef.current) {
                try { recaptchaVerifierRef.current.clear(); } catch (e) { /* ignore */ }
                recaptchaVerifierRef.current = null;
            }
        };
    }, []);

    const handleSendOTP = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        if (!auth) {
            setError('Phone auth not configured.');
            setLoading(false);
            return;
        }
        try {
            // Clear previous verifier if any
            if (recaptchaVerifierRef.current) {
                try { recaptchaVerifierRef.current.clear(); } catch (e) { /* ignore */ }
                recaptchaVerifierRef.current = null;
            }

            // Create fresh verifier each time
            recaptchaVerifierRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
                size: 'invisible',
                callback: () => { },
                'expired-callback': () => setError('reCAPTCHA expired. Try again.')
            });

            // Race between signInWithPhoneNumber and a 15s timeout
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('OTP request timed out. Please check your Firebase authorized domains include "localhost" and try again.')), 15000)
            );
            const result = await Promise.race([
                signInWithPhoneNumber(auth, `+91${phoneNumber}`, recaptchaVerifierRef.current),
                timeoutPromise
            ]);
            setConfirmationResult(result);
            setPhoneStep('otp');
        } catch (err) {
            console.error('Send OTP error:', err);
            if (err.code === 'auth/invalid-phone-number') setError('Invalid phone number.');
            else if (err.code === 'auth/too-many-requests') setError('Too many requests. Try again later.');
            else if (err.code === 'auth/invalid-app-credential') setError('Firebase Phone Auth not configured. Enable Identity Toolkit API in Google Cloud Console.');
            else if (err.code === 'auth/captcha-check-failed') setError('Add "localhost" in Firebase Console → Auth → Settings → Authorized domains.');
            else setError(err.message || 'Failed to send OTP.');
            // Clean up failed verifier
            if (recaptchaVerifierRef.current) {
                try { recaptchaVerifierRef.current.clear(); } catch (e) { /* ignore */ }
                recaptchaVerifierRef.current = null;
            }
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const result = await confirmationResult.confirm(otpCode);
            const idToken = await result.user.getIdToken();

            // Try logging in directly — backend will succeed if user already exists
            try {
                const response = await authAPI.phoneLogin(idToken);
                localStorage.setItem('token', response.data.access_token);
                localStorage.setItem('user', JSON.stringify(response.data.user));
                navigate('/');
                return; // Existing user — logged in, done!
            } catch (backendErr) {
                // User doesn't exist yet — show profile form
                if (backendErr.response?.status === 404 ||
                    backendErr.response?.data?.needs_profile) {
                    setFirebaseIdToken(idToken);
                    setPhoneStep('profile');
                } else {
                    // Some other backend error
                    setError(backendErr.response?.data?.error || 'Phone sign-in failed.');
                }
            }
        } catch (err) {
            if (err.code === 'auth/invalid-verification-code') setError('Invalid OTP code.');
            else setError(err.message || 'OTP verification failed.');
        } finally {
            setLoading(false);
        }
    };

    const handlePhoneSignIn = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const response = await authAPI.phoneLogin(firebaseIdToken, phoneName, phoneUsername);
            localStorage.setItem('token', response.data.access_token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.error || 'Phone sign-in failed.');
            setLoading(false);
        }
    };

    const resetPhoneAuth = () => {
        setShowPhoneAuth(false);
        setPhoneStep('input');
        setOtpCode('');
        setPhoneNumber('');
        setPhoneName('');
        setPhoneUsername('');
        setConfirmationResult(null);
        setFirebaseIdToken(null);
        setError('');
        if (recaptchaVerifierRef.current) {
            recaptchaVerifierRef.current.clear();
            recaptchaVerifierRef.current = null;
        }
    };

    // ── Styles ──
    const pageStyle = {
        display: 'flex',
        minHeight: 'calc(100vh - 120px)',
        alignItems: 'center',
        padding: '2rem 0',
    };

    const leftStyle = {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '3rem',
    };

    const rightStyle = {
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '2rem',
    };

    // ── Brand panel heading text ──
    let brandLabel, brandHeading, brandDesc;
    if (showPhoneAuth) {
        brandLabel = 'Phone Verification';
        brandHeading = <>Sign in with<br /><span style={{ color: 'var(--primary-color)' }}>your phone</span></>;
        brandDesc = 'Quick and secure — verify your phone number to access your DevAlert dashboard instantly.';
    } else if (isLogin) {
        brandLabel = 'Welcome Back';
        brandHeading = <>Never miss a<br /><span style={{ color: 'var(--primary-color)' }}>deadline</span> again.</>;
        brandDesc = 'DevAlert tracks hackathons, internships, and dev events across the web — so you can focus on building, not searching.';
    } else {
        brandLabel = 'Join Us';
        brandHeading = <>Start tracking<br /><span style={{ color: 'var(--primary-color)' }}>opportunities</span>.</>;
        brandDesc = 'DevAlert tracks hackathons, internships, and dev events across the web — so you can focus on building, not searching.';
    }

    // ── Phone card title ──
    let phoneTitle = 'Enter Phone Number';
    if (phoneStep === 'otp') phoneTitle = 'Verify OTP';
    if (phoneStep === 'profile') phoneTitle = 'Complete Your Profile';

    // ── Main Layout ──
    return (
        <div className="container" style={{ maxWidth: '1100px', perspective: '1200px' }}>
            <div style={pageStyle}>
                {/* Left: Branding */}
                <motion.div
                    initial={{ opacity: 0, x: -60, rotateY: 15 }}
                    animate={{ opacity: 1, x: 0, rotateY: 0 }}
                    transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                    style={{ flex: 1, transformStyle: 'preserve-3d' }}
                >
                    <div style={leftStyle}>
                        <p style={{
                            textTransform: 'uppercase', letterSpacing: '3px',
                            color: 'var(--primary-color)', fontSize: '0.8rem',
                            fontWeight: '600', marginBottom: '1.25rem',
                        }}>{brandLabel}</p>
                        <h1 style={{
                            fontSize: 'clamp(2rem, 4vw, 3.2rem)', fontWeight: '700',
                            lineHeight: '1.15', marginBottom: '1.5rem',
                            color: 'var(--color-text-primary)',
                        }}>{brandHeading}</h1>
                        <p style={{
                            color: 'var(--color-text-tertiary)', fontSize: '1.05rem',
                            lineHeight: '1.7', maxWidth: '480px', marginBottom: '2rem',
                        }}>{brandDesc}</p>
                        <div style={{ display: 'flex', gap: '2rem', color: 'var(--color-text-tertiary)', fontSize: '0.85rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span className="material-icons" style={{ fontSize: '1.1rem', color: 'var(--color-success)' }}>check_circle</span>
                                AI-powered matching
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span className="material-icons" style={{ fontSize: '1.1rem', color: 'var(--color-success)' }}>check_circle</span>
                                Real-time alerts
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Right: Auth Card */}
                <motion.div
                    initial={{ opacity: 0, x: 60, rotateY: -10, scale: 0.92 }}
                    animate={{ opacity: 1, x: 0, rotateY: 0, scale: 1 }}
                    transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
                    style={{ ...rightStyle, transformStyle: 'preserve-3d' }}
                >
                    {/* ========== PHONE AUTH CARD ========== */}
                    {showPhoneAuth ? (
                        <div className="card" style={{ width: '100%', maxWidth: '420px' }}>
                            <div className="card-header" style={{ textAlign: 'center', borderBottom: 'none', paddingBottom: 0 }}>
                                <h2 style={{ marginBottom: 0, fontSize: '1.3rem' }}>{phoneTitle}</h2>
                            </div>
                            <div className="card-body" style={{ paddingTop: '1.25rem' }}>
                                {error && (
                                    <div className="alert alert-danger" style={{ marginBottom: '1.25rem' }}>
                                        <span className="material-icons" style={{ fontSize: '1.1rem' }}>error</span>
                                        <span>{error}</span>
                                    </div>
                                )}

                                {/* Step 1: Phone input */}
                                {phoneStep === 'input' && (
                                    <form onSubmit={handleSendOTP}>
                                        <div className="form-group">
                                            <label className="form-label">Phone Number</label>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <span style={{
                                                    padding: '0.6rem 0.7rem', background: 'rgba(255,255,255,0.05)',
                                                    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--radius-md)',
                                                    color: 'var(--color-text-secondary)', fontSize: '0.875rem',
                                                    display: 'flex', alignItems: 'center',
                                                }}>+91</span>
                                                <input type="tel" className="form-input" style={{ flex: 1 }}
                                                    value={phoneNumber}
                                                    onChange={(e) => { setPhoneNumber(e.target.value.replace(/[^0-9]/g, '')); setError(''); }}
                                                    placeholder="10-digit mobile number"
                                                    maxLength="10" required autoFocus />
                                            </div>
                                            <p style={{ fontSize: '0.78rem', color: 'var(--color-text-tertiary)', marginTop: '0.5rem' }}>
                                                We'll send a 6-digit code via SMS.
                                            </p>
                                        </div>
                                        <button type="submit" className="btn btn-primary" style={{ width: '100%' }}
                                            disabled={loading || phoneNumber.length < 10}>
                                            {loading ? 'Sending...' : 'Send OTP'}
                                        </button>
                                    </form>
                                )}

                                {/* Step 2: OTP verification */}
                                {phoneStep === 'otp' && (
                                    <form onSubmit={handleVerifyOTP}>
                                        <div className="form-group">
                                            <label className="form-label">Enter 6-digit OTP</label>
                                            <input type="text" className="form-input"
                                                style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem', fontWeight: '600' }}
                                                value={otpCode}
                                                onChange={(e) => { setOtpCode(e.target.value.replace(/[^0-9]/g, '')); setError(''); }}
                                                placeholder="••••••" maxLength="6" required autoFocus />
                                            <p style={{ fontSize: '0.78rem', color: 'var(--color-text-tertiary)', marginTop: '0.5rem' }}>
                                                Code sent to +91 {phoneNumber}
                                            </p>
                                        </div>
                                        <button type="submit" className="btn btn-primary" style={{ width: '100%' }}
                                            disabled={loading || otpCode.length < 6}>
                                            {loading ? 'Verifying...' : 'Verify OTP'}
                                        </button>
                                    </form>
                                )}

                                {/* Step 3: Profile setup (only for new users) */}
                                {phoneStep === 'profile' && (
                                    <form onSubmit={handlePhoneSignIn}>
                                        <div className="alert alert-success" style={{ marginBottom: '1.25rem' }}>
                                            <span className="material-icons">check_circle</span>
                                            <span>Phone verified! Complete your profile.</span>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Full Name</label>
                                            <input type="text" className="form-input" id="phone-fullname"
                                                value={phoneName} onChange={(e) => setPhoneName(e.target.value)}
                                                placeholder="Enter your full name" required />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Username</label>
                                            <input type="text" className="form-input" id="phone-username"
                                                value={phoneUsername}
                                                onChange={(e) => setPhoneUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase())}
                                                placeholder="Choose a username" required />
                                            <p style={{ fontSize: '0.78rem', color: 'var(--color-text-tertiary)', marginTop: '0.4rem' }}>
                                                Letters, numbers and underscores only.
                                            </p>
                                        </div>
                                        <button type="submit" className="btn btn-primary" style={{ width: '100%' }}
                                            disabled={loading || !phoneName.trim() || !phoneUsername.trim()}>
                                            {loading ? 'Signing in...' : 'Complete Sign In'}
                                        </button>
                                    </form>
                                )}

                                <button type="button" className="btn btn-secondary" style={{ width: '100%', marginTop: '0.75rem' }}
                                    onClick={resetPhoneAuth}>
                                    <span className="material-icons" style={{ fontSize: '1rem', verticalAlign: 'middle', marginRight: '4px' }}>arrow_back</span>
                                    Back to Login
                                </button>
                            </div>
                        </div>

                    ) : (

                        /* ========== MAIN LOGIN/REGISTER CARD ========== */
                        <div className="card" style={{ width: '100%', maxWidth: '420px' }}>
                            <div className="card-header" style={{ textAlign: 'center', borderBottom: 'none', paddingBottom: 0 }}>
                                <h2 style={{ marginBottom: 0, fontSize: '1.3rem' }}>
                                    {requires2FA ? 'Two-Factor Auth' : (isLogin ? 'Sign In' : 'Create Account')}
                                </h2>
                            </div>

                            <div className="card-body" style={{ paddingTop: '1.25rem' }}>
                                {error && (
                                    <div className="alert alert-danger" style={{ marginBottom: '1.25rem' }}>
                                        <span className="material-icons" style={{ fontSize: '1.1rem' }}>error</span>
                                        <span>{error}</span>
                                    </div>
                                )}

                                {requires2FA ? (
                                    <form onSubmit={handle2FASubmit}>
                                        <div className="form-group">
                                            <label className="form-label">Authentication Code</label>
                                            <input type="text" className="form-input"
                                                style={{ textAlign: 'center', fontSize: '1.4rem', letterSpacing: '0.4rem' }}
                                                value={twoFACode} onChange={(e) => setTwoFACode(e.target.value)}
                                                placeholder="000000" maxLength="6" required autoFocus />
                                            <p style={{ fontSize: '0.78rem', color: 'var(--color-text-tertiary)', marginTop: '0.5rem' }}>
                                                Open your authenticator app for the code.
                                            </p>
                                        </div>
                                        <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                                            {loading ? 'Verifying...' : 'Verify'}
                                        </button>
                                        <button type="button" className="btn btn-secondary" style={{ width: '100%', marginTop: '0.75rem' }}
                                            onClick={() => { setRequires2FA(false); setTwoFACode(''); setError(''); }}>
                                            Cancel
                                        </button>
                                    </form>
                                ) : (
                                    <form onSubmit={isLogin ? handleLoginSubmit : handleRegisterSubmit}>
                                        {isLogin ? (
                                            <>
                                                <div className="form-group">
                                                    <label className="form-label">Email or Username</label>
                                                    <input type="text" name="username" className="form-input"
                                                        value={formData.username} onChange={handleChange}
                                                        autoComplete="username"
                                                        required placeholder="Enter your email or username" />
                                                </div>
                                                <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                                                    <label className="form-label">Password</label>
                                                    <input type="password" name="password" className="form-input"
                                                        autoComplete="current-password"
                                                        value={formData.password} onChange={handleChange} required />
                                                </div>
                                                <div style={{ textAlign: 'right', marginBottom: '1.5rem' }}>
                                                    <button type="button" onClick={() => navigate('/forgot-password')}
                                                        style={{
                                                            background: 'none', border: 'none',
                                                            color: 'var(--color-text-tertiary)', fontSize: '0.8rem', cursor: 'pointer',
                                                        }}>
                                                        Forgot Password?
                                                    </button>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="form-group">
                                                    <label className="form-label">Username</label>
                                                    <input type="text" name="username" className="form-input"
                                                        autoComplete="username"
                                                        value={formData.username} onChange={handleChange} required />
                                                </div>
                                                <div className="form-group">
                                                    <label className="form-label">Email</label>
                                                    <input type="email" name="email" className="form-input"
                                                        autoComplete="email"
                                                        value={formData.email} onChange={handleChange} required />
                                                </div>
                                                <div className="form-group">
                                                    <label className="form-label">Password</label>
                                                    <input type="password" name="password" className="form-input"
                                                        autoComplete="new-password"
                                                        value={formData.password} onChange={handleChange} required />
                                                </div>
                                                <div className="form-group">
                                                    <label className="form-label">Account Type</label>
                                                    <select name="role" className="form-select"
                                                        value={formData.role} onChange={handleChange}>
                                                        <option value="participant">Participant</option>
                                                        <option value="hoster">Hoster</option>
                                                    </select>
                                                </div>
                                                {formData.role === 'hoster' && (
                                                    <>
                                                        <div className="alert alert-info" style={{ fontSize: '0.85rem' }}>
                                                            <span className="material-icons" style={{ fontSize: '1rem' }}>info</span>
                                                            Host accounts require admin approval.
                                                        </div>
                                                        <div className="form-group">
                                                            <label className="form-label">Organization</label>
                                                            <input type="text" name="organization" className="form-input"
                                                                value={formData.organization} onChange={handleChange}
                                                                required placeholder="e.g. Acme Corp" />
                                                        </div>
                                                        <div className="form-group">
                                                            <label className="form-label">Designation</label>
                                                            <input type="text" name="designation" className="form-input"
                                                                value={formData.designation} onChange={handleChange}
                                                                required placeholder="e.g. HR Manager" />
                                                        </div>
                                                    </>
                                                )}
                                            </>
                                        )}

                                        <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                                            {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
                                        </button>
                                    </form>
                                )}

                                {!requires2FA && isLogin && (
                                    <>
                                        <div style={{
                                            display: 'flex', alignItems: 'center', gap: '1rem',
                                            margin: '1.25rem 0', color: 'var(--color-text-tertiary)'
                                        }}>
                                            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }}></div>
                                            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '1.5px' }}>or continue with</span>
                                            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }}></div>
                                        </div>

                                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                                            <button onClick={() => {
                                                setLoading(true);
                                                const w = 500, h = 600;
                                                const left = (window.screen.width / 2) - (w / 2);
                                                const top = (window.screen.height / 2) - (h / 2);
                                                const popup = window.open('/api/auth/oauth/google', 'GoogleOAuth',
                                                    `width=${w},height=${h},left=${left},top=${top},toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes`);
                                                const check = setInterval(() => {
                                                    if (!popup || popup.closed) { clearInterval(check); setLoading(false); }
                                                }, 1000);
                                            }}
                                                type="button" className="btn btn-secondary" style={{ flex: 1, gap: '0.5rem' }}>
                                                <svg width="16" height="16" viewBox="0 0 18 18">
                                                    <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"></path>
                                                    <path fill="#34A853" d="M9.003 18c2.43 0 4.467-.806 5.956-2.18L12.05 13.56c-.806.54-1.836.86-3.047.86-2.344 0-4.328-1.584-5.036-3.711H.96v2.332C2.44 15.983 5.485 18 9.003 18z"></path>
                                                    <path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z"></path>
                                                    <path fill="#EA4335" d="M9.003 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.464.891 11.426 0 9.003 0 5.485 0 2.44 2.017.96 4.958L3.967 7.29c.708-2.127 2.692-3.71 5.036-3.71z"></path>
                                                </svg>
                                                Google
                                            </button>

                                            <button onClick={() => { setShowPhoneAuth(true); setError(''); }}
                                                type="button" className="btn btn-secondary" style={{ flex: 1, gap: '0.5rem' }}>
                                                <span className="material-icons" style={{ fontSize: '18px' }}>phone</span>
                                                Phone
                                            </button>
                                        </div>
                                    </>
                                )}

                                {!requires2FA && (
                                    <div className="text-center" style={{ marginTop: '1.25rem' }}>
                                        <button onClick={() => { setIsLogin(!isLogin); setError(''); }}
                                            style={{
                                                background: 'none', border: 'none',
                                                color: 'var(--primary-color)', fontSize: '0.85rem', cursor: 'pointer',
                                            }}>
                                            {isLogin ? "Don't have an account? Register" : 'Already have an account? Sign In'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </motion.div>
            </div >
            <div id="recaptcha-container" ref={recaptchaContainerRef}></div>

            <style>{`
                @media (max-width: 768px) {
                    .container > div:first-child {
                        flex-direction: column !important;
                        text-align: center;
                    }
                }
            `}</style>
        </div >
    );
}

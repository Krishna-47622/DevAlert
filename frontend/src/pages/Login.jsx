import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

export default function Login() {
    const navigate = useNavigate();
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // 2FA State
    const [requires2FA, setRequires2FA] = useState(false);
    const [twoFACode, setTwoFACode] = useState('');
    const [tempUser, setTempUser] = useState(null); // To store username/password for 2FA step

    // Listen for OAuth popup messages
    useEffect(() => {
        const handleOAuthMessage = (event) => {
            // Security: verify origin
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
        username: '',
        email: '',
        password: '',
        role: 'participant',
        organization: '',
        designation: ''
    });

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
        setError('');
    };

    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // First step: Try to login
            const response = await authAPI.login({
                username: formData.username,
                password: formData.password
            });

            // Check if 2FA is required
            if (response.data.requires_2fa) {
                setRequires2FA(true);
                setTempUser({ username: formData.username, password: formData.password });
                setLoading(false);
                return;
            }

            // Normal login success
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
            // Second step: Verify 2FA code
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

    return (
        <div className="container" style={{ paddingTop: '4rem' }}>
            <div style={{ maxWidth: '500px', margin: '0 auto' }}>
                <div className="card">
                    <div className="card-header text-center">
                        <h2>{requires2FA ? 'Two-Factor Authentication' : (isLogin ? 'Login' : 'Register')}</h2>
                    </div>

                    <div className="card-body">
                        {error && (
                            <div className="alert alert-danger">
                                <span className="material-icons">error</span>
                                <span>{error}</span>
                            </div>
                        )}

                        {requires2FA ? (
                            <form onSubmit={handle2FASubmit}>
                                <div className="form-group">
                                    <label className="form-label">Enter 6-digit Code</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={twoFACode}
                                        onChange={(e) => setTwoFACode(e.target.value)}
                                        placeholder="000000"
                                        maxLength="6"
                                        required
                                        autoFocus
                                    />
                                    <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>
                                        Open your authenticator app and enter the code for DevAlert.
                                    </p>
                                </div>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    style={{ width: '100%' }}
                                    disabled={loading}
                                >
                                    {loading ? <span className="loading"></span> : 'Verify'}
                                </button>
                                <button
                                    type="button"
                                    className="btn"
                                    style={{ width: '100%', marginTop: '1rem', background: 'transparent', border: '1px solid var(--color-border)' }}
                                    onClick={() => {
                                        setRequires2FA(false);
                                        setTwoFACode('');
                                        setError('');
                                    }}
                                >
                                    Cancel
                                </button>
                            </form>
                        ) : (
                            <form onSubmit={isLogin ? handleLoginSubmit : handleRegisterSubmit}>
                                {isLogin ? (
                                    <>
                                        <div className="form-group">
                                            <label className="form-label">Email or Username</label>
                                            <input
                                                type="text"
                                                name="username"
                                                className="form-input"
                                                value={formData.username}
                                                onChange={handleChange}
                                                required
                                                placeholder="Enter your email or username"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Password</label>
                                            <input
                                                type="password"
                                                name="password"
                                                className="form-input"
                                                value={formData.password}
                                                onChange={handleChange}
                                                required
                                            />
                                            <div style={{ marginTop: '0.5rem', textAlign: 'right' }}>
                                                <button
                                                    type="button"
                                                    onClick={() => navigate('/forgot-password')}
                                                    style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        color: 'var(--color-accent)',
                                                        fontSize: '0.875rem',
                                                        cursor: 'pointer',
                                                        textDecoration: 'underline'
                                                    }}
                                                >
                                                    Forgot Password?
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="form-group">
                                            <label className="form-label">Username</label>
                                            <input
                                                type="text"
                                                name="username"
                                                className="form-input"
                                                value={formData.username}
                                                onChange={handleChange}
                                                required
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label">Email</label>
                                            <input
                                                type="email"
                                                name="email"
                                                className="form-input"
                                                value={formData.email}
                                                onChange={handleChange}
                                                required
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label">Password</label>
                                            <input
                                                type="password"
                                                name="password"
                                                className="form-input"
                                                value={formData.password}
                                                onChange={handleChange}
                                                required
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label">Account Type</label>
                                            <select
                                                name="role"
                                                className="form-select"
                                                value={formData.role}
                                                onChange={handleChange}
                                            >
                                                <option value="participant">Participant</option>
                                                <option value="hoster">Hoster</option>
                                            </select>
                                        </div>

                                        {formData.role === 'hoster' && (
                                            <>
                                                <div className="alert alert-info" style={{ fontSize: '0.85rem' }}>
                                                    <span className="material-icons" style={{ fontSize: '1rem', verticalAlign: 'middle', marginRight: '5px' }}>info</span>
                                                    Host accounts require admin approval. You will be registered as a participant until approved.
                                                </div>
                                                <div className="form-group">
                                                    <label className="form-label">Organization / Company / College</label>
                                                    <input
                                                        type="text"
                                                        name="organization"
                                                        className="form-input"
                                                        value={formData.organization}
                                                        onChange={handleChange}
                                                        required
                                                        placeholder="e.g. Acme Corp, XYZ University"
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label className="form-label">Your Designation</label>
                                                    <input
                                                        type="text"
                                                        name="designation"
                                                        className="form-input"
                                                        value={formData.designation}
                                                        onChange={handleChange}
                                                        required
                                                        placeholder="e.g. HR Manager, Student Coordinator"
                                                    />
                                                </div>
                                            </>
                                        )}
                                    </>
                                )}

                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    style={{ width: '100%' }}
                                    disabled={loading}
                                >
                                    {loading ? <span className="loading"></span> : (isLogin ? 'Login' : 'Register')}
                                </button>
                            </form>
                        )}

                        {!requires2FA && isLogin && (
                            <>
                                <div style={{ textAlign: 'center', margin: '1.5rem 0', color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
                                    Or continue with
                                </div>

                                <button
                                    onClick={() => {
                                        setLoading(true);
                                        const width = 500;
                                        const height = 600;
                                        const left = (window.screen.width / 2) - (width / 2);
                                        const top = (window.screen.height / 2) - (height / 2);
                                        const popup = window.open(
                                            '/api/auth/oauth/google',
                                            'GoogleOAuth',
                                            `width=${width},height=${height},left=${left},top=${top},toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes`
                                        );

                                        // Check if popup is closed
                                        const checkPopup = setInterval(() => {
                                            if (!popup || popup.closed) {
                                                clearInterval(checkPopup);
                                                setLoading(false);
                                            }
                                        }, 1000);
                                    }}
                                    className="btn"
                                    style={{
                                        width: '100%',
                                        background: 'white',
                                        color: '#333',
                                        border: '1px solid var(--color-border)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.5rem'
                                    }}
                                    type="button"
                                >
                                    <svg width="18" height="18" viewBox="0 0 18 18">
                                        <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"></path>
                                        <path fill="#34A853" d="M9.003 18c2.43 0 4.467-.806 5.956-2.18L12.05 13.56c-.806.54-1.836.86-3.047.86-2.344 0-4.328-1.584-5.036-3.711H.96v2.332C2.44 15.983 5.485 18 9.003 18z"></path>
                                        <path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z"></path>
                                        <path fill="#EA4335" d="M9.003 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.464.891 11.426 0 9.003 0 5.485 0 2.44 2.017.96 4.958L3.967 7.29c.708-2.127 2.692-3.71 5.036-3.71z"></path>
                                    </svg>
                                    Sign in with Google
                                </button>
                            </>
                        )}

                        {!requires2FA && (
                            <div className="text-center mt-3">
                                <button
                                    onClick={() => setIsLogin(!isLogin)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: 'var(--color-accent)',
                                        textDecoration: 'underline',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {isLogin ? "Don't have an account? Register" : 'Already have an account? Login'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div >
    );
}

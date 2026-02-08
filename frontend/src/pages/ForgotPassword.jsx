import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

export default function ForgotPassword() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await authAPI.forgotPassword(email);
            setSuccess(true);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to send reset email');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container" style={{ paddingTop: '4rem' }}>
            <div style={{ maxWidth: '500px', margin: '0 auto' }}>
                <div className="card">
                    <div className="card-header text-center">
                        <h2>Forgot Password</h2>
                    </div>

                    <div className="card-body">
                        {success ? (
                            <div className="alert alert-success">
                                <span className="material-icons">check_circle</span>
                                <div>
                                    <strong>Email Sent!</strong>
                                    <p style={{ marginTop: '0.5rem', marginBottom: 0 }}>
                                        If an account exists with that email, you will receive a password reset link shortly.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <>
                                {error && (
                                    <div className="alert alert-danger">
                                        <span className="material-icons">error</span>
                                        <span>{error}</span>
                                    </div>
                                )}

                                <p style={{ marginBottom: '1.5rem' }}>
                                    Enter your email address and we'll send you a link to reset your password.
                                </p>

                                <form onSubmit={handleSubmit}>
                                    <div className="form-group">
                                        <label className="form-label">Email Address</label>
                                        <input
                                            type="email"
                                            className="form-input"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            placeholder="Enter your email"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        style={{ width: '100%' }}
                                        disabled={loading}
                                    >
                                        {loading ? <span className="loading"></span> : 'Send Reset Link'}
                                    </button>
                                </form>
                            </>
                        )}

                        <div className="text-center mt-3">
                            <button
                                onClick={() => navigate('/login')}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--color-accent)',
                                    textDecoration: 'underline',
                                    cursor: 'pointer'
                                }}
                            >
                                Back to Login
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

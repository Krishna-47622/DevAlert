import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

export default function VerifyEmail() {
    const { token } = useParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState('verifying'); // verifying, success, error
    const [message, setMessage] = useState('');

    useEffect(() => {
        verifyEmail();
    }, [token]);

    const verifyEmail = async () => {
        try {
            const response = await authAPI.verifyEmail(token);
            setStatus('success');
            setMessage(response.data.message || 'Email verified successfully!');

            // Redirect to dashboard after 3 seconds
            setTimeout(() => navigate('/'), 3000);
        } catch (err) {
            setStatus('error');
            setMessage(err.response?.data?.error || 'Verification failed');
        }
    };

    return (
        <div className="container" style={{ paddingTop: '4rem' }}>
            <div style={{ maxWidth: '500px', margin: '0 auto' }}>
                <div className="card">
                    <div className="card-header text-center">
                        <h2>Email Verification</h2>
                    </div>

                    <div className="card-body" style={{ textAlign: 'center' }}>
                        {status === 'verifying' && (
                            <div>
                                <div className="loading" style={{ width: '40px', height: '40px', margin: '2rem auto' }}></div>
                                <p>Verifying your email address...</p>
                            </div>
                        )}

                        {status === 'success' && (
                            <div className="alert alert-success">
                                <span className="material-icons" style={{ fontSize: '3rem' }}>check_circle</span>
                                <div>
                                    <h3 style={{ marginTop: '1rem' }}>Success!</h3>
                                    <p>{message}</p>
                                    <p style={{ marginTop: '1rem', marginBottom: 0 }}>
                                        Redirecting to dashboard...
                                    </p>
                                </div>
                            </div>
                        )}

                        {status === 'error' && (
                            <>
                                <div className="alert alert-danger">
                                    <span className="material-icons" style={{ fontSize: '3rem' }}>error</span>
                                    <div>
                                        <h3 style={{ marginTop: '1rem' }}>Verification Failed</h3>
                                        <p>{message}</p>
                                    </div>
                                </div>

                                <button
                                    onClick={() => navigate('/login')}
                                    className="btn btn-primary"
                                    style={{ marginTop: '1rem' }}
                                >
                                    Go to Login
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

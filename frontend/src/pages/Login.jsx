import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

export default function Login() {
    const navigate = useNavigate();
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = isLogin
                ? await authAPI.login({ username: formData.username, password: formData.password })
                : await authAPI.register(formData);

            localStorage.setItem('token', response.data.access_token);
            localStorage.setItem('user', JSON.stringify(response.data.user));

            navigate('/');
        } catch (err) {
            setError(err.response?.data?.error || 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container" style={{ paddingTop: '4rem' }}>
            <div style={{ maxWidth: '500px', margin: '0 auto' }}>
                <div className="card">
                    <div className="card-header text-center">
                        <h2>{isLogin ? 'Login' : 'Register'}</h2>
                    </div>

                    <div className="card-body">
                        {error && (
                            <div className="alert alert-danger">
                                <span className="material-icons">error</span>
                                <span>{error}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit}>
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
                    </div>
                </div>
            </div>
        </div>
    );
}

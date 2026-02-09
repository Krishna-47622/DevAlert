import { Link } from 'react-router-dom';
import './Footer.css';

export default function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="footer">
            <div className="container">
                <div className="footer-content">
                    <div className="footer-brand">
                        <Link to="/" className="navbar-brand">
                            DevAlert<span style={{ color: 'var(--primary-color)' }}>.</span>
                        </Link>
                        <p>Bridging the gap between students and opportunities.</p>
                    </div>

                    <div className="footer-links">
                        <div className="footer-group">
                            <h4>Platform</h4>
                            <Link to="/">Dashboard</Link>
                            <Link to="/applicant">Opportunities</Link>
                            <Link to="/about">About Us</Link>
                        </div>
                        <div className="footer-group">
                            <h4>Support</h4>
                            <Link to="/settings">Settings</Link>
                            <Link to="/notifications">Notifications</Link>
                            <a href="mailto:support@devalert.com">Contact</a>
                        </div>
                    </div>
                </div>

                <div className="footer-bottom">
                    <p>&copy; {currentYear} DevAlert. All rights reserved.</p>
                    <div className="footer-social">
                        <a href="#" className="social-icon"><i className="fab fa-github"></i></a>
                        <a href="#" className="social-icon"><i className="fab fa-twitter"></i></a>
                        <a href="#" className="social-icon"><i className="fab fa-linkedin"></i></a>
                    </div>
                </div>
            </div>
        </footer>
    );
}

import { Link } from 'react-router-dom';

export default function PrivacyPolicy() {
    return (
        <div className="container" style={{ paddingTop: '4rem', paddingBottom: '4rem' }}>
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                <div className="card">
                    <div className="card-header">
                        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Privacy Policy</h1>
                        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                            Last updated: February 27, 2026
                        </p>
                    </div>

                    <div className="card-body" style={{ lineHeight: '1.8', color: 'var(--color-text-secondary)' }}>

                        <section style={{ marginBottom: '2rem' }}>
                            <h2 style={{ fontSize: '1.3rem', color: 'var(--color-text-primary)', marginBottom: '0.75rem' }}>1. Introduction</h2>
                            <p>
                                Welcome to <strong>DevAlert</strong>. We are committed to protecting your personal information and your right to privacy.
                                This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.
                            </p>
                        </section>

                        <section style={{ marginBottom: '2rem' }}>
                            <h2 style={{ fontSize: '1.3rem', color: 'var(--color-text-primary)', marginBottom: '0.75rem' }}>2. Information We Collect</h2>
                            <p>We collect personal information that you voluntarily provide when you:</p>
                            <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
                                <li>Register for an account (username, email, phone number)</li>
                                <li>Sign in via OAuth providers (Google, GitHub) or phone authentication</li>
                                <li>Update your profile (full name, organization, designation)</li>
                                <li>Upload your resume or application materials</li>
                                <li>Apply to hackathons or internships through our platform</li>
                            </ul>
                        </section>

                        <section style={{ marginBottom: '2rem' }}>
                            <h2 style={{ fontSize: '1.3rem', color: 'var(--color-text-primary)', marginBottom: '0.75rem' }}>3. How We Use Your Information</h2>
                            <p>We use your information to:</p>
                            <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
                                <li>Provide and maintain our services</li>
                                <li>Authenticate your identity and manage your account</li>
                                <li>Send you notifications about relevant opportunities</li>
                                <li>Match you with hackathons and internships using AI-powered scoring</li>
                                <li>Facilitate event hosting and application management</li>
                                <li>Improve our platform and user experience</li>
                            </ul>
                        </section>

                        <section style={{ marginBottom: '2rem' }}>
                            <h2 style={{ fontSize: '1.3rem', color: 'var(--color-text-primary)', marginBottom: '0.75rem' }}>4. Data Security</h2>
                            <p>
                                We implement appropriate technical and organizational security measures to protect your personal data.
                                Passwords are hashed using industry-standard algorithms, and all communications are encrypted in transit.
                                Two-factor authentication is available for added security.
                            </p>
                        </section>

                        <section style={{ marginBottom: '2rem' }}>
                            <h2 style={{ fontSize: '1.3rem', color: 'var(--color-text-primary)', marginBottom: '0.75rem' }}>5. Third-Party Services</h2>
                            <p>We integrate with the following third-party services:</p>
                            <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
                                <li><strong>Google OAuth</strong> — for social sign-in</li>
                                <li><strong>Firebase</strong> — for phone number authentication via SMS OTP</li>
                                <li><strong>Google Gemini AI</strong> — for scanning and matching opportunities</li>
                            </ul>
                            <p style={{ marginTop: '0.5rem' }}>
                                Each third-party service has its own privacy policy governing the use of your data.
                            </p>
                        </section>

                        <section style={{ marginBottom: '2rem' }}>
                            <h2 style={{ fontSize: '1.3rem', color: 'var(--color-text-primary)', marginBottom: '0.75rem' }}>6. Data Retention</h2>
                            <p>
                                We retain your personal data for as long as your account is active or as needed to provide you services.
                                You may request deletion of your account and associated data at any time by contacting our support team.
                            </p>
                        </section>

                        <section style={{ marginBottom: '2rem' }}>
                            <h2 style={{ fontSize: '1.3rem', color: 'var(--color-text-primary)', marginBottom: '0.75rem' }}>7. Your Rights</h2>
                            <p>You have the right to:</p>
                            <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
                                <li>Access and update your personal information</li>
                                <li>Request deletion of your data</li>
                                <li>Opt out of non-essential communications</li>
                                <li>Export your data in a portable format</li>
                            </ul>
                        </section>

                        <section style={{ marginBottom: '2rem' }}>
                            <h2 style={{ fontSize: '1.3rem', color: 'var(--color-text-primary)', marginBottom: '0.75rem' }}>8. Cookies</h2>
                            <p>
                                We use local storage and session tokens to maintain your authentication state.
                                We do not use third-party tracking cookies for advertising purposes.
                            </p>
                        </section>

                        <section style={{ marginBottom: '2rem' }}>
                            <h2 style={{ fontSize: '1.3rem', color: 'var(--color-text-primary)', marginBottom: '0.75rem' }}>9. Changes to This Policy</h2>
                            <p>
                                We may update this Privacy Policy from time to time. We will notify you of any changes by updating the
                                "Last updated" date at the top of this page. Continued use of our services constitutes acceptance of the updated policy.
                            </p>
                        </section>

                        <section>
                            <h2 style={{ fontSize: '1.3rem', color: 'var(--color-text-primary)', marginBottom: '0.75rem' }}>10. Contact Us</h2>
                            <p>
                                If you have any questions about this Privacy Policy, please contact us at{' '}
                                <a href="mailto:support@devalert.com" style={{ color: 'var(--color-accent)' }}>
                                    support@devalert.com
                                </a>.
                            </p>
                        </section>

                    </div>
                </div>

                <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                    <Link
                        to="/"
                        style={{
                            color: 'var(--color-accent)',
                            textDecoration: 'underline',
                            fontSize: '0.95rem'
                        }}
                    >
                        <span className="material-icons" style={{ fontSize: '1rem', verticalAlign: 'middle', marginRight: '4px' }}>arrow_back</span>
                        Back to Home
                    </Link>
                </div>
            </div>
        </div>
    );
}

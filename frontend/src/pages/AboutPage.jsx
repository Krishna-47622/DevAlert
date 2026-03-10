import { motion } from 'framer-motion';
import './AboutPage.css';

export default function AboutPage() {
    return (
        <div className="about-container">
            <motion.div
                className="about-header"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
            >
                <h1>About <span className="text-gradient">DevAlert</span></h1>
                <p className="subtitle">Empowering the next generation of developers.</p>
            </motion.div>

            <motion.div
                className="about-section glass-card"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
            >
                <h2>The Project</h2>
                <p>
                    DevAlert was conceptualized and built as a <strong>1st Year 2nd Semester Project</strong>.
                    Our mission is to bridge the gap between talented students and industry opportunities like
                    hackathons and internships. We use AI to scan the web and bring the most relevant
                    tech events directly to your dashboard.
                </p>
            </motion.div>

            <div className="about-details-section">
                <motion.div
                    className="about-card glass-card"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                >
                    <h2>Our Vision</h2>
                    <p>
                        To create a seamless ecosystem where student developers can easily discover
                        and track hackathons, internships, and tech events without navigating through
                        cluttered boards. We aim to become the central hub for the developer community's
                        growth, ensuring no talented individual misses an opportunity simply because they didn't know about it in time.
                    </p>
                </motion.div>

                <motion.div
                    className="about-card glass-card"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 }}
                >
                    <h2>Why DevAlert?</h2>
                    <ul>
                        <li><span className="material-icons" style={{ fontSize: '1.2rem', verticalAlign: 'middle', marginRight: '8px', color: 'var(--primary-color)' }}>auto_awesome</span> <strong>AI-Powered Web Scanning</strong> - Automatically fetching the latest active opportunities from across the web.</li>
                        <li><span className="material-icons" style={{ fontSize: '1.2rem', verticalAlign: 'middle', marginRight: '8px', color: 'var(--primary-color)' }}>target</span> <strong>Smart Resume Matching</strong> - Evaluating your skills to show how well you match a role instantly.</li>
                        <li><span className="material-icons" style={{ fontSize: '1.2rem', verticalAlign: 'middle', marginRight: '8px', color: 'var(--primary-color)' }}>speed</span> <strong>Automated Cleanups</strong> - Ensuring expired opportunities vanish so you only see what's active.</li>
                        <li><span className="material-icons" style={{ fontSize: '1.2rem', verticalAlign: 'middle', marginRight: '8px', color: 'var(--primary-color)' }}>dashboard</span> <strong>Seamless Dashboard</strong> - Tracking your applications and saved events in an organized cockpit.</li>
                    </ul>
                </motion.div>
            </div>

            <motion.div
                className="mru-badge"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
            >
                <h3>Built at Malla Reddy University</h3>
                <p>Academic Year 2025-2026</p>
            </motion.div>
        </div>
    );
}

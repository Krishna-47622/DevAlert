import { motion } from 'framer-motion';
import './AboutPage.css';

const teamMembers = [
    { name: "Team Lead", role: "Full Stack Developer", image: "https://api.dicebear.com/7.x/lorelei/svg?seed=Aiden&backgroundColor=transparent" },
    { name: "Team Member 1", role: "Frontend Specialist", image: "https://api.dicebear.com/7.x/lorelei/svg?seed=Aneka&backgroundColor=transparent" },
    { name: "Team Member 2", role: "UI/UX Designer", image: "https://api.dicebear.com/7.x/lorelei/svg?seed=Cali&backgroundColor=transparent" },
    { name: "Team Member 3", role: "Backend Developer", image: "https://api.dicebear.com/7.x/lorelei/svg?seed=Dora&backgroundColor=transparent" },
    { name: "Team Member 4", role: "Researcher & Content", image: "https://api.dicebear.com/7.x/lorelei/svg?seed=Felix&backgroundColor=transparent" },
];

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

            <div className="team-section">
                <motion.h2
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                >
                    The Brains Behind DevAlert
                </motion.h2>
                <p className="mru-text">A team of 5 1st year Btech students from <strong>Malla Reddy University</strong>.</p>

                <div className="team-grid">
                    {teamMembers.map((member, index) => (
                        <motion.div
                            key={index}
                            className="team-card glass-card"
                            initial={{ opacity: 0, scale: 0.9 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.1 }}
                            viewport={{ once: true }}
                            whileHover={{ y: -10 }}
                        >
                            <div className="member-avatar">
                                <img src={member.image} alt={member.name} />
                            </div>
                            <h3>{member.name}</h3>
                            <p className="role">{member.role}</p>
                        </motion.div>
                    ))}
                </div>
            </div>

            <motion.div
                className="mru-badge"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
            >
                <h3>Built at Malla Reddy University</h3>
                <p>Academic Year 2024-2025</p>
            </motion.div>
        </div>
    );
}

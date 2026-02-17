import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function HelpPage() {
    const [expandedIndex, setExpandedIndex] = useState(null);

    const faqs = [
        {
            question: "How do I apply for opportunities?",
            answer: "Navigate to the 'Opportunities' tab, browse through the available hackathons and internships, and click the 'Apply Now' button on the card. You can also view more details by clicking 'Details'."
        },
        {
            question: "What is the AI Match Score?",
            answer: "The AI Match Score analyzes your resume against the description of an opportunity to give you a percentage match. This helps you understand how well your profile aligns with the requirements."
        },
        {
            question: "How do I update my resume?",
            answer: "Go to the 'Settings' page (cog icon) and paste your resume text or provide a link to your resume in the designated field."
        },
        {
            question: "Can I host my own hackathon?",
            answer: "Yes! Go to the 'Host' tab and fill out the form to submit your hackathon or internship. Once approved by an admin, it will be listed for everyone."
        },
        {
            question: "Who can see my profile?",
            answer: "Your profile is private to you and the administrators. Only when you apply for an opportunity, relevant details might be shared with the organizer."
        }
    ];

    const toggleAccordion = (index) => {
        setExpandedIndex(expandedIndex === index ? null : index);
    };

    return (
        <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem', maxWidth: '800px' }}>
            <motion.h1
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-4 text-glow"
                style={{ color: 'white' }}
            >
                Help Center
            </motion.h1>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="card mb-5"
                style={{ background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(10px)' }}
            >
                <div className="card-body">
                    <h2 className="mb-3">Getting Started</h2>
                    <p>Welcome to DevAlert! We help developers find the best hackathons and internships tailored to their skills. Use our AI-powered matching to discover opportunities that fit you perfectly.</p>
                </div>
            </motion.div>

            <h2 className="mb-4 text-center">Frequently Asked Questions</h2>

            <div className="accordion">
                {faqs.map((faq, index) => (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="mb-3"
                        style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            border: '1px solid rgba(255, 255, 255, 0.1)'
                        }}
                    >
                        <div
                            onClick={() => toggleAccordion(index)}
                            style={{
                                padding: '1.2rem',
                                cursor: 'pointer',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                background: expandedIndex === index ? 'rgba(var(--primary-color-rgb), 0.1)' : 'transparent',
                                transition: 'background 0.3s ease'
                            }}
                        >
                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '500' }}>{faq.question}</h3>
                            <span className="material-icons" style={{
                                transform: expandedIndex === index ? 'rotate(180deg)' : 'rotate(0deg)',
                                transition: 'transform 0.3s ease'
                            }}>
                                expand_more
                            </span>
                        </div>
                        <AnimatePresence>
                            {expandedIndex === index && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <div style={{ padding: '0 1.2rem 1.2rem 1.2rem', color: 'var(--color-text-secondary)', lineHeight: '1.6' }}>
                                        {faq.answer}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                ))}
            </div>

            <div className="text-center mt-5">
                <p className="text-muted">Still have questions?</p>
                <a href="mailto:support@devalert.com" className="btn btn-primary" style={{ padding: '0.8rem 2rem' }}>
                    Contact Support
                </a>
            </div>
        </div>
    );
}

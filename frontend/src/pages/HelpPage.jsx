import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function HelpPage() {
    const [expandedIndex, setExpandedIndex] = useState(null);

    const iconStyle = {
        fontSize: '1.2rem',
        verticalAlign: 'middle',
        marginRight: '8px',
        color: '#a855f7' // Primary purple accent
    };

    const faqs = [
        {
            question: "How do I apply for opportunities?",
            answer: (
                <>
                    <p className="mb-2">Follow these simple steps to apply:</p>
                    <ul style={{ listStyleType: 'none', paddingLeft: 0 }}>
                        <li className="mb-2" style={{ display: 'flex', alignItems: 'flex-start' }}>
                            <span className="material-icons" style={iconStyle}>arrow_forward</span>
                            <span><strong>Step 1:</strong> Navigate to the <strong>'Opportunities'</strong> tab in the main menu.</span>
                        </li>
                        <li className="mb-2" style={{ display: 'flex', alignItems: 'flex-start' }}>
                            <span className="material-icons" style={iconStyle}>arrow_forward</span>
                            <span><strong>Step 2:</strong> Browse through the list of available hackathons and internships.</span>
                        </li>
                        <li className="mb-2" style={{ display: 'flex', alignItems: 'flex-start' }}>
                            <span className="material-icons" style={iconStyle}>arrow_forward</span>
                            <span><strong>Step 3:</strong> Click the <strong>'Apply Now'</strong> button on the card that interests you.</span>
                        </li>
                        <li style={{ display: 'flex', alignItems: 'flex-start' }}>
                            <span className="material-icons" style={iconStyle}>check_circle</span>
                            <span><strong>Step 4:</strong> Fill in the required details and hit Submit!</span>
                        </li>
                    </ul>
                </>
            )
        },
        {
            question: "What is the AI Match Score?",
            answer: (
                <>
                    <p className="mb-2">The AI Match Score is a smart feature that helps you save time:</p>
                    <ul style={{ listStyleType: 'none', paddingLeft: 0 }}>
                        <li className="mb-2" style={{ display: 'flex', alignItems: 'flex-start' }}>
                            <span className="material-icons" style={iconStyle}>analytics</span>
                            <span><strong>Analysis:</strong> It scans your resume text against the specific requirements of the opportunity.</span>
                        </li>
                        <li className="mb-2" style={{ display: 'flex', alignItems: 'flex-start' }}>
                            <span className="material-icons" style={iconStyle}>percent</span>
                            <span><strong>Scoring:</strong> You get a percentage match (0-100%) indicating how well you fit the role.</span>
                        </li>
                        <li style={{ display: 'flex', alignItems: 'flex-start' }}>
                            <span className="material-icons" style={iconStyle}>feedback</span>
                            <span><strong>Feedback:</strong> It provides a brief explanation highlighting your matching skills or missing requirements.</span>
                        </li>
                    </ul>
                </>
            )
        },
        {
            question: "How do I update my resume?",
            answer: (
                <>
                    <p className="mb-2">Keeping your profile updated is key to accurate AI matching:</p>
                    <ul style={{ listStyleType: 'none', paddingLeft: 0 }}>
                        <li className="mb-2" style={{ display: 'flex', alignItems: 'flex-start' }}>
                            <span className="material-icons" style={iconStyle}>settings</span>
                            <span><strong>Step 1:</strong> Click the <strong>Settings</strong> icon (cogwheel) in the navbar.</span>
                        </li>
                        <li className="mb-2" style={{ display: 'flex', alignItems: 'flex-start' }}>
                            <span className="material-icons" style={iconStyle}>description</span>
                            <span><strong>Step 2:</strong> Locate the <strong>"Resume & Socials"</strong> section.</span>
                        </li>
                        <li style={{ display: 'flex', alignItems: 'flex-start' }}>
                            <span className="material-icons" style={iconStyle}>save</span>
                            <span><strong>Step 3:</strong> Paste your latest resume text or update your resume link and click <strong>Save Changes</strong>.</span>
                        </li>
                    </ul>
                </>
            )
        },
        {
            question: "Can I host my own hackathon?",
            answer: (
                <>
                    <p className="mb-2">Absolutely! We love community contributions:</p>
                    <ul style={{ listStyleType: 'none', paddingLeft: 0 }}>
                        <li className="mb-2" style={{ display: 'flex', alignItems: 'flex-start' }}>
                            <span className="material-icons" style={iconStyle}>campaign</span>
                            <span><strong>Step 1:</strong> Go to the <strong>'Host'</strong> tab.</span>
                        </li>
                        <li className="mb-2" style={{ display: 'flex', alignItems: 'flex-start' }}>
                            <span className="material-icons" style={iconStyle}>edit_note</span>
                            <span><strong>Step 2:</strong> Fill out the event details form (Title, Description, Dates, etc.).</span>
                        </li>
                        <li style={{ display: 'flex', alignItems: 'flex-start' }}>
                            <span className="material-icons" style={iconStyle}>send</span>
                            <span><strong>Step 3:</strong> Submit for approval. Our admins will review and list it shortly!</span>
                        </li>
                    </ul>
                </>
            )
        },
        {
            question: "Who can see my profile?",
            answer: (
                <>
                    <p>Your privacy is important to us:</p>
                    <ul style={{ listStyleType: 'none', paddingLeft: 0 }}>
                        <li className="mb-2" style={{ display: 'flex', alignItems: 'flex-start' }}>
                            <span className="material-icons" style={iconStyle}>lock</span>
                            <span><strong>Private by Default:</strong> Your profile is visible only to you and platform administrators.</span>
                        </li>
                        <li style={{ display: 'flex', alignItems: 'flex-start' }}>
                            <span className="material-icons" style={iconStyle}>share</span>
                            <span><strong>Shared on Apply:</strong> When you apply for an opportunity, only the relevant details (Resume, Contact Info) are shared with that specific organizer.</span>
                        </li>
                    </ul>
                </>
            )
        }
    ];

    const toggleAccordion = (index) => {
        setExpandedIndex(expandedIndex === index ? null : index);
    };

    return (
        <div className="container" style={{ paddingTop: '4rem', paddingBottom: '6rem', maxWidth: '900px' }}>
            <motion.h1
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-5 text-glow"
                style={{
                    color: 'white',
                    fontSize: '3.5rem',
                    fontWeight: '700',
                    letterSpacing: '-1px',
                    marginBottom: '3rem'
                }}
            >
                Help Center
            </motion.h1>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="card mb-5"
                style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '24px',
                    padding: '2rem',
                    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.2)'
                }}
            >
                <div className="card-body p-0">
                    <h2 className="mb-3" style={{ fontSize: '2rem', color: 'rgba(255,255,255,0.95)' }}>Getting Started</h2>
                    <p style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.7)', lineHeight: '1.7' }}>
                        Welcome to DevAlert! We help developers find the best hackathons and internships tailored to their skills. Use our AI-powered matching to discover opportunities that fit you perfectly.
                    </p>
                </div>
            </motion.div>

            <h2 className="mb-5 text-center" style={{ fontSize: '2.5rem', fontWeight: '600', color: 'rgba(255,255,255,0.9)', marginTop: '8rem' }}>Frequently Asked Questions</h2>

            <div className="accordion">
                {faqs.map((faq, index) => (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="mb-5"
                        style={{
                            background: 'rgba(255, 255, 255, 0.02)',
                            backdropFilter: 'blur(12px)',
                            WebkitBackdropFilter: 'blur(12px)',
                            borderRadius: '16px',
                            overflow: 'hidden',
                            border: '1px solid rgba(255, 255, 255, 0.05)',
                            boxShadow: '0 4px 16px rgba(0,0,0,0.1)'
                        }}
                    >
                        <div
                            onClick={() => toggleAccordion(index)}
                            style={{
                                padding: '1.5rem 2rem',
                                cursor: 'pointer',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                background: expandedIndex === index ? 'rgba(255, 255, 255, 0.03)' : 'transparent',
                                transition: 'all 0.3s ease'
                            }}
                        >
                            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '500', color: 'rgba(255,255,255,0.9)' }}>{faq.question}</h3>
                            <span className="material-icons" style={{
                                transform: expandedIndex === index ? 'rotate(180deg)' : 'rotate(0deg)',
                                transition: 'transform 0.3s ease',
                                color: 'rgba(255,255,255,0.6)'
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
                                    transition={{ duration: 0.3, ease: "easeInOut" }}
                                >
                                    <div style={{ padding: '0 2rem 1.5rem 2rem', color: 'rgba(255, 255, 255, 0.65)', lineHeight: '1.8', fontSize: '1.05rem' }}>
                                        {faq.answer}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                ))}
            </div>

            <div className="text-center mt-5" style={{ paddingTop: '2rem' }}>
                <p className="text-muted mb-4" style={{ fontSize: '1.1rem' }}>Still have questions?</p>
                <a href="mailto:support@devalert.com" className="btn btn-primary" style={{
                    padding: '1rem 3rem',
                    borderRadius: '50px',
                    fontSize: '1.1rem',
                    background: 'linear-gradient(135deg, var(--primary-color) 0%, #a855f7 100%)',
                    border: 'none',
                    boxShadow: '0 4px 15px rgba(168, 85, 247, 0.4)'
                }}>
                    Contact Support
                </a>
            </div>
        </div>
    );
}

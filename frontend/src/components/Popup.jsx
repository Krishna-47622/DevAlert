import { useState } from 'react';

export default function Popup({ isOpen, onClose, title, message, type = 'info', onConfirm }) {
    const [expanded, setExpanded] = useState(false);

    if (!isOpen) return null;

    const isLong = message && message.length > 120;

    const typeColors = {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        confirm: '#8B5CF6',
        info: '#8B5CF6',
    };
    const accentColor = typeColors[type] || typeColors.info;

    const typeIcons = {
        success: 'check_circle',
        error: 'error',
        warning: 'warning',
        confirm: 'help_outline',
        info: 'info',
    };
    const icon = typeIcons[type] || typeIcons.info;

    return (
        <>
            <div style={{
                position: 'fixed',
                top: 0, left: 0,
                width: '100vw', height: '100vh',
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10000,
                backdropFilter: 'blur(5px)',
            }} onClick={onClose}>
                <div style={{
                    position: 'relative',
                    width: '90%',
                    maxWidth: '500px',
                    backgroundColor: 'rgba(15, 23, 42, 0.92)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '16px',
                    padding: '2rem',
                    boxShadow: `0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px ${accentColor}15`,
                    color: 'white',
                    overflow: 'hidden',
                    animation: 'popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                }} onClick={(e) => e.stopPropagation()}>

                    {/* Accent glow circle (lightweight CSS replacement for 3D sphere) */}
                    <div style={{
                        position: 'absolute',
                        top: '-40px', right: '-40px',
                        width: '160px', height: '160px',
                        borderRadius: '50%',
                        background: `radial-gradient(circle, ${accentColor}30 0%, transparent 70%)`,
                        filter: 'blur(20px)',
                        pointerEvents: 'none',
                    }} />

                    {/* Icon + Title */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', position: 'relative', zIndex: 1 }}>
                        <span className="material-icons" style={{ fontSize: '1.5rem', color: accentColor }}>{icon}</span>
                        <h2 style={{
                            margin: 0,
                            fontSize: '1.3rem',
                            fontWeight: 'bold',
                        }}>{title}</h2>
                    </div>

                    {/* Message with overflow handling */}
                    <div style={{ position: 'relative', zIndex: 1, marginBottom: '2rem' }}>
                        <p style={{
                            margin: 0,
                            color: '#a1a1aa',
                            lineHeight: '1.6',
                            maxHeight: '120px',
                            overflowY: 'auto',
                            overflowX: 'hidden',
                            wordBreak: 'break-word',
                            whiteSpace: 'pre-wrap',
                            paddingRight: '4px',
                            scrollbarWidth: 'thin',
                            scrollbarColor: 'rgba(255,255,255,0.2) transparent',
                        }}>{message}</p>
                        {isLong && (
                            <button
                                onClick={() => setExpanded(true)}
                                style={{
                                    marginTop: '8px',
                                    background: 'none',
                                    border: 'none',
                                    color: '#60a5fa',
                                    cursor: 'pointer',
                                    fontSize: '0.8rem',
                                    padding: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                }}
                            >
                                <span className="material-icons" style={{ fontSize: '14px' }}>open_in_full</span>
                                View full message
                            </button>
                        )}
                    </div>

                    <div style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: '1rem',
                        position: 'relative',
                        zIndex: 1,
                    }}>
                        {type === 'confirm' ? (
                            <>
                                <button
                                    onClick={onClose}
                                    style={{
                                        padding: '0.75rem 1.5rem',
                                        backgroundColor: 'transparent',
                                        border: '1px solid #3f3f46',
                                        borderRadius: '8px',
                                        color: 'white',
                                        cursor: 'pointer',
                                        fontWeight: '500',
                                        transition: 'all 0.2s',
                                    }}
                                    onMouseOver={(e) => e.target.style.backgroundColor = '#27272a'}
                                    onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => { onConfirm(); onClose(); }}
                                    style={{
                                        padding: '0.75rem 1.5rem',
                                        backgroundColor: '#ef4444',
                                        border: 'none',
                                        borderRadius: '8px',
                                        color: 'white',
                                        cursor: 'pointer',
                                        fontWeight: '500',
                                        boxShadow: '0 4px 6px -1px rgba(239, 68, 68, 0.2)',
                                        transition: 'all 0.2s',
                                    }}
                                    onMouseOver={(e) => e.target.style.backgroundColor = '#dc2626'}
                                    onMouseOut={(e) => e.target.style.backgroundColor = '#ef4444'}
                                >
                                    Confirm
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={onClose}
                                style={{
                                    padding: '0.75rem 1.5rem',
                                    backgroundColor: '#8B5CF6',
                                    border: 'none',
                                    borderRadius: '8px',
                                    color: 'white',
                                    cursor: 'pointer',
                                    fontWeight: '500',
                                    boxShadow: '0 4px 6px -1px rgba(139, 92, 246, 0.2)',
                                    transition: 'all 0.2s',
                                }}
                                onMouseOver={(e) => e.target.style.backgroundColor = '#7C3AED'}
                                onMouseOut={(e) => e.target.style.backgroundColor = '#8B5CF6'}
                            >
                                Okay
                            </button>
                        )}
                    </div>
                </div>
                <style>{`
                    @keyframes popIn {
                        from { opacity: 0; transform: scale(0.9) translateY(10px); }
                        to { opacity: 1; transform: scale(1) translateY(0); }
                    }
                    @keyframes expandIn {
                        from { opacity: 0; transform: scale(0.95); }
                        to { opacity: 1; transform: scale(1); }
                    }
                `}</style>
            </div>

            {/* Full-screen expanded text viewer */}
            {expanded && (
                <div
                    onClick={() => setExpanded(false)}
                    style={{
                        position: 'fixed',
                        top: 0, left: 0,
                        width: '100vw', height: '100vh',
                        backgroundColor: 'rgba(0,0,0,0.85)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 20000,
                        backdropFilter: 'blur(8px)',
                        animation: 'expandIn 0.2s ease',
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            width: '90%',
                            maxWidth: '700px',
                            maxHeight: '80vh',
                            backgroundColor: 'rgba(15, 23, 42, 0.95)',
                            border: '1px solid rgba(255,255,255,0.15)',
                            borderRadius: '20px',
                            padding: '2.5rem',
                            overflowY: 'auto',
                            color: 'white',
                            boxShadow: '0 30px 60px rgba(0,0,0,0.7)',
                            animation: 'expandIn 0.2s ease',
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 'bold' }}>{title}</h2>
                            <button
                                onClick={() => setExpanded(false)}
                                style={{
                                    background: 'rgba(255,255,255,0.1)',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: '36px',
                                    height: '36px',
                                    color: 'white',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '18px',
                                    flexShrink: 0,
                                }}
                            >×</button>
                        </div>
                        <p style={{
                            margin: 0,
                            color: '#d4d4d8',
                            lineHeight: '1.8',
                            fontSize: '1rem',
                            wordBreak: 'break-word',
                            whiteSpace: 'pre-wrap',
                        }}>{message}</p>
                    </div>
                </div>
            )}
        </>
    );
}

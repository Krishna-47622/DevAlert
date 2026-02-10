import { forwardRef } from 'react';

const Card = forwardRef(({ children, className = '', tilt = true, ...props }, ref) => {
    return (
        <div
            ref={ref}
            className={`card-wrapper ${className}`}
            style={{
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                width: '100%',
                ...props.style
            }}
            {...props}
        >
            <div
                className="card"
                style={{
                    width: '100%',
                    height: '100%',
                    position: 'relative',
                    backgroundColor: 'rgba(15, 15, 15, 0.4)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '1.5rem',
                    borderRadius: '12px'
                }}
            >
                <div style={{
                    position: 'relative',
                    zIndex: 1,
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    {children}
                </div>
            </div>
        </div>
    );
});

export default Card;

export function CardHeader({ children, className = '' }) {
    return (
        <div className={`card-header ${className}`} style={{ marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
            {children}
        </div>
    );
}

export function CardBody({ children, className = '' }) {
    return (
        <div className={`card-body ${className}`} style={{ flex: 1 }}>
            {children}
        </div>
    );
}

export function CardFooter({ children, className = '' }) {
    return (
        <div className={`card-footer ${className}`} style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            {children}
        </div>
    );
}

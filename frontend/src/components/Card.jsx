import { useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

const springValues = {
    damping: 30,
    stiffness: 100,
    mass: 2
};

const Card = forwardRef(({
    children,
    className = '',
    containerHeight = 'auto',
    containerWidth = '100%',
    rotateAmplitude = 12,
    scaleOnHover = 1.05,
    style: externalStyle = {},
    ...props
}, ref) => {
    const containerRef = useRef(null);
    useImperativeHandle(ref, () => containerRef.current);

    const rotateX = useSpring(0, springValues);
    const rotateY = useSpring(0, springValues);
    const scale = useSpring(1, springValues);

    const onMouseMove = (e) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Calculate rotation based on center
        const xPct = (mouseX / rect.width - 0.5) * 2; // -1 to 1
        const yPct = (mouseY / rect.height - 0.5) * 2; // -1 to 1

        rotateX.set(-yPct * rotateAmplitude);
        rotateY.set(xPct * rotateAmplitude);
    };

    const onMouseEnter = () => scale.set(scaleOnHover);
    const onMouseLeave = () => {
        rotateX.set(0);
        rotateY.set(0);
        scale.set(1);
    };

    return (
        <div
            ref={containerRef}
            className={`card-wrapper ${className}`}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            onMouseMove={onMouseMove}
            style={{
                width: containerWidth,
                height: containerHeight,
                perspective: '1000px',
                position: 'relative',
                zIndex: 1,
                display: 'flex',
                flexDirection: 'column',
                cursor: props.onClick ? 'pointer' : 'default',
                ...externalStyle
            }}
            {...props}
        >
            <motion.div
                className="card-3d-inner"
                style={{
                    width: '100%',
                    height: '100%',
                    rotateX,
                    rotateY,
                    scale,
                    transformStyle: 'preserve-3d',
                    backgroundColor: 'rgba(15, 15, 15, 0.4)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)',
                    display: 'flex',
                    flexDirection: 'column'
                }}
            >
                <div style={{
                    transform: 'translateZ(20px)',
                    transformStyle: 'preserve-3d',
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    {children}
                </div>
            </motion.div>
        </div>
    );
});

export default Card;

export function CardHeader({ children, className = '' }) {
    return (
        <div className={`card-header ${className}`} style={{ marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', transform: 'translateZ(25px)' }}>
            {children}
        </div>
    );
}

export function CardBody({ children, className = '' }) {
    return (
        <div className={`card-body ${className}`} style={{ flex: 1, transform: 'translateZ(20px)' }}>
            {children}
        </div>
    );
}

export function CardFooter({ children, className = '' }) {
    return (
        <div className={`card-footer ${className}`} style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', transform: 'translateZ(25px)' }}>
            {children}
        </div>
    );
}

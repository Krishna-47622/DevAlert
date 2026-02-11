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

    const handleMouseMove = (e) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const xPct = (mouseX / rect.width - 0.5) * 2;
        const yPct = (mouseY / rect.height - 0.5) * 2;

        rotateX.set(-yPct * rotateAmplitude);
        rotateY.set(xPct * rotateAmplitude);
    };

    const handleMouseEnter = () => scale.set(scaleOnHover);
    const handleMouseLeave = () => {
        rotateX.set(0);
        rotateY.set(0);
        scale.set(1);
    };

    return (
        <div
            ref={containerRef}
            className={`card-wrapper ${className}`}
            onMouseMove={handleMouseMove}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            style={{
                width: containerWidth,
                height: containerHeight,
                perspective: '1000px',
                position: 'relative',
                display: 'flex',
                cursor: props.onClick ? 'pointer' : 'default',
                ...externalStyle
            }}
        >
            <motion.div
                className="card-3d-base"
                style={{
                    width: '100%',
                    height: '100%',
                    rotateX,
                    rotateY,
                    scale,
                    transformStyle: 'preserve-3d',
                    pointerEvents: 'auto'
                }}
                {...props}
            >
                <div style={{
                    position: 'relative',
                    zIndex: 1,
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    transform: 'translateZ(10px)',
                    transformStyle: 'preserve-3d',
                    pointerEvents: 'auto'
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

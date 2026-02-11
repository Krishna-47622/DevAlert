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
    const internalRef = useRef(null);
    useImperativeHandle(ref, () => internalRef.current);

    const rotateX = useSpring(0, springValues);
    const rotateY = useSpring(0, springValues);
    const scale = useSpring(1, springValues);

    const onMouseMove = (e) => {
        if (!internalRef.current) return;
        const rect = internalRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        rotateX.set((y - 0.5) * -rotateAmplitude);
        rotateY.set((x - 0.5) * rotateAmplitude);
    };

    const onMouseEnter = () => scale.set(scaleOnHover);
    const onMouseLeave = () => {
        rotateX.set(0);
        rotateY.set(0);
        scale.set(1);
    };

    return (
        <motion.div
            ref={internalRef}
            className={`card ${className}`}
            onMouseMove={onMouseMove}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            style={{
                width: containerWidth,
                height: containerHeight,
                transformPerspective: 1000,
                transformStyle: 'preserve-3d',
                rotateX,
                rotateY,
                scale,
                transition: 'none !important',
                position: 'relative',
                zIndex: 1,
                cursor: props.onClick ? 'pointer' : 'default',
                ...externalStyle
            }}
            {...props}
        >
            <div style={{
                position: 'relative',
                zIndex: 2,
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

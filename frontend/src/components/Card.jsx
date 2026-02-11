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

    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const rotateX = useSpring(useMotionValue(0), springValues);
    const rotateY = useSpring(useMotionValue(0), springValues);
    const scale = useSpring(1, springValues);

    function handleMouse(e) {
        if (!internalRef.current) return;
        const rect = internalRef.current.getBoundingClientRect();
        const offsetX = e.clientX - rect.left - rect.width / 2;
        const offsetY = e.clientY - rect.top - rect.height / 2;

        const rotationX = (offsetY / (rect.height / 2)) * -rotateAmplitude;
        const rotationY = (offsetX / (rect.width / 2)) * rotateAmplitude;

        rotateX.set(rotationX);
        rotateY.set(rotationY);
        x.set(e.clientX - rect.left);
        y.set(e.clientY - rect.top);
    }

    function handleMouseEnter() {
        scale.set(scaleOnHover);
    }

    function handleMouseLeave() {
        scale.set(1);
        rotateX.set(0);
        rotateY.set(0);
    }

    return (
        <motion.div
            ref={internalRef}
            className={`card ${className}`}
            onMouseMove={handleMouse}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            style={{
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                width: containerWidth,
                height: containerHeight,
                perspective: '1000px',
                transformStyle: 'preserve-3d',
                rotateX,
                rotateY,
                scale,
                transition: 'none', // Disable CSS transition to avoid conflict with framer-motion
                cursor: props.onClick ? 'pointer' : 'default',
                ...externalStyle
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

import { useRef, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

const springValues = {
    damping: 30,
    stiffness: 100,
    mass: 2
};

const Card = ({ children, className = '', containerHeight = 'auto', containerWidth = '100%', rotateAmplitude = 12, scaleOnHover = 1.05, ...props }) => {
    const ref = useRef(null);
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const rotateX = useSpring(useMotionValue(0), springValues);
    const rotateY = useSpring(useMotionValue(0), springValues);
    const scale = useSpring(1, springValues);
    const opacity = useSpring(0);

    function handleMouse(e) {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
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
        opacity.set(1);
    }

    function handleMouseLeave() {
        opacity.set(0);
        scale.set(1);
        rotateX.set(0);
        rotateY.set(0);
    }

    return (
        <div
            ref={ref}
            className={`card-wrapper ${className}`}
            style={{
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                width: containerWidth,
                height: containerHeight,
                perspective: '1000px',
                ...props.style
            }}
            onMouseMove={handleMouse}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            {...props}
        >
            <motion.div
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
                    borderRadius: '12px',
                    transformStyle: 'preserve-3d',
                    rotateX,
                    rotateY,
                    scale
                }}
            >
                <div style={{
                    position: 'relative',
                    zIndex: 1,
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    transform: 'translateZ(20px)',
                    transformStyle: 'preserve-3d'
                }}>
                    {children}
                </div>
            </motion.div>
        </div>
    );
};

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

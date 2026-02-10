import { useRef, useState, forwardRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

const springValues = {
    damping: 30,
    stiffness: 100,
    mass: 2
};

const Card = forwardRef(({ children, className = '', tilt = true, ...props }, ref) => {
    const internalRef = useRef(null);
    const cardRef = ref || internalRef;

    // Motion values for tilt
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const rotateX = useSpring(useMotionValue(0), springValues);
    const rotateY = useSpring(useMotionValue(0), springValues);
    const scale = useSpring(1, springValues);
    const opacity = useSpring(0);

    function handleMouse(e) {
        if (!cardRef.current || !tilt) return;

        const rect = cardRef.current.getBoundingClientRect();
        const offsetX = e.clientX - rect.left - rect.width / 2;
        const offsetY = e.clientY - rect.top - rect.height / 2;

        const rotateAmplitude = 14;
        const rotationX = (offsetY / (rect.height / 2)) * -rotateAmplitude;
        const rotationY = (offsetX / (rect.width / 2)) * rotateAmplitude;

        rotateX.set(rotationX);
        rotateY.set(rotationY);

        x.set(e.clientX - rect.left);
        y.set(e.clientY - rect.top);
    }

    function handleMouseEnter() {
        scale.set(1.05);
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
            ref={cardRef}
            className={`card-wrapper ${className}`}
            onMouseMove={handleMouse}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            style={{
                perspective: '800px',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                transformStyle: 'preserve-3d'
            }}
            {...props}
        >
            <motion.div
                className="card"
                style={{
                    rotateX: tilt ? rotateX : 0,
                    rotateY: tilt ? rotateY : 0,
                    scale: scale,
                    transformStyle: 'preserve-3d',
                    width: '100%',
                    height: '100%',
                    position: 'relative',
                    transition: 'none', // Disable CSS transition for smooth framer-motion
                    ...props.style // Apply style here so borders/shadows tilt
                }}
            >
                {/* Glossy/Shine Overlay */}
                {tilt && (
                    <motion.div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'radial-gradient(circle at var(--mouse-x) var(--mouse-y), rgba(255,255,255,0.08), transparent 80%)',
                            opacity: opacity,
                            zIndex: 2,
                            pointerEvents: 'none',
                            borderRadius: 'inherit',
                            '--mouse-x': useTransform(x, (val) => `${val}px`),
                            '--mouse-y': useTransform(y, (val) => `${val}px`)
                        }}
                    />
                )}

                <div style={{ position: 'relative', zIndex: 1, transform: 'translateZ(20px)' }}>
                    {children}
                </div>
            </motion.div>
        </div>
    );
});

export default Card;

export function CardHeader({ children, className = '' }) {
    return (
        <div className={`card-header ${className}`}>
            {children}
        </div>
    );
}

export function CardBody({ children, className = '' }) {
    return (
        <div className={`card-body ${className}`}>
            {children}
        </div>
    );
}

export function CardFooter({ children, className = '' }) {
    return (
        <div className={`card-footer ${className}`}>
            {children}
        </div>
    );
}

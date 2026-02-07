import { useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

export default function Card({ children, className = '', tilt = true, ...props }) {
    const cardRef = useRef(null);

    // Motion values for tilt
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    // Smooth springs for rotation
    const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [10, -10]), { stiffness: 300, damping: 30 });
    const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-10, 10]), { stiffness: 300, damping: 30 });

    // Shine effect position
    const shineX = useSpring(useTransform(x, [-0.5, 0.5], [0, 100]), { stiffness: 300, damping: 30 });
    const shineY = useSpring(useTransform(y, [-0.5, 0.5], [0, 100]), { stiffness: 300, damping: 30 });

    const [isHovered, setIsHovered] = useState(false);

    const handleMouseMove = (e) => {
        if (!cardRef.current || !tilt) return;

        const rect = cardRef.current.getBoundingClientRect();

        // Calculate normalized mouse position (-0.5 to 0.5)
        const mouseX = (e.clientX - rect.left) / rect.width - 0.5;
        const mouseY = (e.clientY - rect.top) / rect.height - 0.5;

        x.set(mouseX);
        y.set(mouseY);
    };

    const handleMouseEnter = () => setIsHovered(true);
    const handleMouseLeave = () => {
        setIsHovered(false);
        x.set(0);
        y.set(0);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            onMouseMove={handleMouseMove}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            style={{
                perspective: 1000,
                rotateX: tilt ? rotateX : 0,
                rotateY: tilt ? rotateY : 0,
                scale: isHovered ? 1.02 : 1,
                zIndex: isHovered ? 10 : 1,
                ...props.style
            }}
            ref={cardRef}
            className={`card ${className}`}
            {...props}
        >
            {/* Glossy/Shine Overlay */}
            {tilt && (
                <motion.div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: `radial-gradient(circle at ${isHovered ? 'var(--shine-x)' : '50%'} ${isHovered ? 'var(--shine-y)' : '50%'}, rgba(255,255,255,0.1) 0%, transparent 80%)`,
                        opacity: isHovered ? 1 : 0,
                        zIndex: 2,
                        pointerEvents: 'none',
                        borderRadius: 'inherit',
                        '--shine-x': useTransform(shineX, s => `${s}%`),
                        '--shine-y': useTransform(shineY, s => `${s}%`)
                    }}
                />
            )}

            <div style={{ position: 'relative', zIndex: 1 }}>
                {children}
            </div>
        </motion.div>
    );
}
// Wait, if I replace the whole file, I lose the CardHeader/Body exports.
// I must include them. And the wrap approach is safer for conflicts.

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

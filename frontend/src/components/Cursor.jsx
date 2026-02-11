import { useState, useEffect } from 'react';
import { motion, useSpring, useMotionValue } from 'framer-motion';

export default function Cursor() {
    const [isHovered, setIsHovered] = useState(false);
    const [isTouchDevice, setIsTouchDevice] = useState(false);

    // Position motion values
    const mouseX = useMotionValue(-100);
    const mouseY = useMotionValue(-100);

    // Spring configuration for smooth trailing
    const springConfig = { damping: 25, stiffness: 200, mass: 0.5 };
    const bloomX = useSpring(mouseX, springConfig);
    const bloomY = useSpring(mouseY, springConfig);

    useEffect(() => {
        // Only disable custom cursor if actual touch interaction is detected
        const handleTouch = () => {
            setIsTouchDevice(true);
            document.body.classList.remove('custom-cursor-active');
        };

        // Enable custom cursor styles by default on non-touch first load
        if (!('ontouchstart' in window)) {
            document.body.classList.add('custom-cursor-active');
        }

        const handleMouseMove = (e) => {
            mouseX.set(e.clientX);
            mouseY.set(e.clientY);
        };

        const handleMouseOver = (e) => {
            const target = e.target;
            if (!target) return;

            const isInteractable =
                target.tagName === 'A' ||
                target.tagName === 'BUTTON' ||
                target.closest('a') ||
                target.closest('button') ||
                target.getAttribute('role') === 'button' ||
                target.closest('.card-wrapper') ||
                target.closest('.card') ||
                target.closest('.interactive-item') ||
                window.getComputedStyle(target).cursor === 'pointer';

            setIsHovered(!!isInteractable);
        };

        window.addEventListener('touchstart', handleTouch, { once: true });
        window.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseover', handleMouseOver);

        return () => {
            document.body.classList.remove('custom-cursor-active');
            window.removeEventListener('touchstart', handleTouch);
            window.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseover', handleMouseOver);
        };
    }, [mouseX, mouseY]);

    if (isTouchDevice) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 999999,
            overflow: 'hidden'
        }}>
            {/* Outer Glassy Bloom */}
            <motion.div
                style={{
                    position: 'absolute',
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(4px)',
                    x: bloomX,
                    y: bloomY,
                    translateX: '-50%',
                    translateY: '-50%',
                    mixBlendMode: 'difference',
                }}
                animate={{
                    scale: isHovered ? 1.8 : 1,
                    backgroundColor: isHovered ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                    borderColor: isHovered ? 'rgba(99, 102, 241, 0.4)' : 'rgba(255, 255, 255, 0.1)',
                }}
                transition={{ type: 'spring', damping: 20, stiffness: 250 }}
            />

            {/* Precision Inner Dot */}
            <motion.div
                style={{
                    position: 'absolute',
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    backgroundColor: 'white',
                    x: mouseX,
                    y: mouseY,
                    translateX: '-50%',
                    translateY: '-50%',
                    mixBlendMode: 'difference',
                    boxShadow: '0 0 10px rgba(255, 255, 255, 0.5)'
                }}
                animate={{
                    scale: isHovered ? 0.4 : 1,
                    opacity: 1
                }}
            />
        </div>
    );
}

import { useEffect, useRef } from 'react';

/**
 * Lightweight cursor effect using vanilla DOM manipulation.
 * No React state updates on mousemove = zero re-renders = zero lag.
 */
export default function GlowCursor() {
    const outerRef = useRef(null);
    const dotRef = useRef(null);

    useEffect(() => {
        // Skip on touch devices
        if ('ontouchstart' in window) return;

        const outer = outerRef.current;
        const dot = dotRef.current;
        if (!outer || !dot) return;

        let mouseX = -100, mouseY = -100;
        let outerX = -100, outerY = -100;
        let animId;

        const onMove = (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
            // Dot follows instantly via transform (no layout thrash)
            dot.style.transform = `translate(${mouseX - 3}px, ${mouseY - 3}px)`;
        };

        const onOver = (e) => {
            const t = e.target;
            const interactive =
                t.tagName === 'A' || t.tagName === 'BUTTON' ||
                t.closest('a') || t.closest('button') ||
                t.getAttribute('role') === 'button' ||
                t.closest('.card') ||
                window.getComputedStyle(t).cursor === 'pointer';
            outer.classList.toggle('cursor-hover', !!interactive);
        };

        // Smooth trailing via rAF (not React state)
        const lerp = (a, b, f) => a + (b - a) * f;
        const tick = () => {
            outerX = lerp(outerX, mouseX, 0.15);
            outerY = lerp(outerY, mouseY, 0.15);
            outer.style.transform = `translate(${outerX - 16}px, ${outerY - 16}px)`;
            animId = requestAnimationFrame(tick);
        };

        document.body.classList.add('has-glow-cursor');
        window.addEventListener('mousemove', onMove, { passive: true });
        document.addEventListener('mouseover', onOver, { passive: true });
        animId = requestAnimationFrame(tick);

        return () => {
            document.body.classList.remove('has-glow-cursor');
            window.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseover', onOver);
            cancelAnimationFrame(animId);
        };
    }, []);

    // Touch devices: render nothing
    if (typeof window !== 'undefined' && 'ontouchstart' in window) return null;

    return (
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 999999 }}>
            {/* Outer glow ring — lerped trail */}
            <div
                ref={outerRef}
                className="glow-cursor-outer"
                style={{
                    position: 'absolute',
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    border: '1.5px solid rgba(139, 92, 246, 0.4)',
                    background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)',
                    transition: 'width 0.25s, height 0.25s, border-color 0.25s, background 0.25s',
                    willChange: 'transform',
                }}
            />
            {/* Inner precision dot — instant */}
            <div
                ref={dotRef}
                style={{
                    position: 'absolute',
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: 'white',
                    boxShadow: '0 0 8px rgba(139, 92, 246, 0.6)',
                    willChange: 'transform',
                    mixBlendMode: 'difference',
                }}
            />
        </div>
    );
}

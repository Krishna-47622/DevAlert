import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

/* ═══════════════════════════════════════════════════════
   FILM GRAIN — full-viewport noise overlay (canvas)
   ═══════════════════════════════════════════════════════ */
function FilmGrain() {
    const canvasRef = useRef(null);
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let raf;
        const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
        resize();
        window.addEventListener('resize', resize);

        const draw = () => {
            const w = canvas.width, h = canvas.height;
            const imgData = ctx.createImageData(w, h);
            const d = imgData.data;
            for (let i = 0; i < d.length; i += 4) {
                const v = (Math.random() * 255) | 0;
                d[i] = d[i + 1] = d[i + 2] = v;
                d[i + 3] = 12; // very subtle
            }
            ctx.putImageData(imgData, 0, 0);
            raf = requestAnimationFrame(draw);
        };
        // Run grain at reduced framerate
        let last = 0;
        const throttled = (t) => {
            if (t - last > 80) { // ~12fps for grain
                last = t;
                const w = canvas.width, h = canvas.height;
                const imgData = ctx.createImageData(w, h);
                const d = imgData.data;
                for (let i = 0; i < d.length; i += 16) { // skip pixels for performance
                    const v = (Math.random() * 255) | 0;
                    d[i] = d[i + 1] = d[i + 2] = v;
                    d[i + 3] = 10;
                }
                ctx.putImageData(imgData, 0, 0);
            }
            raf = requestAnimationFrame(throttled);
        };
        raf = requestAnimationFrame(throttled);
        return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
    }, []);

    return <canvas ref={canvasRef} className="film-grain" />;
}

/* ═══════════════════════════════════════════════════════
   PARTICLE FIELD — floating sparks/embers
   ═══════════════════════════════════════════════════════ */
function ParticleField() {
    const canvasRef = useRef(null);
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let raf;
        const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
        resize();
        window.addEventListener('resize', resize);

        const particles = Array.from({ length: 60 }, () => ({
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            vx: (Math.random() - 0.5) * 0.3,
            vy: -Math.random() * 0.5 - 0.1,
            size: Math.random() * 2 + 0.5,
            opacity: Math.random() * 0.5 + 0.1,
            life: Math.random(),
        }));

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            for (const p of particles) {
                p.x += p.vx;
                p.y += p.vy;
                p.life += 0.002;
                if (p.y < -10 || p.life > 1) {
                    p.x = Math.random() * canvas.width;
                    p.y = canvas.height + 10;
                    p.life = 0;
                }
                const fade = 1 - Math.abs(p.life - 0.5) * 2;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity * fade})`;
                ctx.fill();
            }
            raf = requestAnimationFrame(animate);
        };
        raf = requestAnimationFrame(animate);
        return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
    }, []);

    return <canvas ref={canvasRef} className="particle-field" />;
}

/* ═══════════════════════════════════════════════════════
   HUD FRAME — tech border with corner accents
   ═══════════════════════════════════════════════════════ */
function HudFrame() {
    return (
        <div className="hud-frame">
            <div className="hud-corner hud-tl" />
            <div className="hud-corner hud-tr" />
            <div className="hud-corner hud-bl" />
            <div className="hud-corner hud-br" />
            <div className="hud-line hud-top" />
            <div className="hud-line hud-bottom" />
            <div className="hud-line hud-left" />
            <div className="hud-line hud-right" />
        </div>
    );
}

/* ═══════════════════════════════════════════════════════
   3D MOUSE PARALLAX HOOK
   ═══════════════════════════════════════════════════════ */
function useMouseParallax(intensity = 1) {
    const [pos, setPos] = useState({ x: 0, y: 0 });
    const target = useRef({ x: 0, y: 0 });
    const current = useRef({ x: 0, y: 0 });
    const raf = useRef(null);

    useEffect(() => {
        const onMove = (e) => {
            target.current.x = (e.clientX / window.innerWidth - 0.5) * intensity;
            target.current.y = (e.clientY / window.innerHeight - 0.5) * intensity;
        };
        window.addEventListener('mousemove', onMove);

        const lerp = () => {
            current.current.x += (target.current.x - current.current.x) * 0.06;
            current.current.y += (target.current.y - current.current.y) * 0.06;
            setPos({ x: current.current.x, y: current.current.y });
            raf.current = requestAnimationFrame(lerp);
        };
        raf.current = requestAnimationFrame(lerp);

        return () => {
            window.removeEventListener('mousemove', onMove);
            cancelAnimationFrame(raf.current);
        };
    }, [intensity]);

    return pos;
}

/* ═══════════════════════════════════════════════════════
   TEXT REVEAL — character-by-character stagger
   ═══════════════════════════════════════════════════════ */
function RevealText({ text, className, delay = 0 }) {
    return (
        <span className={className} aria-label={text}>
            {text.split('').map((char, i) => (
                <motion.span
                    key={i}
                    initial={{ opacity: 0, y: 40, rotateX: -90 }}
                    whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
                    viewport={{ once: true }}
                    transition={{
                        duration: 0.5,
                        delay: delay + i * 0.03,
                        ease: [0.22, 1, 0.36, 1],
                    }}
                    style={{ display: 'inline-block', transformOrigin: 'bottom', willChange: 'transform' }}
                >
                    {char === ' ' ? '\u00A0' : char}
                </motion.span>
            ))}
        </span>
    );
}

/* ═══════════════════════════════════════════════════════
   ANIMATED COUNTER
   ═══════════════════════════════════════════════════════ */
function AnimatedCounter({ end, suffix = '', duration = 2000 }) {
    const [count, setCount] = useState(0);
    const ref = useRef(null);
    const counted = useRef(false);

    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting && !counted.current) {
                counted.current = true;
                const start = performance.now();
                const tick = (now) => {
                    const progress = Math.min((now - start) / duration, 1);
                    const eased = 1 - Math.pow(1 - progress, 3);
                    setCount(Math.floor(eased * end));
                    if (progress < 1) requestAnimationFrame(tick);
                };
                requestAnimationFrame(tick);
            }
        }, { threshold: 0.3 });
        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, [end, duration]);

    return <span ref={ref}>{count}{suffix}</span>;
}

/* ═══════════════════════════════════════════════════════
   MAIN LANDING PAGE
   ═══════════════════════════════════════════════════════ */
export default function LandingPage() {
    const navigate = useNavigate();
    const mouse = useMouseParallax(30);
    const containerRef = useRef(null);
    const { scrollYProgress } = useScroll({ target: containerRef });
    const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);
    const heroScale = useTransform(scrollYProgress, [0, 0.15], [1, 0.95]);

    const features = [
        { icon: 'auto_awesome', title: 'AI-Powered Scan', desc: 'Our AI scans 50+ sources every hour — hackathons, internships, and research programs found automatically.' },
        { icon: 'speed', title: 'Real-Time Alerts', desc: 'Get notified the moment a new opportunity matches your profile. Never miss a deadline again.' },
        { icon: 'person_search', title: 'Smart Matching', desc: 'AI reads your resume and skills to generate a match score for every opportunity.' },
        { icon: 'track_changes', title: 'Application Tracker', desc: 'Track your entire pipeline — saved, applied, interviewing, offered — all in one dashboard.' },
        { icon: 'shield', title: 'Verified Sources', desc: 'Every listing is verified against the original source. Dead links and expired events are auto-filtered.' },
        { icon: 'hub', title: 'Host Events', desc: 'Organizations can post their own hackathons and internships directly on the platform.' },
    ];

    return (
        <div className="landing-page" ref={containerRef}>
            <FilmGrain />
            <ParticleField />
            <HudFrame />

            {/* ═══ HERO SECTION ═══ */}
            <motion.section className="hero-section" style={{ opacity: heroOpacity, scale: heroScale }}>
                {/* Ambient glow orbs behind content */}
                <div className="hero-ambient">
                    <div
                        className="ambient-orb ambient-orb-1"
                        style={{ transform: `translate(${mouse.x * 0.5}px, ${mouse.y * 0.5}px)` }}
                    />
                    <div
                        className="ambient-orb ambient-orb-2"
                        style={{ transform: `translate(${mouse.x * -0.3}px, ${mouse.y * -0.3}px)` }}
                    />
                </div>

                {/* 3D Parallax Floating Element */}
                <motion.div
                    className="hero-3d-element"
                    style={{
                        transform: `perspective(800px) rotateY(${mouse.x * 0.8}deg) rotateX(${-mouse.y * 0.8}deg) translate(${mouse.x * 0.6}px, ${mouse.y * 0.6}px)`,
                    }}
                >
                    <div className="hero-3d-shape">
                        <div className="shape-face shape-front" />
                        <div className="shape-face shape-back" />
                        <div className="shape-face shape-left" />
                        <div className="shape-face shape-right" />
                        <div className="shape-face shape-top" />
                        <div className="shape-inner-glow" />
                    </div>
                </motion.div>

                {/* Hero Content */}
                <div className="hero-content-wrapper">
                    <motion.div
                        className="hero-label"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3, duration: 0.6 }}
                    >
                        <span className="label-dot" />
                        AI-POWERED OPPORTUNITY ENGINE
                    </motion.div>

                    <h1 className="hero-mega-title">
                        <RevealText text="NEVER MISS" className="mega-line" delay={0.5} />
                        <br />
                        <RevealText text="AN OPPORTUNITY" className="mega-line mega-outline" delay={0.8} />
                    </h1>

                    <motion.p
                        className="hero-tagline"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1.5, duration: 0.8 }}
                    >
                        Where ambitious minds <span className="tagline-accent">fuse with</span> the digital universe
                    </motion.p>

                    <motion.div
                        className="hero-cta-row"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.8, duration: 0.6 }}
                    >
                        <button className="cta-btn cta-primary-bb" onClick={() => navigate('/login')}>
                            <span>GET STARTED</span>
                            <span className="material-icons cta-icon">arrow_forward</span>
                        </button>
                        <button className="cta-btn cta-outline-bb" onClick={() => navigate('/about')}>
                            <span>LEARN MORE</span>
                            <span className="material-icons cta-icon">expand_more</span>
                        </button>
                    </motion.div>

                    {/* Stats bar */}
                    <motion.div
                        className="hero-stats-bar"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 2.2, duration: 0.8 }}
                    >
                        <div className="stat-block">
                            <span className="stat-val"><AnimatedCounter end={500} suffix="+" /></span>
                            <span className="stat-lbl">OPPORTUNITIES</span>
                        </div>
                        <div className="stat-divider" />
                        <div className="stat-block">
                            <span className="stat-val"><AnimatedCounter end={50} suffix="+" /></span>
                            <span className="stat-lbl">SOURCES</span>
                        </div>
                        <div className="stat-divider" />
                        <div className="stat-block">
                            <span className="stat-val"><AnimatedCounter end={24} suffix="/7" /></span>
                            <span className="stat-lbl">AI SCANNING</span>
                        </div>
                    </motion.div>
                </div>
            </motion.section>

            {/* ═══ FEATURES SECTION ═══ */}
            <section className="features-section-bb">
                <motion.div
                    className="section-header-bb"
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                >
                    <span className="section-tag">CAPABILITIES</span>
                    <h2 className="section-title-bb">
                        BUILT FOR THE <span className="title-accent">FUTURE</span>
                    </h2>
                </motion.div>

                <div className="features-grid-bb">
                    {features.map((f, i) => (
                        <motion.div
                            key={i}
                            className="feature-card-bb"
                            initial={{ opacity: 0, y: 30, rotateX: -5 }}
                            whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                            whileHover={{ y: -6, transition: { duration: 0.2 } }}
                        >
                            <div className="feature-icon-bb">
                                <span className="material-icons">{f.icon}</span>
                            </div>
                            <h3>{f.title}</h3>
                            <p>{f.desc}</p>
                            <div className="feature-card-shine" />
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* ═══ CTA SECTION ═══ */}
            <section className="cta-section-bb">
                <motion.div
                    className="cta-block-bb"
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.7 }}
                >
                    <span className="section-tag">JOIN NOW</span>
                    <h2 className="cta-title-bb">
                        JOIN THE<br />
                        <span className="title-accent">REVOLUTION</span>
                    </h2>
                    <p className="cta-desc-bb">
                        Stop searching. Start discovering. DevAlert brings every opportunity directly to you.
                    </p>
                    <button className="cta-btn cta-primary-bb cta-lg" onClick={() => navigate('/login')}>
                        <span>GET STARTED FREE</span>
                        <span className="material-icons cta-icon">arrow_forward</span>
                    </button>
                </motion.div>
            </section>
        </div>
    );
}

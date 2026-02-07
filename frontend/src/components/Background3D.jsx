import { useEffect, useRef } from 'react';

export default function Background3D() {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let width = window.innerWidth;
        let height = window.innerHeight;
        let animationFrameId;

        canvas.width = width;
        canvas.height = height;

        const particles = [];
        const particleCount = 100;

        class Particle {
            constructor() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.z = Math.random() * width; // Depth
                this.size = Math.random() * 2;
                this.speed = Math.random() * 0.5 + 0.1;
            }

            update() {
                this.z -= this.speed * 2;
                if (this.z <= 0) {
                    this.z = width;
                    this.x = Math.random() * width;
                    this.y = Math.random() * height;
                }
            }

            draw() {
                // Perspective projection
                const x3d = (this.x - width / 2) * (width / this.z) + width / 2;
                const y3d = (this.y - height / 2) * (width / this.z) + height / 2;
                const size3d = (width / this.z) * this.size;

                // Opacity based on depth
                const alpha = Math.min(1, (width - this.z) / width);

                ctx.fillStyle = `rgba(99, 102, 241, ${alpha})`; // Indigo glow
                ctx.beginPath();
                ctx.arc(x3d, y3d, size3d, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        const init = () => {
            for (let i = 0; i < particleCount; i++) {
                particles.push(new Particle());
            }
        };

        const animate = () => {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'; // Trail effect
            ctx.fillRect(0, 0, width, height);

            particles.forEach(particle => {
                particle.update();
                particle.draw();
            });

            animationFrameId = requestAnimationFrame(animate);
        };

        const handleResize = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;
        };

        init();
        animate();
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                zIndex: -1,
                background: 'linear-gradient(to bottom, #000000, #0a0a0a)',
                pointerEvents: 'none' // Click-through
            }}
        />
    );
}

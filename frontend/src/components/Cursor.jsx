import { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sphere, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';

function CursorMesh() {
    const sphereRef = useRef();
    const materialRef = useRef();
    const { viewport } = useThree();
    const [hovered, setHovered] = useState(false);

    // Custom mouse tracking since pointer-events: none is on the canvas
    const mouseRef = useRef({ x: 0, y: 0 });

    useEffect(() => {
        const handleMouseMove = (e) => {
            // Normalize mouse position to -1 to 1
            mouseRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
            mouseRef.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
        };

        const handleMouseOver = (e) => {
            if (e.target.tagName === 'A' || e.target.tagName === 'BUTTON' || e.target.closest('a') || e.target.closest('button') || e.target.getAttribute('role') === 'button') {
                setHovered(true);
            } else {
                setHovered(false);
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseover', handleMouseOver);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseover', handleMouseOver);
        };
    }, []);

    useFrame(() => {
        if (sphereRef.current) {
            // Convert normalized custom mouse coordinates to viewport coordinates
            const x = (mouseRef.current.x * viewport.width) / 2;
            const y = (mouseRef.current.y * viewport.height) / 2;

            // Smooth lerp to the mouse position
            sphereRef.current.position.lerp(new THREE.Vector3(x, y, 0), 0.2); // Increased lerp for better responsiveness

            // Scale animation based on hover
            const targetScale = hovered ? 1.4 : 1;
            sphereRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.15);
        }

        if (materialRef.current) {
            // Smooth color transition
            const targetColor = new THREE.Color(hovered ? "#6366f1" : "#ffffff"); // Indigo on hover, White normally
            materialRef.current.color.lerp(targetColor, 0.1);
            materialRef.current.emissive.lerp(targetColor, 0.1);
        }
    });

    return (
        <Sphere ref={sphereRef} args={[0.05, 32, 32]}>
            <MeshDistortMaterial
                ref={materialRef}
                color="#ffffff"
                emissive="#ffffff"
                emissiveIntensity={0.6}
                distort={0.4}
                speed={3}
                roughness={0.1}
                metalness={0.9}
            />
        </Sphere>
    );
}

export default function Cursor() {
    const [isTouchDevice, setIsTouchDevice] = useState(false);

    useEffect(() => {
        const checkTouch = () => {
            setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
        };
        checkTouch();

        if (!('ontouchstart' in window || navigator.maxTouchPoints > 0)) {
            document.body.classList.add('custom-cursor-active');
        }

        return () => {
            document.body.classList.remove('custom-cursor-active');
        };
    }, []);

    if (isTouchDevice) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            pointerEvents: 'none',
            zIndex: 999999, // Extremely high z-index
            mixBlendMode: 'difference' // Added for better visibility
        }}>
            <Canvas
                orthographic
                events={null}
                camera={{ position: [0, 0, 10], zoom: 100 }}
                gl={{
                    alpha: true,
                    antialias: true,
                    powerPreference: "high-performance",
                }}
                style={{ background: 'transparent', pointerEvents: 'none' }}
            >
                <ambientLight intensity={1} />
                <CursorMesh />
            </Canvas>
        </div>
    );
}

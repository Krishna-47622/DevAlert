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
            sphereRef.current.position.lerp(new THREE.Vector3(x, y, 0), 0.15);

            // Scale animation based on hover
            const targetScale = hovered ? 1.3 : 1;
            sphereRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
        }

        if (materialRef.current) {
            // Smooth color transition
            const targetColor = new THREE.Color(hovered ? "#ff0000" : "#ffffff"); // Red on hover, White normally
            materialRef.current.color.lerp(targetColor, 0.05); // Slower transition (0.05)
            materialRef.current.emissive.lerp(targetColor, 0.05);
        }
    });

    return (
        <Sphere ref={sphereRef} args={[0.06, 32, 32]}>
            <MeshDistortMaterial
                ref={materialRef}
                color="#ffffff"
                emissive="#ffffff"
                emissiveIntensity={0.5}
                distort={0.3}
                speed={2}
                roughness={0.2}
                metalness={0.8}
            />
        </Sphere>
    );
}

export default function Cursor() {
    return (
        <div style={{
            position: 'fixed',
            top: 0,
            width: '100vw',
            height: '100vh',
            pointerEvents: 'none',
            zIndex: 20000
        }}>
            <Canvas
                orthographic
                events={null} // Disable R3F event system
                camera={{ position: [0, 0, 10], zoom: 100 }}
                gl={{
                    alpha: true,
                    antialias: true,
                    powerPreference: "high-performance",
                    preserveDrawingBuffer: true
                }}
                style={{ background: 'transparent', pointerEvents: 'none' }}
            >
                <ambientLight intensity={0.6} />
                <pointLight position={[10, 10, 10]} intensity={1.5} />
                <pointLight position={[-10, -10, 10]} intensity={0.5} />

                <CursorMesh />
            </Canvas>
        </div>
    );
}

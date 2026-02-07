import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float, MeshDistortMaterial, Sphere, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

function Scene({ globalMouse }) {
    const groupRef = useRef();
    const { viewport } = useThree();

    // Create 3 refs for the drops
    const drop1 = useRef();
    const drop2 = useRef();
    const drop3 = useRef();

    useFrame((state) => {
        const time = state.clock.getElapsedTime();

        // Animate individual drops with slightly different speeds
        if (drop1.current) {
            drop1.current.rotation.x = time * 0.2;
            drop1.current.rotation.y = time * 0.3;
        }
        if (drop2.current) {
            drop2.current.rotation.x = time * 0.25;
            drop2.current.rotation.z = time * 0.2;
        }
        if (drop3.current) {
            drop3.current.rotation.y = time * 0.3;
            drop3.current.rotation.z = time * 0.15;
        }

        // Group smoothly follows mouse with easing
        if (groupRef.current) {
            const x = globalMouse.current.x * (viewport.width / 4);
            const y = globalMouse.current.y * (viewport.height / 4);
            groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, x, 0.05);
            groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, y, 0.05);
        }
    });

    return (
        <>
            <ambientLight intensity={0.2} />
            <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} color="#ffffff" />
            <pointLight position={[-10, -10, -10]} intensity={0.5} color="#6366f1" />

            <group ref={groupRef}>
                {/* Drop 1 */}
                <Float speed={2} rotationIntensity={0.5} floatIntensity={1} position={[0, 0, 0]}>
                    <Sphere ref={drop1} args={[0.5, 64, 64]}>
                        <MeshDistortMaterial
                            color="#f8fafc"
                            roughness={0.2}
                            metalness={0.5}
                            distort={0.4}
                            speed={2}
                            radius={0.5}
                        />
                    </Sphere>
                </Float>

                {/* Drop 2 */}
                <Float speed={3} rotationIntensity={0.4} floatIntensity={1.2} position={[1.5, 0.8, -1]}>
                    <Sphere ref={drop2} args={[0.3, 64, 64]}>
                        <MeshDistortMaterial
                            color="#e2e8f0"
                            roughness={0.2}
                            metalness={0.5}
                            distort={0.5}
                            speed={2.5}
                            radius={0.3}
                        />
                    </Sphere>
                </Float>

                {/* Drop 3 */}
                <Float speed={2.5} rotationIntensity={0.3} floatIntensity={0.8} position={[-1.2, -1, -0.5]}>
                    <Sphere ref={drop3} args={[0.4, 64, 64]}>
                        <MeshDistortMaterial
                            color="#cbd5e1"
                            roughness={0.2}
                            metalness={0.5}
                            distort={0.3}
                            speed={1.5}
                            radius={0.4}
                        />
                    </Sphere>
                </Float>
            </group>

            <ContactShadows position={[0, -2, 0]} opacity={0.3} scale={10} blur={2.5} far={4} color="#000000" />
        </>
    );
}

export default function DeveloperBackground() {
    const mouse = useRef({ x: 0, y: 0 });

    useEffect(() => {
        const handleMouseMove = (event) => {
            mouse.current = {
                x: (event.clientX / window.innerWidth) * 2 - 1,
                y: -(event.clientY / window.innerHeight) * 2 + 1
            };
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            zIndex: -1,
            background: 'radial-gradient(circle at center, #111111 0%, #000000 100%)',
            pointerEvents: 'none',
            overflow: 'hidden'
        }}>
            <Canvas
                camera={{ position: [0, 0, 6], fov: 40 }}
                gl={{
                    alpha: true,
                    antialias: true,
                    powerPreference: "high-performance",
                    preserveDrawingBuffer: true
                }}
            >
                <Scene globalMouse={mouse} />
            </Canvas>
        </div>
    );
}

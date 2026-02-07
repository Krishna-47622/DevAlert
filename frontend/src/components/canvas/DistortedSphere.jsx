import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, MeshDistortMaterial } from '@react-three/drei';
import { useRef } from 'react';

function AnimatedSphere() {
    const sphereRef = useRef();

    useFrame(({ clock }) => {
        const t = clock.getElapsedTime();
        if (sphereRef.current) {
            sphereRef.current.rotation.x = t * 0.1;
            sphereRef.current.rotation.y = t * 0.15;
        }
    });

    return (
        <Sphere visible args={[1, 100, 200]} scale={2.2}>
            <MeshDistortMaterial
                color="#1f1f2e" // Dark blue-grey base
                attach="material"
                distort={0.4}
                speed={2}
                roughness={0.2}
                metalness={0.9} // Metallic look
                bumpScale={0.005}
            />
        </Sphere>
    );
}

export default function DistortedSphere() {
    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: -1,
            pointerEvents: 'none', // Allow clicks to pass through
            background: '#000000'
        }}>
            <Canvas camera={{ position: [0, 0, 5], fov: 75 }}>
                <ambientLight intensity={0.5} />
                <directionalLight position={[10, 10, 5]} intensity={1.5} color="#6366f1" />
                <directionalLight position={[-10, -10, -5]} intensity={1} color="#0ea5e9" />
                <pointLight position={[0, -10, 0]} intensity={0.5} color="white" />
                <AnimatedSphere />
            </Canvas>
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                background: 'rgba(0,0,0,0.3)', // Overlay to darken for text readability
                backdropFilter: 'blur(20px)', // Strong blur for "frosted glass" depth
                zIndex: 1
            }}></div>
        </div>
    );
}

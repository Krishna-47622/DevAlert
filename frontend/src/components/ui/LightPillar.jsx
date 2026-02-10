import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const LightPillarShader = {
    uniforms: {
        uTime: { value: 0 },
        uTopColor: { value: new THREE.Color("#5227FF") },
        uBottomColor: { value: new THREE.Color("#FF9FFC") },
        uIntensity: { value: 1.0 },
        uGlowAmount: { value: 0.5 },
        uPillarWidth: { value: 3.0 },
        uPillarHeight: { value: 10.0 },
        uNoiseIntensity: { value: 0.1 },
        uMouse: { value: new THREE.Vector2(0, 0) }
    },
    vertexShader: `
    varying vec2 vUv;
    varying vec3 vPosition;
    void main() {
      vUv = uv;
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
    fragmentShader: `
    uniform float uTime;
    uniform vec3 uTopColor;
    uniform vec3 uBottomColor;
    uniform float uIntensity;
    uniform float uGlowAmount;
    uniform float uPillarWidth;
    uniform float uPillarHeight;
    uniform float uNoiseIntensity;
    uniform vec2 uMouse;
    varying vec2 vUv;
    varying vec3 vPosition;

    // Pseudo-random noise
    float noise(vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
    }

    void main() {
      // Interactive mouse offset
      float mouseEffect = uMouse.x * 0.5;
      float xPos = vPosition.x - mouseEffect;
      
      float distanceToCenter = abs(xPos) / (uPillarWidth * 0.5);
      float alpha = 1.0 - smoothstep(0.0, 1.0, distanceToCenter);
      
      // Vertical gradient
      vec3 color = mix(uBottomColor, uTopColor, vUv.y);
      
      // Add glow (using uGlowAmount as a factor)
      float glow = exp(-distanceToCenter * (1.0 / max(uGlowAmount, 0.0001))) * 0.5;
      alpha += glow;
      
      // Add animated noise/shimmer
      float n = noise(vUv * 10.0 + uTime * 0.05) * uNoiseIntensity;
      alpha *= (1.0 - n);
      
      // Apply intensity
      alpha *= uIntensity;
      
      // Heavy fade at top and bottom to create "pillar" look
      float fade = smoothstep(0.0, 0.1, vUv.y) * (1.0 - smoothstep(0.9, 1.0, vUv.y));
      alpha *= fade;

      gl_FragColor = vec4(color, alpha);
    }
  `
};

function PillarMesh({
    topColor,
    bottomColor,
    intensity,
    glowAmount,
    pillarWidth,
    pillarHeight,
    noiseIntensity,
    rotationSpeed,
    pillarRotation,
    interactive
}) {
    const meshRef = useRef();
    const mouse = useRef(new THREE.Vector2(0, 0));

    const uniforms = useMemo(() => ({
        uTime: { value: 0 },
        uTopColor: { value: new THREE.Color(topColor || "#5227FF") },
        uBottomColor: { value: new THREE.Color(bottomColor || "#FF9FFC") },
        uIntensity: { value: intensity ?? 1.0 },
        uGlowAmount: { value: glowAmount ?? 0.5 },
        uPillarWidth: { value: (pillarWidth ?? 3.0) * 2.0 }, // Scaled for better visual
        uPillarHeight: { value: (pillarHeight ?? 10.0) * 10.0 }, // Scaled if user uses small decimals
        uNoiseIntensity: { value: noiseIntensity ?? 0.1 },
        uMouse: { value: mouse.current }
    }), [topColor, bottomColor, intensity, glowAmount, pillarWidth, pillarHeight, noiseIntensity]);

    useEffect(() => {
        if (!interactive) return;

        const handleMouseMove = (event) => {
            mouse.current.x = (event.clientX / window.innerWidth) * 2 - 1;
            mouse.current.y = -(event.clientY / window.innerHeight) * 2 + 1;
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [interactive]);

    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.material.uniforms.uTime.value = state.clock.getElapsedTime();
            if (rotationSpeed) {
                meshRef.current.rotation.z += rotationSpeed * 0.005;
            }
            if (interactive) {
                meshRef.current.material.uniforms.uMouse.value.lerp(mouse.current, 0.05);
            }
        }
    });

    // Apply initial rotation
    const finalRotation = useMemo(() => {
        return (pillarRotation || 0) * (Math.PI / 180);
    }, [pillarRotation]);

    return (
        <mesh ref={meshRef} rotation={[0, 0, finalRotation]}>
            <planeGeometry args={[(pillarWidth ?? 3.0) * 5.0, (pillarHeight ?? 10.0) * 50.0, 32, 32]} />
            <shaderMaterial
                vertexShader={LightPillarShader.vertexShader}
                fragmentShader={LightPillarShader.fragmentShader}
                uniforms={uniforms}
                transparent={true}
                blending={THREE.AdditiveBlending}
                side={THREE.DoubleSide}
                depthWrite={false}
            />
        </mesh>
    );
}

export default function LightPillar({
    topColor = "#5227FF",
    bottomColor = "#FF9FFC",
    intensity = 1.0,
    glowAmount = 0.5,
    pillarWidth = 3.0,
    pillarHeight = 10.0,
    noiseIntensity = 0.1,
    rotationSpeed = 0.3,
    interactive = false,
    pillarRotation = 0
}) {
    return (
        <div style={{
            width: '100%',
            height: '100%',
            position: 'absolute',
            top: 0,
            left: 0,
            pointerEvents: 'none',
            overflow: 'hidden'
        }}>
            <Canvas
                camera={{ position: [0, 0, 10], fov: 75 }}
                gl={{ antialias: true, alpha: true }}
            >
                <PillarMesh
                    topColor={topColor}
                    bottomColor={bottomColor}
                    intensity={intensity}
                    glowAmount={glowAmount}
                    pillarWidth={pillarWidth}
                    pillarHeight={pillarHeight}
                    noiseIntensity={noiseIntensity}
                    rotationSpeed={rotationSpeed}
                    pillarRotation={pillarRotation}
                    interactive={interactive}
                />
            </Canvas>
        </div>
    );
}

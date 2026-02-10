import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const AuroraShader = {
    uniforms: {
        uTime: { value: 0 },
        uColorStops: {
            value: [
                new THREE.Color("#2422aa"),
                new THREE.Color("#3f2d7c"),
                new THREE.Color("#5227ff"),
                new THREE.Color("#9c0202"),
                new THREE.Color("#7a1a1a")
            ]
        },
        uAmplitude: { value: 1.0 },
        uBlend: { value: 0.5 },
        uResolution: { value: new THREE.Vector2() }
    },
    vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
    fragmentShader: `
    uniform float uTime;
    uniform vec3 uColorStops[5];
    uniform float uAmplitude;
    uniform float uBlend;
    uniform vec2 uResolution;
    varying vec2 vUv;

    // Simplex 2D noise
    vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
    float snoise(vec2 v) {
      const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
      vec2 i  = floor(v + dot(v, C.yy) );
      vec2 x0 = v -   i + dot(i, C.xx);
      vec2 i1;
      i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
      vec4 x12 = x0.xyxy + C.xxzz;
      x12.xy -= i1;
      i = mod(i, 289.0);
      vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
      vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
      m = m*m ;
      m = m*m ;
      vec3 x = 2.0 * fract(p * C.www) - 1.0;
      vec3 h = abs(x) - 0.5;
      vec3 ox = floor(x + 0.5);
      vec3 a0 = x - ox;
      m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
      vec3 g;
      g.x  = a0.x  * x0.x  + h.x  * x0.y;
      g.yz = a0.yz * x12.xz + h.yz * x12.yw;
      return 130.0 * dot(m, g);
    }

    void main() {
      vec2 uv = vUv;
      float noise = snoise(uv * 2.0 + uTime * 0.1) * 0.5 + 0.5;
      float noise2 = snoise(uv * 4.0 - uTime * 0.05) * 0.5 + 0.5;
      
      float aurora = pow(noise * noise2, 1.5) * uAmplitude;
      
      vec3 color = mix(uColorStops[0], uColorStops[1], uv.x);
      color = mix(color, uColorStops[2], uv.y);
      color = mix(color, uColorStops[3], noise);
      color = mix(color, uColorStops[4], noise2);
      
      gl_FragColor = vec4(color * aurora, aurora * uBlend);
    }
  `
};

function AuroraContent({ colorStops, amplitude, blend }) {
    const mesh = useRef();
    const { size } = useThree();

    const uniforms = useMemo(() => ({
        uTime: { value: 0 },
        uColorStops: { value: colorStops.map(c => new THREE.Color(c)) },
        uAmplitude: { value: amplitude || 1.0 },
        uBlend: { value: blend || 0.5 },
        uResolution: { value: new THREE.Vector2(size.width, size.height) }
    }), [colorStops, amplitude, blend, size]);

    useFrame((state) => {
        if (mesh.current) {
            mesh.current.material.uniforms.uTime.value = state.clock.getElapsedTime();
        }
    });

    return (
        <mesh ref={mesh}>
            <planeGeometry args={[20, 20]} />
            <shaderMaterial
                fragmentShader={AuroraShader.fragmentShader}
                vertexShader={AuroraShader.vertexShader}
                uniforms={uniforms}
                transparent={true}
                blending={THREE.AdditiveBlending}
            />
        </mesh>
    );
}

export default function Aurora({ colorStops = ["#2422aa", "#3f2d7c", "#5227ff", "#9c0202", "#7a1a1a"], amplitude = 1.0, blend = 0.5 }) {
    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            zIndex: -1,
            background: '#000000',
            pointerEvents: 'none',
            overflow: 'hidden'
        }}>
            <Canvas camera={{ position: [0, 0, 1] }}>
                <AuroraContent colorStops={colorStops} amplitude={amplitude} blend={blend} />
            </Canvas>
        </div>
    );
}

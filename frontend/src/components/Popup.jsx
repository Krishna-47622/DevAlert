import { useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { MeshDistortMaterial, Sphere, Float } from '@react-three/drei';
import * as THREE from 'three';

function PopupMesh({ type }) {
    const meshRef = useRef();

    // Color mapping based on type
    const colors = {
        success: "#10b981", // Green
        error: "#ef4444",   // Red
        warning: "#f59e0b", // Amber
        confirm: "#3b82f6"  // Blue
    };

    const color = colors[type] || colors.confirm;

    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.rotation.x = state.clock.getElapsedTime() * 0.5;
            meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.5;
        }
    });

    return (
        <Float speed={2} rotationIntensity={1} floatIntensity={1}>
            <Sphere ref={meshRef} args={[1, 32, 32]} scale={1.5}>
                <MeshDistortMaterial
                    color={color}
                    emissive={color}
                    emissiveIntensity={0.5}
                    distort={0.4}
                    speed={2}
                    roughness={0}
                />
            </Sphere>
        </Float>
    );
}

export default function Popup({ isOpen, onClose, title, message, type = 'info', onConfirm }) {
    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            backdropFilter: 'blur(5px)'
        }} onClick={onClose}>
            <div style={{
                position: 'relative',
                width: '90%',
                maxWidth: '500px',
                backgroundColor: 'rgba(20, 20, 20, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '16px',
                padding: '2rem',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                color: 'white',
                overflow: 'hidden',
                animation: 'popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
            }} onClick={(e) => e.stopPropagation()}>

                {/* 3D Background Element */}
                <div style={{
                    position: 'absolute',
                    top: '-50px',
                    right: '-50px',
                    width: '200px',
                    height: '200px',
                    opacity: 0.5,
                    pointerEvents: 'none'
                }}>
                    <Canvas>
                        <ambientLight intensity={1} />
                        <pointLight position={[10, 10, 10]} />
                        <PopupMesh type={type} />
                    </Canvas>
                </div>

                <h2 style={{
                    marginTop: 0,
                    marginBottom: '1rem',
                    fontSize: '1.5rem',
                    fontWeight: 'bold',
                    position: 'relative',
                    zIndex: 1
                }}>{title}</h2>

                <p style={{
                    marginBottom: '2rem',
                    color: '#a1a1aa',
                    lineHeight: '1.6',
                    position: 'relative',
                    zIndex: 1
                }}>{message}</p>

                <div style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '1rem',
                    position: 'relative',
                    zIndex: 1
                }}>
                    {type === 'confirm' ? (
                        <>
                            <button
                                onClick={onClose}
                                style={{
                                    padding: '0.75rem 1.5rem',
                                    backgroundColor: 'transparent',
                                    border: '1px solid #3f3f46',
                                    borderRadius: '8px',
                                    color: 'white',
                                    cursor: 'pointer',
                                    fontWeight: '500',
                                    transition: 'all 0.2s'
                                }}
                                onMouseOver={(e) => e.target.style.backgroundColor = '#27272a'}
                                onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    onConfirm();
                                    onClose();
                                }}
                                style={{
                                    padding: '0.75rem 1.5rem',
                                    backgroundColor: '#ef4444',
                                    border: 'none',
                                    borderRadius: '8px',
                                    color: 'white',
                                    cursor: 'pointer',
                                    fontWeight: '500',
                                    boxShadow: '0 4px 6px -1px rgba(239, 68, 68, 0.2)',
                                    transition: 'all 0.2s'
                                }}
                                onMouseOver={(e) => e.target.style.backgroundColor = '#dc2626'}
                                onMouseOut={(e) => e.target.style.backgroundColor = '#ef4444'}
                            >
                                Confirm
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={onClose}
                            style={{
                                padding: '0.75rem 1.5rem',
                                backgroundColor: '#3b82f6',
                                border: 'none',
                                borderRadius: '8px',
                                color: 'white',
                                cursor: 'pointer',
                                fontWeight: '500',
                                boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.2)',
                                transition: 'all 0.2s'
                            }}
                            onMouseOver={(e) => e.target.style.backgroundColor = '#2563eb'}
                            onMouseOut={(e) => e.target.style.backgroundColor = '#3b82f6'}
                        >
                            Okay
                        </button>
                    )}
                </div>
            </div>
            <style>{`
                @keyframes popIn {
                    from { opacity: 0; transform: scale(0.9) translateY(10px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
            `}</style>
        </div>
    );
}

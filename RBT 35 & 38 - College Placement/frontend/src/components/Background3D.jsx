import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';

// Error boundary to gracefully handle environments without WebGL support
class WebGLErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.warn('WebGL / Background3D unavailable, falling back:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div 
          className="fixed inset-0 pointer-events-none bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 opacity-90"
          style={{ zIndex: -1 }} 
        />
      );
    }
    return this.props.children;
  }
}

// Low-count subtle particle field (< 250 points)
function ParticleField({ count = 220, reducedMotion = false }) {
  const pointsRef = useRef();

  const [positions, colors] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const palette = [
      [0.31, 0.27, 0.90], // indigo (#4f46e5)
      [0.23, 0.51, 0.96], // blue (#3b82f6)
      [0.55, 0.36, 0.96], // purple (#8b5cf6)
      [0.22, 0.74, 0.97], // sky (#38bdf8)
      [0.65, 0.52, 0.98]  // violet (#a78bfa)
    ];

    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 32;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 28;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 22 - 3;

      const c = palette[Math.floor(Math.random() * palette.length)];
      col[i * 3] = c[0];
      col[i * 3 + 1] = c[1];
      col[i * 3 + 2] = c[2];
    }
    return [pos, col];
  }, [count]);

  useFrame((state, delta) => {
    if (!reducedMotion && pointsRef.current) {
      pointsRef.current.rotation.y += delta * 0.025;
      pointsRef.current.rotation.x += delta * 0.012;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={count}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.1}
        vertexColors
        transparent
        opacity={0.55}
        sizeAttenuation
      />
    </points>
  );
}

// 13 Soft floating geometric shapes (under 25 meshes limit)
const SHAPES_CONFIG = [
  // Left Cluster
  { id: 1, type: 'icosahedron', position: [-8, 4.5, -4], scale: 1.35, color: '#6366f1', speed: 1.2, rotSpeed: 0.8 },
  { id: 2, type: 'torus', position: [-8.5, -3.2, -3], scale: 1.05, color: '#8b5cf6', speed: 1.4, rotSpeed: 1.1 },
  { id: 3, type: 'sphere', position: [-5.2, 1.2, -2], scale: 0.85, color: '#3b82f6', speed: 1.0, rotSpeed: 0.6 },
  { id: 4, type: 'octahedron', position: [-6.5, -6.0, -5], scale: 1.15, color: '#a855f7', speed: 1.3, rotSpeed: 0.9 },

  // Right Cluster
  { id: 5, type: 'torus', position: [7.8, 5.0, -3.5], scale: 1.25, color: '#4f46e5', speed: 1.3, rotSpeed: 1.0 },
  { id: 6, type: 'icosahedron', position: [8.5, -2.5, -4], scale: 1.4, color: '#38bdf8', speed: 1.2, rotSpeed: 0.8 },
  { id: 7, type: 'sphere', position: [5.5, 2.0, -2.5], scale: 0.8, color: '#a855f7', speed: 1.1, rotSpeed: 0.7 },
  { id: 8, type: 'icosahedron', position: [6.8, -5.5, -3], scale: 1.15, color: '#6366f1', speed: 1.3, rotSpeed: 0.9 },

  // Depth / Ambient Center
  { id: 9, type: 'sphere', position: [-2.2, 5.2, -8], scale: 1.5, color: '#4338ca', speed: 0.8, rotSpeed: 0.5 },
  { id: 10, type: 'torus', position: [2.5, -6.5, -7], scale: 1.35, color: '#7c3aed', speed: 0.9, rotSpeed: 0.7 },
  { id: 11, type: 'octahedron', position: [0.2, 4.2, -6], scale: 0.95, color: '#2563eb', speed: 1.0, rotSpeed: 0.8 },
  { id: 12, type: 'sphere', position: [-3.5, -4.5, -6], scale: 1.1, color: '#818cf8', speed: 0.9, rotSpeed: 0.6 },
  { id: 13, type: 'icosahedron', position: [3.8, 0.2, -7], scale: 1.05, color: '#c084fc', speed: 1.1, rotSpeed: 0.8 },
];

function FloatingMesh({ config, reducedMotion }) {
  const meshRef = useRef();

  useFrame((state, delta) => {
    if (!reducedMotion && meshRef.current) {
      meshRef.current.rotation.x += delta * 0.15 * config.rotSpeed;
      meshRef.current.rotation.y += delta * 0.22 * config.rotSpeed;
    }
  });

  return (
    <Float
      speed={reducedMotion ? 0 : config.speed}
      rotationIntensity={reducedMotion ? 0 : 0.8}
      floatIntensity={reducedMotion ? 0 : 1.4}
      position={config.position}
    >
      <mesh ref={meshRef} scale={config.scale}>
        {config.type === 'icosahedron' && <icosahedronGeometry args={[1, 0]} />}
        {config.type === 'torus' && <torusGeometry args={[0.9, 0.35, 16, 32]} />}
        {config.type === 'sphere' && <sphereGeometry args={[1, 24, 24]} />}
        {config.type === 'octahedron' && <octahedronGeometry args={[1, 0]} />}
        <meshStandardMaterial
          color={config.color}
          roughness={0.3}
          metalness={0.25}
          transparent
          opacity={0.68}
        />
      </mesh>
    </Float>
  );
}

// Parallax Camera Controller reacting to window mouse movement or touch auto-orbit
function CameraRig({ mouseRef, reducedMotion }) {
  useFrame((state) => {
    if (reducedMotion) return;

    if (mouseRef.current.hasMouse) {
      // Smooth lerp towards normalized mouse coordinates
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.045;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.045;

      state.camera.position.x = mouseRef.current.x * 1.6;
      state.camera.position.y = mouseRef.current.y * 1.2;
      state.camera.lookAt(0, 0, 0);
    } else {
      // On touch devices / before mouse movement: gentle slow auto-rotation
      const t = state.clock.getElapsedTime() * 0.18;
      state.camera.position.x = Math.sin(t) * 1.3;
      state.camera.position.y = Math.cos(t * 0.75) * 0.9;
      state.camera.lookAt(0, 0, 0);
    }
  });

  return null;
}

const Background3D = () => {
  const [isTabVisible, setIsTabVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Mouse coordinate tracker listening on window
  const mouseRef = useRef({
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
    hasMouse: false,
  });

  useEffect(() => {
    // Tab visibility handling (pause animation when tab is hidden)
    const handleVisibility = () => {
      setIsTabVisible(document.visibilityState === 'visible');
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Mouse tracker on window (canvas is pointer-events-none)
    const onMouseMove = (e) => {
      mouseRef.current.hasMouse = true;
      mouseRef.current.targetX = (e.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.targetY = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('mousemove', onMouseMove, { passive: true });

    // Check prefers-reduced-motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);
    const handleMotionChange = (e) => setReducedMotion(e.matches);

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleMotionChange);
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('mousemove', onMouseMove);
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleMotionChange);
      }
    };
  }, []);

  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden select-none"
      style={{ zIndex: -1 }}
      aria-hidden="true"
    >
      <WebGLErrorBoundary>
        <Canvas
          dpr={[1, 1.5]} // capped at 1.5 for performance
          frameloop={isTabVisible ? (reducedMotion ? 'demand' : 'always') : 'demand'}
          camera={{ position: [0, 0, 15], fov: 45 }}
          gl={{
            alpha: true,
            antialias: true,
            powerPreference: 'high-performance',
          }}
        >
          {/* Ambient & Directional Lighting */}
          <ambientLight intensity={0.75} />
          <directionalLight position={[10, 10, 5]} intensity={1.2} color="#c7d2fe" />
          <pointLight position={[-10, -8, -4]} intensity={0.9} color="#93c5fd" />
          <pointLight position={[8, -10, -5]} intensity={0.8} color="#d8b4fe" />

          {/* Camera Parallax Rig */}
          <CameraRig mouseRef={mouseRef} reducedMotion={reducedMotion} />

          {/* Floating Geometric Meshes */}
          {SHAPES_CONFIG.map((config) => (
            <FloatingMesh
              key={config.id}
              config={config}
              reducedMotion={reducedMotion}
            />
          ))}

          {/* Subtle Particle Field */}
          <ParticleField count={220} reducedMotion={reducedMotion} />
        </Canvas>
      </WebGLErrorBoundary>
    </div>
  );
};

export default Background3D;

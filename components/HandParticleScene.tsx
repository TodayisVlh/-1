import React, { useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { HandMetrics, ShapeType } from '../types';

interface Props {
  handMetrics: HandMetrics | null;
}

// Increased particle count for better visuals
const PARTICLE_COUNT = 4000;
const POS_LERP_FACTOR = 0.08; // Faster position snapping
const COLOR_LERP_FACTOR = 0.05;

const HandParticleScene: React.FC<Props> = ({ handMetrics }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  
  // Three.js References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const particlesRef = useRef<THREE.Points | null>(null);
  
  // Animation State
  const targetPositionsRef = useRef<Float32Array>(new Float32Array(PARTICLE_COUNT * 3));
  const currentShapeRef = useRef<ShapeType>(ShapeType.HEART);
  
  // Physics State
  const rotationSpeedRef = useRef<number>(0.001);
  const groupScaleRef = useRef<number>(1.0);
  
  // Color State
  const currentColorRef = useRef<THREE.Color>(new THREE.Color(0xff0055));
  const targetColorRef = useRef<THREE.Color>(new THREE.Color(0xff0055));
  
  // Shape Generators
  const shapes = useMemo(() => {
    const generate = (fn: (i: number) => { x: number, y: number, z: number }) => {
      const arr = new Float32Array(PARTICLE_COUNT * 3);
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const p = fn(i);
        arr[i * 3] = p.x;
        arr[i * 3 + 1] = p.y;
        arr[i * 3 + 2] = p.z;
      }
      return arr;
    };

    return {
      [ShapeType.HEART]: generate((i) => {
        const t = (i / PARTICLE_COUNT) * Math.PI * 2;
        const r = 0.5 + Math.random() * 0.1; 
        const x = 16 * Math.pow(Math.sin(t), 3);
        const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
        const z = (Math.random() - 0.5) * 4; 
        return { x: x * r, y: y * r, z: z };
      }),
      [ShapeType.FLOWER]: generate((i) => {
        const k = 5; // Petals
        const t = (i / PARTICLE_COUNT) * Math.PI * 2 * 12; 
        const rad = 8 * Math.cos(k * t) + 3;
        return {
          x: rad * Math.cos(t),
          y: rad * Math.sin(t),
          z: (Math.random() - 0.5) * 3
        };
      }),
      [ShapeType.PORTAL]: generate((i) => {
        // Doctor Strange Portal: Multi-layer concentric rings with sparks
        const layer = i % 3; 
        let rad = 0;
        let angle = Math.random() * Math.PI * 2;
        
        if (layer === 0) rad = 10 + Math.random() * 1.5; // Outer rim
        if (layer === 1) rad = 8 + Math.random() * 1.0;  // Middle rim
        if (layer === 2) rad = Math.random() * 9;        // Inner sparks
        
        // Add noise to make it look fiery/sparky
        const noise = (Math.random() - 0.5) * 0.5;
        
        return {
          x: (rad + noise) * Math.cos(angle),
          y: (rad + noise) * Math.sin(angle),
          z: (Math.random() - 0.5) * 0.5 // Flat disc
        };
      }),
      [ShapeType.HEXAGRAM]: generate((i) => {
        // Star / Hexagram
        const angle = (i / PARTICLE_COUNT) * Math.PI * 2;
        // Formula for a hexagram shape in polar coords
        const rad = 9 * (1.2 + 0.3 * Math.sin(6 * angle)); 
        return {
          x: rad * Math.cos(angle),
          y: rad * Math.sin(angle),
          z: (Math.random() - 0.5) * 2
        };
      }),
      [ShapeType.TREE]: generate((i) => {
        // Christmas Tree: Spiral Cone
        const pct = i / PARTICLE_COUNT; // 0 to 1 (top to bottom)
        const height = 18;
        const y = 8 - (pct * height); // Top at +8, bottom at -10
        
        // Radius gets wider as we go down
        const radius = pct * 8; 
        
        // Spiral angle
        const angle = pct * Math.PI * 20; // 10 full rotations
        
        return {
          x: radius * Math.cos(angle),
          y: y,
          z: radius * Math.sin(angle)
        };
      })
    };
  }, []);

  // Initialization
  useEffect(() => {
    if (!mountRef.current) return;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    
    // 2. Camera
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 35;
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap pixel ratio for performance
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Particles with BufferGeometry
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    
    // Initialize
    const startShape = shapes[ShapeType.HEART];
    positions.set(startShape);
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const sprite = new THREE.TextureLoader().load('https://threejs.org/examples/textures/sprites/spark1.png');

    const material = new THREE.PointsMaterial({
      color: 0xff0055,
      size: 0.6,
      map: sprite,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);
    particlesRef.current = particles;

    targetPositionsRef.current.set(shapes[ShapeType.HEART]);

    // Resize Handler
    const handleResize = () => {
      if (cameraRef.current && rendererRef.current) {
        cameraRef.current.aspect = window.innerWidth / window.innerHeight;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(window.innerWidth, window.innerHeight);
      }
    };
    window.addEventListener('resize', handleResize);

    // Animation Loop
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      
      if (!particlesRef.current || !sceneRef.current || !cameraRef.current || !rendererRef.current) return;

      const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
      const target = targetPositionsRef.current;
      
      // -- Color Dynamics --
      if (particlesRef.current.material instanceof THREE.PointsMaterial) {
        currentColorRef.current.lerp(targetColorRef.current, COLOR_LERP_FACTOR);
        particlesRef.current.material.color.set(currentColorRef.current);
      }

      // -- Particle Movement (Buffer Update) --
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const ix = i * 3;
        const iy = i * 3 + 1;
        const iz = i * 3 + 2;

        // Interpolate positions
        positions[ix] += (target[ix] - positions[ix]) * POS_LERP_FACTOR;
        positions[iy] += (target[iy] - positions[iy]) * POS_LERP_FACTOR;
        positions[iz] += (target[iz] - positions[iz]) * POS_LERP_FACTOR;
        
        // Jitter / Life
        positions[ix] += (Math.random() - 0.5) * 0.05;
        positions[iy] += (Math.random() - 0.5) * 0.05;
        positions[iz] += (Math.random() - 0.5) * 0.05;
      }
      particlesRef.current.geometry.attributes.position.needsUpdate = true;

      // -- Global Physics (Rotation & Scale) --
      // Rotation logic handles the "Spin speed" requirement
      particlesRef.current.rotation.z += rotationSpeedRef.current;
      particlesRef.current.rotation.y += rotationSpeedRef.current * 0.5;

      // Scale logic handles the "Fist = Shrink / Open = Expand" requirement
      // We lerp the actual object scale
      particlesRef.current.scale.lerp(new THREE.Vector3(groupScaleRef.current, groupScaleRef.current, groupScaleRef.current), 0.1);

      rendererRef.current.render(sceneRef.current, cameraRef.current);
    };

    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
      if (mountRef.current && rendererRef.current) {
        mountRef.current.removeChild(rendererRef.current.domElement);
      }
      geometry.dispose();
      material.dispose();
    };
  }, [shapes]);

  // Logic Loop: Process MediaPipe Data
  useEffect(() => {
    if (!handMetrics) return;

    // 1. Shape Selection
    let newShape = currentShapeRef.current;
    if (!handMetrics.isFist) {
      if (handMetrics.fingerCount === 1) newShape = ShapeType.HEART;
      else if (handMetrics.fingerCount === 2) newShape = ShapeType.FLOWER;
      else if (handMetrics.fingerCount === 3) newShape = ShapeType.PORTAL; // Dr Strange
      else if (handMetrics.fingerCount === 4) newShape = ShapeType.HEXAGRAM;
      else if (handMetrics.fingerCount === 5) newShape = ShapeType.TREE;   // Christmas Tree
      
      if (newShape !== currentShapeRef.current) {
        currentShapeRef.current = newShape;
        targetPositionsRef.current.set(shapes[newShape]);
      }
    }

    // 2. Color Mode (Fist + X Movement)
    if (handMetrics.isFist) {
      const hue = Math.max(0, Math.min(1, 1 - handMetrics.position.x));
      targetColorRef.current.setHSL(hue, 1.0, 0.5);
    }

    // 3. Physics & Dynamics
    if (handMetrics.isFist) {
      // FIST: Implode (Shrink) + Fast Spin
      groupScaleRef.current = 0.4;
      rotationSpeedRef.current = 0.15; // Fast spin
    } else {
      // OPEN: Explode (Spread) + Slow Spin
      // We also use palm depth to modulate the spread size slightly
      const depthScale = Math.max(0.05, Math.min(0.5, handMetrics.palmDepth));
      // Base scale 1.2, modified by distance
      groupScaleRef.current = 1.0 + (1 - depthScale * 2); 
      
      rotationSpeedRef.current = 0.002; // Slow drift
    }

  }, [handMetrics, shapes]);

  return <div ref={mountRef} className="absolute inset-0 z-0" />;
};

export default HandParticleScene;
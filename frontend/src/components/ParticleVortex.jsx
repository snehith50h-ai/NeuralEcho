import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useScroll } from '@react-three/drei';
import * as THREE from 'three';

const vertexShader = `
uniform float uTime;
uniform float uAudioIntensity;
uniform float uProgress; // 0.0 to 4.0

attribute vec3 aPosBlackHole;
attribute vec3 aPosDNA;
attribute vec3 aPosWave;
attribute vec3 aPosGrid;
attribute vec3 aPosSphere;

attribute float aRandom;
attribute float aSize;

varying vec3 vPosition;
varying float vRandom;

void main() {
    vRandom = aRandom;

    vec3 currentPos;
    
    // Smooth interpolation between shapes based on uProgress
    if (uProgress < 1.0) {
        currentPos = mix(aPosBlackHole, aPosDNA, smoothstep(0.0, 1.0, uProgress));
    } else if (uProgress < 2.0) {
        currentPos = mix(aPosDNA, aPosWave, smoothstep(1.0, 2.0, uProgress));
    } else if (uProgress < 3.0) {
        currentPos = mix(aPosWave, aPosGrid, smoothstep(2.0, 3.0, uProgress));
    } else {
        currentPos = mix(aPosGrid, aPosSphere, smoothstep(3.0, 4.0, uProgress));
    }

    vec3 newPosition = currentPos;
    float radius = length(newPosition.xz);
    
    // Add specific animation logic based on current stage
    if (uProgress < 1.0) {
        // Black Hole rotation
        float angle = atan(newPosition.z, newPosition.x);
        angle += uTime * (0.2 + (1.0 / (radius + 0.1))) * 0.1;
        newPosition.x = cos(angle) * radius;
        newPosition.z = sin(angle) * radius;
        newPosition.y += (sin(radius * 10.0 - uTime * 2.0) * 0.1) * (1.0 - smoothstep(0.0, 2.0, radius));
    } else if (uProgress >= 1.0 && uProgress < 2.0) {
        // DNA twist
        float twist = newPosition.y * 0.5 + uTime * 0.5;
        float x = newPosition.x * cos(twist) - newPosition.z * sin(twist);
        float z = newPosition.x * sin(twist) + newPosition.z * cos(twist);
        newPosition.x = x;
        newPosition.z = z;
    } else if (uProgress >= 2.0 && uProgress < 3.0) {
        // Wave Undulation
        newPosition.y += sin(newPosition.x * 2.0 + uTime) * 0.5 + cos(newPosition.z * 2.0 + uTime) * 0.5;
    } else if (uProgress >= 3.0 && uProgress < 4.0) {
        // Grid subtle pulse
        newPosition += (aRandom - 0.5) * sin(uTime * 2.0 + aRandom * 10.0) * 0.1;
    } else if (uProgress >= 4.0) {
        // Audio Reactive Sphere
        float audioDisplacement = uAudioIntensity * aRandom * 3.0;
        float wobble = sin(uTime * 2.0 + radius * 5.0 + aRandom * 10.0) * 0.1;
        newPosition += normalize(newPosition) * (audioDisplacement + wobble);
    }
    
    // Add global slight wobble
    newPosition.y += sin(uTime + aRandom * 10.0) * 0.05;

    vPosition = newPosition;

    vec4 modelPosition = modelMatrix * vec4(newPosition, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;

    gl_Position = projectedPosition;
    
    // Size attenuation with audio intensity bump at stage 4
    float sizeBump = (uProgress >= 4.0) ? (uAudioIntensity * 2.0) : 0.0;
    gl_PointSize = aSize * (1.0 + sizeBump) * (20.0 / -viewPosition.z);
}
`;

const fragmentShader = `
uniform float uTime;
varying vec3 vPosition;
varying float vRandom;

void main() {
    float distanceToCenter = distance(gl_PointCoord, vec2(0.5));
    if(distanceToCenter > 0.5) {
        discard;
    }

    // Color based on X position (spatial split)
    vec3 colorLeft = vec3(0.02, 0.71, 0.83); // Electric Cyan
    vec3 colorRight = vec3(0.97, 0.45, 0.09); // Neon Ember

    float mixRatio = smoothstep(-3.0, 3.0, vPosition.x);
    vec3 finalColor = mix(colorLeft, colorRight, mixRatio);
    
    finalColor += vec3(vRandom * 0.2);
    
    float alpha = 0.8 * (1.0 - (distanceToCenter * 2.0));

    gl_FragColor = vec4(finalColor, alpha);
}
`;

export default function ParticleVortex({ analyzer, isRecording }) {
  const pointsRef = useRef();
  const materialRef = useRef();
  const dataArray = useRef(new Uint8Array(256));
  const scroll = useScroll();

  const particleCount = 60000;

  const [
    posBlackHole,
    posDNA,
    posWave,
    posGrid,
    posSphere,
    randoms,
    sizes
  ] = useMemo(() => {
    const pBH = new Float32Array(particleCount * 3);
    const pDNA = new Float32Array(particleCount * 3);
    const pWave = new Float32Array(particleCount * 3);
    const pGrid = new Float32Array(particleCount * 3);
    const pSphere = new Float32Array(particleCount * 3);
    const rand = new Float32Array(particleCount);
    const size = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const idx = i * 3;
      rand[i] = Math.random();
      size[i] = Math.random() * 0.6 + 0.1;

      // 1. Black Hole (Disk)
      const rBH = Math.pow(Math.random(), 1.5) * 8 + 0.5;
      const tBH = Math.random() * Math.PI * 2;
      pBH[idx + 0] = Math.cos(tBH) * rBH;
      pBH[idx + 1] = (Math.random() - 0.5) * 0.5;
      pBH[idx + 2] = Math.sin(tBH) * rBH;

      // 2. DNA Helix
      const isStrandA = Math.random() > 0.5;
      const heightDNA = (Math.random() - 0.5) * 12;
      const rDNA = 2.0;
      const angleDNA = heightDNA * Math.PI; 
      const offsetDNA = isStrandA ? 0 : Math.PI;
      const isBridge = Math.random() > 0.8;
      if (isBridge) {
          const bridgeLerp = Math.random();
          const x1 = Math.cos(angleDNA) * rDNA;
          const z1 = Math.sin(angleDNA) * rDNA;
          const x2 = Math.cos(angleDNA + Math.PI) * rDNA;
          const z2 = Math.sin(angleDNA + Math.PI) * rDNA;
          pDNA[idx + 0] = x1 + (x2 - x1) * bridgeLerp;
          pDNA[idx + 1] = heightDNA;
          pDNA[idx + 2] = z1 + (z2 - z1) * bridgeLerp;
      } else {
          pDNA[idx + 0] = Math.cos(angleDNA + offsetDNA) * rDNA + (Math.random() - 0.5) * 0.5;
          pDNA[idx + 1] = heightDNA;
          pDNA[idx + 2] = Math.sin(angleDNA + offsetDNA) * rDNA + (Math.random() - 0.5) * 0.5;
      }

      // 3. Wave (Plane)
      pWave[idx + 0] = (Math.random() - 0.5) * 15;
      pWave[idx + 1] = (Math.random() - 0.5) * 0.5; 
      pWave[idx + 2] = (Math.random() - 0.5) * 15;

      // 4. Grid (Cubic)
      const gridSpacing = 0.5;
      const gX = Math.round((Math.random() - 0.5) * 20) * gridSpacing;
      const gY = Math.round((Math.random() - 0.5) * 10) * gridSpacing;
      const gZ = Math.round((Math.random() - 0.5) * 20) * gridSpacing;
      pGrid[idx + 0] = gX + (Math.random() - 0.5) * 0.1;
      pGrid[idx + 1] = gY + (Math.random() - 0.5) * 0.1;
      pGrid[idx + 2] = gZ + (Math.random() - 0.5) * 0.1;

      // 5. Sphere
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const rSphere = 4.0 + (Math.random() - 0.5) * 0.5; 
      pSphere[idx + 0] = rSphere * Math.sin(phi) * Math.cos(theta);
      pSphere[idx + 1] = rSphere * Math.sin(phi) * Math.sin(theta);
      pSphere[idx + 2] = rSphere * Math.cos(phi);
    }

    return [pBH, pDNA, pWave, pGrid, pSphere, rand, size];
  }, [particleCount]);

  useFrame((state) => {
    if (!materialRef.current) return;
    
    const time = state.clock.getElapsedTime();
    materialRef.current.uniforms.uTime.value = time;
    
    let targetProgress = scroll.offset * 4.0;
    
    materialRef.current.uniforms.uProgress.value = THREE.MathUtils.lerp(
        materialRef.current.uniforms.uProgress.value,
        targetProgress,
        0.1
    );

    const prog = materialRef.current.uniforms.uProgress.value;
    if (pointsRef.current) {
        if (prog < 1.0) {
            pointsRef.current.rotation.y = time * 0.05;
            pointsRef.current.rotation.z = time * 0.02;
            pointsRef.current.rotation.x = 0.4;
        } else if (prog < 2.0) {
            pointsRef.current.rotation.x = THREE.MathUtils.lerp(pointsRef.current.rotation.x, 0.2, 0.05);
            pointsRef.current.rotation.y = time * 0.1;
            pointsRef.current.rotation.z = 0;
        } else if (prog < 3.0) {
            pointsRef.current.rotation.x = THREE.MathUtils.lerp(pointsRef.current.rotation.x, 0.8, 0.05);
            pointsRef.current.rotation.y = time * 0.05;
            pointsRef.current.rotation.z = 0;
        } else if (prog < 4.0) {
            pointsRef.current.rotation.x = THREE.MathUtils.lerp(pointsRef.current.rotation.x, 0.1, 0.05);
            pointsRef.current.rotation.y = time * 0.02;
            pointsRef.current.rotation.z = 0;
        } else {
            pointsRef.current.rotation.x = THREE.MathUtils.lerp(pointsRef.current.rotation.x, 0.0, 0.05);
            pointsRef.current.rotation.y = time * 0.1;
            pointsRef.current.rotation.z = 0;
        }
    }

    let audioIntensity = 0;
    if (isRecording && analyzer) {
      analyzer.getByteFrequencyData(dataArray.current);
      let sum = 0;
      for (let i = 0; i < dataArray.current.length; i++) {
        sum += dataArray.current[i];
      }
      audioIntensity = sum / dataArray.current.length / 255.0; 
    }

    materialRef.current.uniforms.uAudioIntensity.value = THREE.MathUtils.lerp(
      materialRef.current.uniforms.uAudioIntensity.value,
      audioIntensity,
      0.15
    );
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-aPosBlackHole" count={particleCount} array={posBlackHole} itemSize={3} />
        <bufferAttribute attach="attributes-aPosDNA" count={particleCount} array={posDNA} itemSize={3} />
        <bufferAttribute attach="attributes-aPosWave" count={particleCount} array={posWave} itemSize={3} />
        <bufferAttribute attach="attributes-aPosGrid" count={particleCount} array={posGrid} itemSize={3} />
        <bufferAttribute attach="attributes-aPosSphere" count={particleCount} array={posSphere} itemSize={3} />
        <bufferAttribute attach="attributes-aRandom" count={particleCount} array={randoms} itemSize={1} />
        <bufferAttribute attach="attributes-aSize" count={particleCount} array={sizes} itemSize={1} />
        <bufferAttribute attach="attributes-position" count={particleCount} array={posBlackHole} itemSize={3} />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={{
          uTime: { value: 0 },
          uAudioIntensity: { value: 0 },
          uProgress: { value: 0 }
        }}
        transparent={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

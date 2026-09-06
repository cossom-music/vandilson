"use client";

import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { AdaptiveDpr, Html, Stars, useTexture } from "@react-three/drei";
import * as THREE from "three";
import {
  atmosphereFragmentShader,
  atmosphereVertexShader,
  cloudsFragmentShader,
  cloudsVertexShader,
  earthFragmentShader,
  earthVertexShader,
} from "./shaders";

const LIGHT_DIR = new THREE.Vector3(2, 0.6, 1.5).normalize();

type EarthProps = {
  spinSpeed: number;
  quality: "high" | "low";
};

function Earth({ spinSpeed, quality }: EarthProps) {
  const earthRef = useRef<THREE.Mesh>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);

  const [dayMap, cloudsMap, nightMap] = useTexture([
    "/textures/earth-day.jpg",
    "/textures/earth-clouds.png",
    "/textures/earth-night-lights.png",
  ]);

  for (const tex of [dayMap, cloudsMap, nightMap]) {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
  }

  const earthUniforms = useMemo(
    () => ({
      uDayMap: { value: dayMap },
      uNightMap: { value: nightMap },
      uLightDir: { value: LIGHT_DIR },
      uNightColor: { value: new THREE.Color("#f5d782") },
      uAtmosphereColor: { value: new THREE.Color("#3f6fff") },
      uNightMix: { value: 0.55 },
      uAmbient: { value: 0.06 },
    }),
    [dayMap, nightMap],
  );

  const cloudsUniforms = useMemo(
    () => ({
      uMap: { value: cloudsMap },
      uOffset: { value: 0 },
      uOpacity: { value: 0.85 },
    }),
    [cloudsMap],
  );

  const atmosphereUniforms = useMemo(
    () => ({
      uGlowColor: { value: new THREE.Color("#4f8bff") },
      uIntensity: { value: 0.85 },
      uPower: { value: 3.4 },
    }),
    [],
  );

  useFrame((_, delta) => {
    if (earthRef.current) {
      earthRef.current.rotation.y += delta * spinSpeed;
    }
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y += delta * spinSpeed * 1.18;
      cloudsUniforms.uOffset.value += delta * 0.0015;
    }
  });

  return (
    <group rotation={[0, -0.9, 0.08]}>
      {/* Planeta */}
      <mesh ref={earthRef}>
        <sphereGeometry args={[2, quality === "high" ? 96 : 48, quality === "high" ? 96 : 48]} />
        <shaderMaterial
          vertexShader={earthVertexShader}
          fragmentShader={earthFragmentShader}
          uniforms={earthUniforms}
        />
      </mesh>

      {/* Camada de nuvens */}
      <mesh ref={cloudsRef} scale={1.015}>
        <sphereGeometry args={[2, 64, 64]} />
        <shaderMaterial
          vertexShader={cloudsVertexShader}
          fragmentShader={cloudsFragmentShader}
          uniforms={cloudsUniforms}
          transparent
          depthWrite={false}
        />
      </mesh>

      {/* Atmosfera (halo por trás do planeta) */}
      <mesh scale={1.22}>
        <sphereGeometry args={[2, 64, 64]} />
        <shaderMaterial
          vertexShader={atmosphereVertexShader}
          fragmentShader={atmosphereFragmentShader}
          uniforms={atmosphereUniforms}
          transparent
          side={THREE.BackSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

type EarthGlobeProps = {
  className?: string;
  spinSpeed?: number;
  quality?: "high" | "low";
};

export default function EarthGlobe({
  className,
  spinSpeed = 0.055,
  quality = "high",
}: EarthGlobeProps) {
  return (
    <div className={className}>
      <Canvas
        camera={{ position: [0, 0, 6.2], fov: 42 }}
        dpr={[1, quality === "high" ? 2 : 1.5]}
        gl={{ antialias: quality === "high", alpha: true }}
      >
        <Suspense
          fallback={
            <Html center>
              <span className="text-xs tracking-[0.3em] text-mist">A CARREGAR O MUNDO…</span>
            </Html>
          }
        >
          <ambientLight intensity={0.2} />
          <Earth spinSpeed={spinSpeed} quality={quality} />
          <Stars
            radius={90}
            depth={40}
            count={quality === "high" ? 6000 : 2500}
            factor={4}
            saturation={0}
            fade
            speed={0.4}
          />
        </Suspense>
        <AdaptiveDpr pixelated />
      </Canvas>
    </div>
  );
}

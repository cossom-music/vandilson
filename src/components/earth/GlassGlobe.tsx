"use client";

import { useEffect, useMemo, useRef, useState, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { earthZoom } from "@/lib/earthZoom";
import { gsap } from "@/lib/gsap";

/**
 * Globo "dark data" — esfera de VIDRO transparente (fresnel) sobre ambiente
 * escuro, com os continentes formados por PONTOS. Minimalista: nada de
 * graticula, arcos ou hubs. O lado oposto vê-se através da esfera
 * (nada é opaco: vidro só desenha o brilho da borda, pontos não escrevem depth).
 *
 * Referência: model-videos/Earth Spin.mp4 (ambiente escuro, globo vítreo,
 * pontos de conexão). Sem ffmpeg nesta máquina não é possível extrair frames
 * do vídeo — o look segue a descrição do utilizador e é afinável por uniforms.
 *
 * Zoom = DOLLY da câmara para DENTRO do globo (nítido a qualquer nível).
 * Fallback estático sob o canvas — nunca fica vazio.
 */

const EARTH_RADIUS = 1;
const DOLLY_FROM = 3.7; // globo ocupa ~70% da altura do frame (medido no vídeo)
const DOLLY_TO = 0.55; // câmara dentro da casca de pontos no fim do zoom
// Medido no vídeo de referência: 1 rotação completa a cada 30 s (corr = 1.000)
const SPIN = (2 * Math.PI) / 30; // ≈ 0.2094 rad/s

/* ------------------------------ helpers ---------------------------------- */

/** Converte lat/lon para posição numa esfera de raio 1. */
function latLonToVec3(lat: number, lon: number, radius = EARTH_RADIUS): THREE.Vector3 {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lon + 180) * Math.PI) / 180;
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

/**
 * Amostra pontos de terra numa GRELHA REGULAR de lat/lon (estilo dot-matrix
 * NASA): cada 1° de latitude, e em longitude com passo corrigido por cos(lat)
 * para densidade uniforme na esfera. Máscara: earth-water.png (terra = ESCURO).
 * É a grelha regular que faz os continentes ficarem DETALHADOS e legíveis.
 */
function sampleLandPoints(
  img: HTMLImageElement,
): { position: Float32Array; seed: Float32Array } {
  const w = img.width;
  const h = img.height;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return { position: new Float32Array(0), seed: new Float32Array(0) };
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, w, h).data;

  const isLand = (lat: number, lon: number): boolean => {
    const x = Math.min(w - 1, Math.max(0, Math.round(((lon + 180) / 360) * w)));
    const y = Math.min(h - 1, Math.max(0, Math.round(((90 - lat) / 180) * h)));
    return data[(y * w + x) * 4] < 100; // terra escura na máscara de água
  };

  // BLINDAGEM de polaridade: a terra é ~29% do planeta — se os píxeis
  // "escuros" forem a maioria, a máscara veio invertida e o teste acima
  // produziria um globo VAZIO. Auto-deteta e inverte em vez de falhar.
  const step = Math.max(4, Math.floor(w / 200));
  let dark = 0;
  let total = 0;
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      total++;
      if (data[(y * w + x) * 4] < 100) dark++;
    }
  }
  const landIsDark = dark / total <= 0.5;
  const isLandChecked = landIsDark ? isLand : (lat: number, lon: number) => !isLand(lat, lon);

  const STEP_DEG = 1; // 1° no equador → ~13 mil pontos de terra
  const positions: number[] = [];
  const seeds: number[] = []; // fase da onda de brilho = longitude do ponto

  for (let lat = -85; lat <= 85; lat += STEP_DEG) {
    // passo longitudinal compensado pela convergência dos meridianos
    const lonStep = STEP_DEG / Math.max(Math.cos((lat * Math.PI) / 180), 0.08);
    for (let lon = -180; lon < 180; lon += lonStep) {
      if (!isLandChecked(lat, lon)) continue;
      const p = latLonToVec3(lat, lon, EARTH_RADIUS * 1.004);
      positions.push(p.x, p.y, p.z);
      seeds.push((lon * Math.PI) / 180);
      if (positions.length / 3 > 16_000) break; // teto de segurança
    }
  }

  return { position: new Float32Array(positions), seed: new Float32Array(seeds) };
}

/* ---------------------------- subcomponentes ------------------------------ */

/** Casca de vidro — fresnel: transparente ao centro, brilha na silhueta.
 *  É ISTO que dá o efeito "vidro": o lado oposto vê-se através dela. */
function GlassShell() {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.FrontSide,
        uniforms: {
          // Medido no vídeo: monocromático — centro ~#3a3a3a, limbo ~#808080
          uColor: { value: new THREE.Color("#c9ccd2") },
          uPower: { value: 2.6 }, // gradiente largo: escuro no centro → claro no limbo
          uIntensity: { value: 0.6 },
        },
        vertexShader: /* glsl */ `
          varying vec3 vNormal;
          varying vec3 vViewDir;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            vViewDir = normalize(-mv.xyz);
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uColor;
          uniform float uPower;
          uniform float uIntensity;
          varying vec3 vNormal;
          varying vec3 vViewDir;
          void main() {
            float fres = pow(1.0 - abs(dot(normalize(vNormal), normalize(vViewDir))), uPower);
            gl_FragColor = vec4(uColor, fres * uIntensity);
          }
        `,
      }),
    [],
  );

  return (
    <mesh material={material}>
      <sphereGeometry args={[EARTH_RADIUS, 64, 64]} />
    </mesh>
  );
}

/** Halo exterior — brilho suave visto de trás (espessura atmosférica). */
function OuterHalo() {
  return (
    <mesh scale={1.12}>
      <sphereGeometry args={[EARTH_RADIUS, 48, 48]} />
      <meshBasicMaterial
        color="#3a3f47"
        transparent
        opacity={0.05}
        side={THREE.BackSide}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

/** Estado de interação partilhado entre o rig e o shader dos pontos. */
type GlobeInteraction = {
  uHit: { value: THREE.Vector3 };
  uHitActive: { value: number };
};

/** Pontos dos CONTINENTES com onda de brilho + reação ao ponteiro. */
function ContinentDots({
  texture,
  interaction,
}: {
  texture: string;
  interaction: GlobeInteraction;
}) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const { size, camera, gl } = useThree();

  useEffect(() => {
    const el = new Image();
    el.onload = () => setImg(el);
    el.src = texture;
  }, [texture]);

  const geometry = useMemo(() => {
    if (!img) return null;
    const { position, seed } = sampleLandPoints(img);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(position, 3));
    geo.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    return geo;
  }, [img]);

  // Shader próprio: pontos circulares suaves + onda de brilho por longitude
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uColor: { value: new THREE.Color("#c6cad0") },
          uSize: { value: 0.0115 }, // tamanho mundial do ponto
          uScale: { value: 400 }, // px por unidade mundial (atualizado por frame)
          uMaxPx: { value: 4.5 }, // teto em px de dispositivo (crítico no dolly)
          uBaseAlpha: { value: 0.62 },
          uWaveAmp: { value: 0.28 },
          uWaveFreq: { value: 3.0 }, // ciclos de onda à volta do globo
          uWaveSpeed: { value: 0.45 }, // rad/s → a onda dá a volta em ~14 s (meditativo, ecoia a rotação de 30 s)
          // Reação ao ponteiro (valores escritos pelo RotatingGlobe por frame)
          ...interaction,
          uHitRadius: { value: 0.38 }, // raio do "holofote" do cursor, em unidades do globo
          uHitStrength: { value: 0.5 }, // ganho de alpha sob o cursor
        },
        vertexShader: /* glsl */ `
          attribute float aSeed;
          uniform float uTime;
          uniform float uSize;
          uniform float uScale;
          uniform float uMaxPx;
          uniform float uWaveAmp;
          uniform float uWaveFreq;
          uniform float uWaveSpeed;
          uniform vec3 uHit;
          uniform float uHitActive;
          uniform float uHitRadius;
          varying float vWave;
          varying float vInflu;
          void main() {
            // Onda que viaja pela longitude (roda com o globo — fase fixa no ponto)
            vWave = sin(uTime * uWaveSpeed - aSeed * uWaveFreq);
            // Reação ao ponteiro: pontos perto do impacto acendem e crescem.
            // (1.0 - smoothstep(0..R) em vez de smoothstep(R..0): edge0 > edge1
            // é comportamento INDEFINIDO em GLSL e alguns drivers (ANGLE/D3D)
            // devolvem 0 — o que apagava TODOS os pontos no Windows.)
            vInflu = uHitActive * (1.0 - smoothstep(0.0, uHitRadius, distance(position, uHit)));
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            float px = uSize * (uScale / -mv.z) * (1.0 + 0.3 * vWave + 1.1 * vInflu);
            gl_PointSize = clamp(px, 1.0, uMaxPx * (1.0 + 1.6 * vInflu));
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uColor;
          uniform float uBaseAlpha;
          uniform float uWaveAmp;
          uniform float uHitStrength;
          varying float vWave;
          varying float vInflu;
          void main() {
            // Ponto circular suave (substitui o quadrado do PointsMaterial).
            // (1.0 - smoothstep(0.12..0.5) — edge0 > edge1 é indefinido em GLSL.
            float d = length(gl_PointCoord - 0.5);
            float disc = 1.0 - smoothstep(0.12, 0.5, d);
            float alpha = clamp(
              (uBaseAlpha + uWaveAmp * vWave) * disc + uHitStrength * vInflu * disc,
              0.0,
              1.0
            );
            // Sob o cursor, o ponto levanta cor até branco puro
            vec3 col = mix(uColor, vec3(1.0), min(vInflu * 0.9, 1.0));
            gl_FragColor = vec4(col, alpha);
          }
        `,
      }),
    [interaction],
  );

  // Atualiza tempo e escala de atenuação (px reais do viewport) por frame
  useFrame((state) => {
    if (earthZoom.paused.value) return; // globo invisível — liberta frames
    material.uniforms.uTime.value = state.clock.elapsedTime;
    const fov = (camera as THREE.PerspectiveCamera).fov ?? 42;
    material.uniforms.uScale.value =
      (size.height * gl.getPixelRatio()) / (2 * Math.tan((fov * Math.PI) / 360));
  });

  if (!geometry) return null;
  return <points geometry={geometry} material={material} />;
}

/** Rig de câmara: dolly para dentro do globo conforme earthZoom.progress. */
function CameraRig() {
  const { camera, size } = useThree();
  const target = useMemo(() => new THREE.Vector3(0, 0, 0), []);

  // Parallax do ponteiro: alvo suave (−1..1) atualizado por listeners de rato
  const pointer = useRef({ x: 0, y: 0 });
  const smooth = useRef({ x: 0, y: 0 });

  useEffect(() => {
    // Parallax só em ponteiros FINOS (rato/trackpad). No toque, pointermove
    // dispara durante o scroll e o deslocamento da câmara brigava com ele.
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useFrame((_, delta) => {
    if (earthZoom.paused.value) return; // globo invisível — liberta frames
    const p = Math.min(Math.max(earthZoom.progress.value, 0), 1);
    const eased = p * p * (3 - 2 * p); // smoothstep

    // Enquadramento responsivo: em ecrãs verticais (telemóvel) a FOV vertical
    // fixa cortava o globo nas laterais — a distância base recua até a esfera
    // caber em LARGURA. Em desktop (aspect ≥ 1) mantém DOLLY_FROM exato.
    const vHalf = Math.tan(((camera as THREE.PerspectiveCamera).fov ?? 42) * (Math.PI / 360));
    const aspect = size.width / Math.max(size.height, 1);
    const fitDist = 1.15 / (vHalf * Math.min(aspect, 1)); // margem de 15%
    const distBase = Math.max(DOLLY_FROM, fitDist);
    const dist = THREE.MathUtils.lerp(distBase, DOLLY_TO, eased);

    // Amortecimento exponencial independente do frame rate — o globo
    // "segue" o rato com atraso suave. O parallax desvanece durante o
    // mergulho (dentro do globo não faz sentido).
    const damp = 1 - Math.exp(-2.6 * delta);
    smooth.current.x += (pointer.current.x - smooth.current.x) * damp;
    smooth.current.y += (pointer.current.y - smooth.current.y) * damp;
    const px = smooth.current.x * 0.22 * (1 - eased);
    const py = smooth.current.y * 0.14 * (1 - eased);

    // A câmara mergulha ligeiramente de cima, como uma aproximação orbital
    camera.position.set(px, 0.25 * (1 - eased) - py, dist);
    camera.lookAt(target);
  });
  return null;
}

/**
 * O globo que roda: só a malha de pontos dos continentes.
 * GSAP (e não Framer Motion) trata do seguimento do ponteiro: é um tween de
 * OBJETO (Vector2), sem re-render do React — o useFrame lê o valor final
 * amortecido e escreve uniforms do shader. Framer Motion anima DOM/componentes
 * e não tem ponte limpa para uniforms a 60 fps.
 */
function RotatingGlobe({ texture }: { texture: string }) {
  const group = useRef<THREE.Group>(null);

  // Interação ponteiro↔pontos — escrita por frame, lida pelo shader
  const interaction = useMemo<GlobeInteraction>(
    () => ({
      uHit: { value: new THREE.Vector3(999, 999, 999) },
      uHitActive: { value: 0 },
    }),
    [],
  );

  // Posição do cursor em NDC, amortecida por GSAP (overwrite cancela o tween
  // anterior a cada movimento — seguimento suave sem jitter)
  const ndc = useMemo(() => new THREE.Vector2(), []);
  const hitActive = useRef(0);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const sphere = useMemo(
    () => new THREE.Sphere(new THREE.Vector3(0, 0, 0), EARTH_RADIUS * 1.004),
    [],
  );
  const hitWorld = useMemo(() => new THREE.Vector3(), []);
  const hitLocal = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    // Holofote do cursor só em ponteiros FINOS — no toque, pointermove
    // dispara durante o scroll e o efeito acendia pontos ao acidentalmente.
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const onMove = (e: PointerEvent) => {
      gsap.to(ndc, {
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: -(e.clientY / window.innerHeight) * 2 + 1,
        duration: 0.7,
        ease: "power2.out",
        overwrite: true,
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      gsap.killTweensOf(ndc);
    };
  }, [ndc]);

  useFrame((state, delta) => {
    if (earthZoom.paused.value) return; // globo invisível — liberta frames
    if (!group.current) return;
    group.current.rotation.y += delta * SPIN;

    // Raio do cursor → interseção com a esfera; o ponto de impacto passa-se
    // para o espaço local do grupo (que roda) e alimenta o shader dos pontos.
    raycaster.setFromCamera(ndc, state.camera);
    const hit = raycaster.ray.intersectSphere(sphere, hitWorld);
    if (hit) {
      group.current.updateMatrixWorld();
      hitLocal.copy(hitWorld);
      group.current.worldToLocal(hitLocal);
      interaction.uHit.value.lerp(hitLocal, 0.4);
    }
    // Fade in/out do efeito quando o cursor entra/sai da esfera
    const target = hit ? 1 : 0;
    hitActive.current += (target - hitActive.current) * (1 - Math.exp(-6 * delta));
    interaction.uHitActive.value = hitActive.current;
  });

  return (
    <group ref={group}>
      <ContinentDots texture={texture} interaction={interaction} />
    </group>
  );
}

/* ------------------------------ componente -------------------------------- */

export default function GlassGlobe({ className }: { className?: string }) {
  const [webgl, setWebgl] = useState<boolean | null>(null);

  // Sonda de capacidades WebGL (efeito — seguro para SSR)
  useEffect(() => {
    try {
      const c = document.createElement("canvas");
      setWebgl(!!(c.getContext("webgl2") || c.getContext("webgl")));
    } catch {
      setWebgl(false);
    }
  }, []);

  return (
    <div className={`relative isolate ${className ?? ""}`} aria-hidden="true">
      {/* Fallback estático — só renderiza quando NÃO há WebGL. Sem fundo
          opaco: o campo estelar do herói tem de ficar visível à volta do
          globo, e com o canvas transparente este círculo não pode aparecer
          "dentro" do planeta. */}
      {webgl === false && (
        <div className="absolute inset-0 z-0 flex items-center justify-center">
          <div className="h-[62vmin] w-[62vmin] rounded-full border border-white/10 bg-[radial-gradient(circle_at_50%_50%,rgba(58,58,58,0.5)_0%,rgba(70,72,76,0.7)_78%,rgba(3,5,9,0.95)_100%)] shadow-[0_0_120px_rgba(200,205,215,0.12)] md:h-[72vmin] md:w-[72vmin]" />
        </div>
      )}

      {webgl && (
        <div className="absolute inset-0 z-10">
          <Suspense fallback={null}>
            <Canvas
              camera={{ position: [0, 0.25, DOLLY_FROM], fov: 42, near: 0.05, far: 100 }}
              dpr={[1, 2]}
              gl={{ alpha: true, antialias: true }}
            >
              {/* Fundo transparente — o campo estelar do herói (star-layer--hero)
                  fica visível à volta e através do globo de vidro. */}
              <CameraRig />
              {/* Vidro + halo NÃO rodam (a fresnel é uniforme na esfera) */}
              <GlassShell />
              <OuterHalo />
              {/* Continentes, graticula, arcos e hubs rodam juntos */}
              <RotatingGlobe texture="/textures/earth-water.png" />
            </Canvas>
          </Suspense>
        </div>
      )}
    </div>
  );
}

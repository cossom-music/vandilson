"use client";

import { useEffect, useMemo, useRef, useState, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { earthZoom } from "@/lib/earthZoom";
import { heroCine } from "@/lib/heroCine";
import GlassGlobe, { type GlobeVariant } from "@/components/earth/GlassGlobe";

/**
 * ANISOTROPIA das texturas do planeta e da lua.
 *
 * Vale 16 — e o three limita automaticamente ao máximo que a GPU suportar, por
 * isso pedir alto nunca estraga nada. É a alavanca certa para o MERGULHO: a
 * superfície que a câmara vê é quase toda em ângulo rasante, e sem anisotropia
 * o amostrador cai para um mip level largo (o chão do planeta fica a borracha
 * mal se aproxima). Estava a 4 na Terra e nem era definida na lua (ficava 1).
 */
const MAX_ANISO = 16;

/**
 * Cena 3D realista do herói para as variantes coloridas (/hero-b e /hero-d
 * são as páginas vivas; galaxy/ember ficam como variantes dormentes).
 *
 *   atmo   (B, ref2) — limbo azul ELÉTRICO + luzes de cidade douradas (WebGL)
 *   dawn   (D, ref4) — limbo da Terra em baixo, lua escura, sol ESTRELADO
 *                      com flare, atmosfera a incendiar-se no contacto
 *   galaxy (ref1, dormente) — Terra centrada + lua
 *   ember  (ref3, dormente) — Sol ao centro + 4 planetas em silhueta
 *
 * O que a variante acrescenta por cima do "globo genérico" é geometria e
 * shader — não CSS: o limbo (AtmosphereLimb), as luzes de cidade
 * (CityLights) e o sol (StarSun) vivem na cena. O HeroLayers só trata do
 * que é verdadeiramente fino (névoa, bloom sobre o contacto).
 *
 * "silver" (homepage /) delega para o GlassGlobe original — zero regressões.
 *
 * ZOOM NO SCROLL: a câmara faz dolly lendo earthZoom.progress e PARA mesmo
 * fora da superfície — a Terra/objeto enche o ecrã no fim do mergulho, por
 * isso nunca se vê o espaço ATRAVÉS do planeta. O campo estelar escala em
 * contra-movimento (o fundo participa do zoom).
 */

/* ---------------------------- ruído procedural ---------------------------- */

/** Hash 3D determinístico → [0,1). */
function hash3(x: number, y: number, z: number): number {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(z, 1440662683);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Value noise 3D com interpolação suave — contínuo, sem costuras. */
function vnoise3(x: number, y: number, z: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  const xf = x - xi;
  const yf = y - yi;
  const zf = z - zi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const w = zf * zf * (3 - 2 * zf);
  const c000 = hash3(xi, yi, zi);
  const c100 = hash3(xi + 1, yi, zi);
  const c010 = hash3(xi, yi + 1, zi);
  const c110 = hash3(xi + 1, yi + 1, zi);
  const c001 = hash3(xi, yi, zi + 1);
  const c101 = hash3(xi + 1, yi, zi + 1);
  const c011 = hash3(xi, yi + 1, zi + 1);
  const c111 = hash3(xi + 1, yi + 1, zi + 1);
  const x00 = c000 + (c100 - c000) * u;
  const x10 = c010 + (c110 - c010) * u;
  const x01 = c001 + (c101 - c001) * u;
  const x11 = c011 + (c111 - c011) * u;
  const y0 = x00 + (x10 - x00) * v;
  const y1 = x01 + (x11 - x01) * v;
  return y0 + (y1 - y0) * w;
}

/** fBm — soma de oitavas de value noise. */
function fbm3(x: number, y: number, z: number, octaves: number): number {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;
  for (let o = 0; o < octaves; o++) {
    sum += amp * vnoise3(x * freq, y * freq, z * freq);
    freq *= 2.03;
    amp *= 0.5;
  }
  return sum;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/** lat/lon → posição na esfera (mesma convenção da máscara earth-water.png). */
function latLonToVec3(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lon + 180) * Math.PI) / 180;
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

/* ------------------------- texturas de luz (sol) -------------------------- */

/**
 * Textura radial com a queda que se lhe pedir — núcleo do sol e bloom.
 * `stops` são [posição 0→1, cor] e a última deve ser transparente (a queda
 * até zero na borda do sprite é o que evita ver o quadrado).
 */
function radialTexture(stops: [number, string][], size = 256): THREE.CanvasTexture {
  const cv = document.createElement("canvas");
  cv.width = size;
  cv.height = size;
  const ctx = cv.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [at, color] of stops) g.addColorStop(at, color);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(cv);
}

/**
 * FLARE — o "estrelado" da ref4: agulhas que partem do núcleo em N direções,
 * cada uma com o seu comprimento e ganho. O gradiente é simétrico (0 no
 * centro → cor → 0 na ponta) para a agulha nascer sempre no disco do sol e
 * morrer antes da borda da textura. Textura quadrada: o aspeto anamórfico
 * (agulha mais comprida na horizontal) vem da ESCALA do sprite, não do desenho.
 */
type FlareRay = { angle: number; len: number; width: number; gain: number };

function flareTexture(color: string, rays: FlareRay[], size = 512): THREE.CanvasTexture {
  const cv = document.createElement("canvas");
  cv.width = size;
  cv.height = size;
  const ctx = cv.getContext("2d")!;
  // Suaviza as agulhas; onde não existe (Safari antigo) ficam só mais duras.
  try {
    ctx.filter = "blur(1.6px)";
  } catch {
    /* opcional */
  }
  const half = size / 2;
  for (const ray of rays) {
    ctx.save();
    ctx.translate(half, half);
    ctx.rotate(ray.angle);
    ctx.globalAlpha = ray.gain;
    const len = ray.len * half;
    const g = ctx.createLinearGradient(-len, 0, len, 0);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(0.5, color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(-len, -ray.width / 2, len * 2, ray.width);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  // Grão de luz no centro — sem isto o cruzamento das agulhas fica "vazio".
  const core = ctx.createRadialGradient(half, half, 0, half, half, size * 0.06);
  core.addColorStop(0, color);
  core.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = core;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(cv);
}

/* --------------------------- textura da Terra ----------------------------- */

type EarthMaps = { map: THREE.CanvasTexture; rough: THREE.CanvasTexture; bump: THREE.CanvasTexture };

/**
 * Gera map+roughness+bump a partir de fBm 3D amostrado NA ESFERA
 * (seamless por construção). Oceanos com profundidade, continentes com
 * desertos na faixa subtropical, montanhas, neve e calotes polares.
 */
function buildProceduralEarthMaps(w: number, h: number, octaves: number, seed: number): EarthMaps {
  const mapCv = document.createElement("canvas");
  mapCv.width = w;
  mapCv.height = h;
  const roughCv = document.createElement("canvas");
  roughCv.width = w;
  roughCv.height = h;
  const bumpCv = document.createElement("canvas");
  bumpCv.width = w;
  bumpCv.height = h;
  const mctx = mapCv.getContext("2d")!;
  const rctx = roughCv.getContext("2d")!;
  const bctx = bumpCv.getContext("2d")!;
  const mImg = mctx.createImageData(w, h);
  const rImg = rctx.createImageData(w, h);
  const bImg = bctx.createImageData(w, h);

  const LAND = 0.545; // limiar continente/oceano

  for (let y = 0; y < h; y++) {
    const lat = 90 - (y / (h - 1)) * 180;
    const latRad = (lat * Math.PI) / 180;
    const absLat = Math.abs(lat);
    for (let x = 0; x < w; x++) {
      const lon = (x / w) * 360 - 180;
      const lonRad = (lon * Math.PI) / 180;
      // ponto na esfera unitária → amostragem 3D sem costuras
      const sx = Math.sin(latRad) * Math.cos(lonRad);
      const sy = Math.cos(latRad);
      const sz = Math.sin(latRad) * Math.sin(lonRad);
      const n = fbm3(sx * 2.1 + seed, sy * 2.1 + seed * 0.7, sz * 2.1, octaves);
      const detail = fbm3(sx * 7 + seed * 2, sy * 7, sz * 7, 3);

      let r: number, g: number, b: number, rough: number, elev: number;

      if (n >= LAND) {
        // ── continente ──
        elev = (n - LAND) / (1 - LAND); // 0 costa → 1 montanha
        // deserto na faixa subtropical (~±20–32°), verde no resto
        const desert = Math.exp(-Math.pow((absLat - 25) / 13, 2)) * clamp01((detail - 0.35) * 2.4);
        let lr = mix(56, 138, desert);
        let lg = mix(98, 116, desert);
        let lb = mix(52, 74, desert);
        // montanhas acinzentadas
        const mount = smooth(0.42, 0.75, elev);
        lr = mix(lr, 122, mount);
        lg = mix(lg, 112, mount);
        lb = mix(lb, 100, mount);
        // variação de tom (manchas)
        const shade = 0.9 + detail * 0.2;
        r = lr * shade;
        g = lg * shade;
        b = lb * shade;
        rough = 232;
      } else {
        // ── oceano ──
        const depth = smooth(0.18, LAND, n); // 0 abismo → 1 costa
        r = mix(8, 38, depth);
        g = mix(34, 108, depth);
        b = mix(72, 158, depth);
        // ondas subtis
        const w2 = 0.94 + detail * 0.12;
        r *= w2;
        g *= w2;
        b *= w2;
        elev = 0.12;
        rough = 74; // água lisa → reflexo especular
      }

      // neve: calotes polares + picos altos
      const jitter = (detail - 0.5) * 10;
      const cap = smooth(63, 72, absLat + jitter);
      const snow = Math.max(cap, smooth(0.62, 0.85, elev) * (n >= LAND ? 1 : 0));
      if (snow > 0) {
        r = mix(r, 234, snow);
        g = mix(g, 240, snow);
        b = mix(b, 246, snow);
        rough = mix(rough, 200, snow);
        elev = mix(elev, 0.35, snow);
      }

      const i = (y * w + x) * 4;
      mImg.data[i] = r;
      mImg.data[i + 1] = g;
      mImg.data[i + 2] = b;
      mImg.data[i + 3] = 255;
      rImg.data[i] = rough;
      rImg.data[i + 1] = rough;
      rImg.data[i + 2] = rough;
      rImg.data[i + 3] = 255;
      const bump = clamp01(elev) * 255;
      bImg.data[i] = bump;
      bImg.data[i + 1] = bump;
      bImg.data[i + 2] = bump;
      bImg.data[i + 3] = 255;
    }
  }

  mctx.putImageData(mImg, 0, 0);
  rctx.putImageData(rImg, 0, 0);
  bctx.putImageData(bImg, 0, 0);

  const make = (cv: HTMLCanvasElement, srgb: boolean) => {
    const t = new THREE.CanvasTexture(cv);
    if (srgb) {
      const any = t as unknown as { colorSpace?: unknown };
      if ("colorSpace" in any) t.colorSpace = THREE.SRGBColorSpace;
    }
    t.wrapS = THREE.RepeatWrapping;
    t.anisotropy = MAX_ANISO;
    return t;
  };
  return { map: make(mapCv, true), rough: make(roughCv, false), bump: make(bumpCv, false) };
}

/**
 * Terra REALISTA a partir da máscara earth-water.png — CONTINENTES REAIS
 * (Américas, África, Eurásia nas posições verdadeiras). Oceanos com
 * PROFUNDIDADE: campo desfocado da máscara — longe da costa = abismo
 * escuro, junto à costa = azul claro. Continentes com biomas por fBm
 * (deserto subtropical, montanhas, neve) e calotes polares.
 * Devolve null se a máscara falhar (fica o procedural como fallback).
 */
function buildRealEarthMaps(w: number, h: number, octaves: number): Promise<EarthMaps | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const cv = document.createElement("canvas");
        cv.width = w;
        cv.height = h;
        const ctx = cv.getContext("2d", { willReadFrequently: true })!;
        ctx.drawImage(img, 0, 0, w, h);
        const md = ctx.getImageData(0, 0, w, h).data;

        // polaridade (a máscara tem a terra ESCURA; auto-deteta por segurança)
        let dark = 0;
        let total = 0;
        for (let i = 0; i < md.length; i += 4 * 973) {
          total++;
          if (md[i] < 100) dark++;
        }
        const landIsDark = dark / Math.max(total, 1) <= 0.5;

        const land = new Float32Array(w * h);
        for (let p = 0; p < w * h; p++) {
          const lum = md[p * 4];
          land[p] = (landIsDark ? lum < 100 : lum >= 100) ? 1 : 0;
        }

        // campo "perto da costa" — box blur separável da máscara (3 passes)
        const blurred = (() => {
          let a = Float32Array.from(land);
          let b = new Float32Array(w * h);
          const R = 9;
          const pass = (inp: Float32Array, out: Float32Array) => {
            const tmpH = new Float32Array(w * h);
            for (let y = 0; y < h; y++) {
              let acc = 0;
              for (let k = -R; k <= R; k++) acc += inp[y * w + Math.min(w - 1, Math.max(0, k))];
              for (let x = 0; x < w; x++) {
                tmpH[y * w + x] = acc / (2 * R + 1);
                const xo = Math.min(w - 1, Math.max(0, x - R));
                const xn = Math.min(w - 1, Math.max(0, x + R + 1));
                acc += inp[y * w + xn] - inp[y * w + xo];
              }
            }
            for (let x = 0; x < w; x++) {
              let acc = 0;
              for (let k = -R; k <= R; k++) acc += tmpH[Math.min(h - 1, Math.max(0, k)) * w + x];
              for (let y = 0; y < h; y++) {
                out[y * w + x] = acc / (2 * R + 1);
                const yo = Math.min(h - 1, Math.max(0, y - R));
                const yn = Math.min(h - 1, Math.max(0, y + R + 1));
                acc += tmpH[yn * w + x] - tmpH[yo * w + x];
              }
            }
          };
          for (let p = 0; p < 3; p++) {
            pass(a, b);
            const t = a;
            a = b;
            b = t;
          }
          return a;
        })();

        const mapCv = document.createElement("canvas");
        mapCv.width = w;
        mapCv.height = h;
        const roughCv = document.createElement("canvas");
        roughCv.width = w;
        roughCv.height = h;
        const bumpCv = document.createElement("canvas");
        bumpCv.width = w;
        bumpCv.height = h;
        const mctx = mapCv.getContext("2d")!;
        const rctx = roughCv.getContext("2d")!;
        const bctx = bumpCv.getContext("2d")!;
        const mImg = mctx.createImageData(w, h);
        const rImg = rctx.createImageData(w, h);
        const bImg = bctx.createImageData(w, h);

        for (let y = 0; y < h; y++) {
          const lat = 90 - (y / (h - 1)) * 180;
          const latRad = (lat * Math.PI) / 180;
          const absLat = Math.abs(lat);
          for (let x = 0; x < w; x++) {
            const lon = (x / w) * 360 - 180;
            const lonRad = (lon * Math.PI) / 180;
            const sx = Math.sin(latRad) * Math.cos(lonRad);
            const sy = Math.cos(latRad);
            const sz = Math.sin(latRad) * Math.sin(lonRad);
            const p = y * w + x;
            const isLand = land[p] > 0.5;
            const detail = fbm3(sx * 7 + 11, sy * 7 + 5, sz * 7, 3);

            let r: number, g: number, b: number, rough: number, elev: number;

            if (isLand) {
              // biomas: verde → deserto subtropical → montanha cinzenta
              const n = fbm3(sx * 2.1 + 3.7, sy * 2.1 + 2.6, sz * 2.1, octaves);
              elev = clamp01((n - 0.4) / 0.6);
              const desert = Math.exp(-Math.pow((absLat - 25) / 13, 2)) * clamp01((detail - 0.35) * 2.4);
              let lr = mix(56, 148, desert);
              let lg = mix(98, 124, desert);
              let lb = mix(52, 78, desert);
              const mount = smooth(0.4, 0.72, elev);
              lr = mix(lr, 126, mount);
              lg = mix(lg, 114, mount);
              lb = mix(lb, 98, mount);
              const shade = 0.9 + detail * 0.2;
              r = lr * shade;
              g = lg * shade;
              b = lb * shade;
              rough = 225;
            } else {
              // oceano com PROFUNDIDADE REAL: longe da costa = abismo
              const coastNear = clamp01(blurred[p] / 0.42); // 1 junto à costa
              const depth = 1 - coastNear; // 1 = abismo
              r = mix(34, 7, smooth(0, 1, depth));
              g = mix(126, 32, smooth(0, 1, depth));
              b = mix(172, 78, smooth(0, 1, depth));
              const wv = 0.95 + detail * 0.1;
              r *= wv;
              g *= wv;
              b *= wv;
              elev = 0.1;
              rough = 72;
            }

            // gelo polar (banquisa no Ártico + neve continental)
            const jitter = (detail - 0.5) * 8;
            const cap = smooth(68, 78, absLat + jitter);
            const snowLand = isLand ? smooth(60, 72, absLat + jitter) : 0;
            const snow = Math.max(cap, snowLand);
            if (snow > 0) {
              r = mix(r, 232, snow);
              g = mix(g, 240, snow);
              b = mix(b, 246, snow);
              rough = mix(rough, 190, snow);
            }

            const i = p * 4;
            mImg.data[i] = r;
            mImg.data[i + 1] = g;
            mImg.data[i + 2] = b;
            mImg.data[i + 3] = 255;
            rImg.data[i] = rough;
            rImg.data[i + 1] = rough;
            rImg.data[i + 2] = rough;
            rImg.data[i + 3] = 255;
            const bv = clamp01(elev) * 255;
            bImg.data[i] = bv;
            bImg.data[i + 1] = bv;
            bImg.data[i + 2] = bv;
            bImg.data[i + 3] = 255;
          }
        }

        mctx.putImageData(mImg, 0, 0);
        rctx.putImageData(rImg, 0, 0);
        bctx.putImageData(bImg, 0, 0);

        const make = (cvv: HTMLCanvasElement, srgb: boolean) => {
          const t = new THREE.CanvasTexture(cvv);
          if (srgb) {
            const any = t as unknown as { colorSpace?: unknown };
            if ("colorSpace" in any) t.colorSpace = THREE.SRGBColorSpace;
          }
          t.wrapS = THREE.RepeatWrapping;
          t.anisotropy = MAX_ANISO;
          return t;
        };
        resolve({ map: make(mapCv, true), rough: make(roughCv, false), bump: make(bumpCv, false) });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = "/textures/earth-water.png";
  });
}

/** Nuvens — fBm suave com alpha, desvanecem nos polos. */
function buildCloudTexture(w: number, h: number): THREE.CanvasTexture {
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext("2d")!;
  const img = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    const lat = 90 - (y / (h - 1)) * 180;
    const latRad = (lat * Math.PI) / 180;
    const absLat = Math.abs(lat);
    for (let x = 0; x < w; x++) {
      const lon = (x / w) * 360 - 180;
      const lonRad = (lon * Math.PI) / 180;
      const sx = Math.sin(latRad) * Math.cos(lonRad);
      const sy = Math.cos(latRad);
      const sz = Math.sin(latRad) * Math.sin(lonRad);
      const c = fbm3(sx * 3.4 + 40, sy * 3.4 + 11, sz * 3.4, 4);
      const band = 0.75 + 0.25 * Math.sin(latRad * 6); // faixas climáticas
      const a = smooth(0.5, 0.74, c * band) * (1 - smooth(68, 84, absLat));
      const i = (y * w + x) * 4;
      img.data[i] = 255;
      img.data[i + 1] = 255;
      img.data[i + 2] = 255;
      img.data[i + 3] = a * 235;
    }
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(cv);
  const any = t as unknown as { colorSpace?: unknown };
  if ("colorSpace" in any) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

/* ----------------------------- textura da Lua ----------------------------- */

type MoonMaps = { map: THREE.CanvasTexture; bump: THREE.CanvasTexture };

/** Lua: mares de fBm + crateras com borda clara/fundo escuro, + bump map. */
function buildMoonMaps(w: number, h: number): MoonMaps {
  const mapCv = document.createElement("canvas");
  mapCv.width = w;
  mapCv.height = h;
  const bumpCv = document.createElement("canvas");
  bumpCv.width = w;
  bumpCv.height = h;
  const mctx = mapCv.getContext("2d")!;
  const bctx = bumpCv.getContext("2d")!;

  // base marmoreada por fBm
  const img = mctx.createImageData(w, h);
  const bimg = bctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    const lat = 90 - (y / (h - 1)) * 180;
    const latRad = (lat * Math.PI) / 180;
    for (let x = 0; x < w; x++) {
      const lon = (x / w) * 360 - 180;
      const lonRad = (lon * Math.PI) / 180;
      const sx = Math.sin(latRad) * Math.cos(lonRad);
      const sy = Math.cos(latRad);
      const sz = Math.sin(latRad) * Math.sin(lonRad);
      const n = fbm3(sx * 4 + 90, sy * 4 + 33, sz * 4, 4);
      const mare = smooth(0.34, 0.5, n); // mares escuros
      let v = mix(186, 118, mare * 0.9);
      v *= 0.92 + (fbm3(sx * 12, sy * 12, sz * 12, 2) - 0.5) * 0.24;
      const i = (y * w + x) * 4;
      img.data[i] = v;
      img.data[i + 1] = v * 0.985;
      img.data[i + 2] = v * 0.955;
      img.data[i + 3] = 255;
      const bv = mare * 90 + 90;
      bimg.data[i] = bv;
      bimg.data[i + 1] = bv;
      bimg.data[i + 2] = bv;
      bimg.data[i + 3] = 255;
    }
  }
  mctx.putImageData(img, 0, 0);
  bctx.putImageData(bimg, 0, 0);

  // crateras: piso escuro + aro claro (map) — côncavo no bump
  let seed = 1234;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let i = 0; i < 130; i++) {
    const cx = rnd() * w;
    const cy = h * 0.08 + rnd() * h * 0.84;
    const r = 1.5 + Math.pow(rnd(), 2.2) * (w * 0.035);
    // piso
    const g1 = mctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g1.addColorStop(0, "rgba(74,72,70,0.5)");
    g1.addColorStop(0.75, "rgba(110,108,106,0.28)");
    g1.addColorStop(1, "rgba(110,108,106,0)");
    mctx.fillStyle = g1;
    mctx.beginPath();
    mctx.arc(cx, cy, r, 0, Math.PI * 2);
    mctx.fill();
    // aro iluminado
    mctx.strokeStyle = "rgba(226,224,220,0.5)";
    mctx.lineWidth = Math.max(0.6, r * 0.16);
    mctx.beginPath();
    mctx.arc(cx, cy, r * 0.92, 0, Math.PI * 2);
    mctx.stroke();
    // bump: fundo escuro (côncavo) + aro claro
    const g2 = bctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g2.addColorStop(0, "rgba(0,0,0,0.85)");
    g2.addColorStop(0.8, "rgba(40,40,40,0.3)");
    g2.addColorStop(1, "rgba(255,255,255,0)");
    bctx.fillStyle = g2;
    bctx.beginPath();
    bctx.arc(cx, cy, r, 0, Math.PI * 2);
    bctx.fill();
    bctx.strokeStyle = "rgba(255,255,255,0.8)";
    bctx.lineWidth = Math.max(0.6, r * 0.2);
    bctx.beginPath();
    bctx.arc(cx, cy, r * 0.9, 0, Math.PI * 2);
    bctx.stroke();
  }

  const make = (cv: HTMLCanvasElement, srgb: boolean) => {
    const t = new THREE.CanvasTexture(cv);
    if (srgb) {
      const any = t as unknown as { colorSpace?: unknown };
      if ("colorSpace" in any) t.colorSpace = THREE.SRGBColorSpace;
    }
    t.wrapS = THREE.RepeatWrapping;
    t.anisotropy = MAX_ANISO;
    return t;
  };
  return { map: make(mapCv, true), bump: make(bumpCv, false) };
}

/* --------------------------------- câmara --------------------------------- */

/**
 * Trajetória por variante: posição/alvo inicial (responsivo) → final.
 * O fim fica SEMPRE fora da superfície — o objeto enche o ecrã e o
 * cross-fade para a Música acontece "dentro" do planeta.
 */
const FOV = 42;

function startDistance(variant: Exclude<GlobeVariant, "silver">, aspect: number): number {
  const vHalf = Math.tan((FOV * Math.PI) / 360);
  if (variant === "galaxy") {
    const fit = 1.32 / (vHalf * Math.min(aspect, 1));
    return Math.max(3.7, fit);
  }
  if (variant === "atmo") return aspect < 1 ? 6.6 : 7.4;
  if (variant === "ember") return aspect < 1 ? 6.2 : 5.4;
  return aspect < 1 ? 7.8 : 6.2; // dawn
}

const CAM_END: Record<
  Exclude<GlobeVariant, "silver">,
  { pos: [number, number, number]; target: [number, number, number]; startTarget: [number, number, number] }
> = {
  galaxy: { pos: [0, 0, 1.3], target: [0, 0, 0], startTarget: [0, 0, 0] },
  // atmo: o fim do mergulho fica a 0.35 da superfície (não 0.2): a textura do
  // Black Marble perde bem menos qualidade no fim do zoom. Era a posição
  // [0, -1.15, 2.35] — recuada ao longo da mesma direção (dist. ao centro
  // 2.90 → 3.05).
  atmo: { pos: [0, -1.06, 2.47], target: [0, -2.85, 0], startTarget: [0, -0.5, 0] },
  ember: { pos: [0, 0.1, 2.4], target: [0, 0.1, -0.5], startTarget: [0, 0.1, 0] },
  dawn: { pos: [0.12, 0.45, -1.3], target: [0.12, 0.48, -2.9], startTarget: [0, 0.2, -0.5] },
};

function CameraRig({ variant }: { variant: Exclude<GlobeVariant, "silver"> }) {
  const { camera, size } = useThree();
  const end = CAM_END[variant];
  const endPos = useMemo(() => new THREE.Vector3(...end.pos), [end]);
  const endTarget = useMemo(() => new THREE.Vector3(...end.target), [end]);
  const startTarget = useMemo(() => new THREE.Vector3(...end.startTarget), [end]);
  const curTarget = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    if (earthZoom.paused.value) return;
    const p = clamp01(earthZoom.progress.value);
    const eased = p * p * (3 - 2 * p);

    const aspect = size.width / Math.max(size.height, 1);
    const distBase = startDistance(variant, aspect);
    const startPos = new THREE.Vector3(0, 0.25, distBase);

    camera.position.lerpVectors(startPos, endPos, eased);
    curTarget.lerpVectors(startTarget, endTarget, eased);
    camera.lookAt(curTarget);
  });
  return null;
}

/* ----------------------------- fundo estelar ------------------------------ */

/**
 * Uma CAMADA de estrelas (pontos aditivos). Cada camada tem o seu ritmo de
 * contra-zoom, por isso a densa e a brilhante afastam-se a velocidades
 * diferentes — é isso que dá profundidade ao céu durante o mergulho.
 */
function StarLayer({
  count,
  size,
  opacity,
  color,
  speed,
  seed,
  spread = 1.4,
  warm = 0,
  twinkle = 0.12,
}: {
  count: number;
  size: number;
  opacity: number;
  color: string;
  speed: number;
  seed: number;
  /** Até quanto o tamanho de uma estrela pode passar o `size` da camada. */
  spread?: number;
  /** Fração de estrelas que puxam para o âmbar (o resto fica na cor da camada). */
  warm?: number;
  /** Amplitude da cintilação (0 = fixas). */
  twinkle?: number;
}) {
  const dot = useMemo(() => starDotTexture(), []);
  const { size: viewport, gl } = useThree();

  // Atributos POR ESTRELA. O PointsMaterial só sabe um tamanho por camada, e
  // um céu com 2000 estrelas gémeas lê-se como textura, não como céu: aqui cada
  // uma traz tamanho (cauda longa — as grandes são raras), brilho, cor própria
  // e fase de cintilação.
  const { position, aSize, aBright, aColor, aPhase } = useMemo(() => {
    const position = new Float32Array(count * 3);
    const aSize = new Float32Array(count);
    const aBright = new Float32Array(count);
    const aColor = new Float32Array(count * 3);
    const aPhase = new Float32Array(count);
    const base = new THREE.Color(color);
    const warmCol = new THREE.Color("#ffd9a8");
    const tint = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 40 + Math.random() * 160;
      position[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      position[i * 3 + 1] = r * Math.cos(phi);
      position[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      aSize[i] = 0.55 + Math.pow(Math.random(), 2.6) * spread;
      aBright[i] = 0.5 + Math.random() * 0.5;
      aPhase[i] = Math.random() * 6.2831853;
      tint.copy(base).lerp(warmCol, Math.random() < warm ? Math.random() * 0.85 : 0);
      aColor[i * 3] = tint.r;
      aColor[i * 3 + 1] = tint.g;
      aColor[i * 3 + 2] = tint.b;
    }
    return { position, aSize, aBright, aColor, aPhase };
    // seed só para forçar uma nova nuvem quando a variante/camada muda
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, seed]);

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(position, 3));
    g.setAttribute("aSize", new THREE.BufferAttribute(aSize, 1));
    g.setAttribute("aBright", new THREE.BufferAttribute(aBright, 1));
    g.setAttribute("aColor", new THREE.BufferAttribute(aColor, 3));
    g.setAttribute("aPhase", new THREE.BufferAttribute(aPhase, 1));
    return g;
  }, [position, aSize, aBright, aColor, aPhase]);

  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uMap: { value: dot },
          uSize: { value: size },
          uOpacity: { value: opacity },
          uScale: { value: 400 },
          uMaxPx: { value: 26 },
          uTime: { value: 0 },
          uTwinkle: { value: twinkle },
        },
        // gl_PointSize na mesma proporção do PointsMaterial (size * pixelRatio
        // * altura/2 / distância), agora com o fator de cada estrela.
        vertexShader: /* glsl */ `
          attribute float aSize;
          attribute float aBright;
          attribute vec3 aColor;
          attribute float aPhase;
          uniform float uSize;
          uniform float uScale;
          uniform float uMaxPx;
          uniform float uTime;
          uniform float uTwinkle;
          varying vec3 vTint;
          varying float vAlpha;
          void main() {
            vTint = aColor;
            // cintilacao propria: cada estrela com a sua fase
            float tw = 1.0 - uTwinkle + uTwinkle * sin(uTime * 1.1 + aPhase);
            vAlpha = aBright * tw;
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = clamp(uSize * aSize * (uScale / -mv.z), 0.7, uMaxPx);
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform sampler2D uMap;
          uniform float uOpacity;
          varying vec3 vTint;
          varying float vAlpha;
          void main() {
            // O disco macio: sem ele o gl_Point sai quadrado.
            float a = texture2D(uMap, gl_PointCoord).a * vAlpha * uOpacity;
            if (a < 0.004) discard;
            gl_FragColor = vec4(vTint, a);
          }
        `,
      }),
    [dot, size, opacity, twinkle],
  );

  const mesh = useRef<THREE.Points>(null);

  useFrame((state) => {
    const u = mat.uniforms;
    // A escala depende do viewport (resize / dpr), não do scroll: fica fora do
    // guard para as estrelas nunca ficarem com tamanho errado quando a cena
    // está em pausa (ex.: reduced motion).
    u.uScale.value = viewport.height * 0.5 * gl.getPixelRatio();
    u.uTime.value = state.clock.elapsedTime;
    if (!mesh.current || earthZoom.paused.value) return;
    const p = clamp01(earthZoom.progress.value);
    // contra-zoom: o fundo AFASTA-SE enquanto a câmara mergulha
    mesh.current.scale.setScalar(1 + p * speed);
  });

  return <points ref={mesh} geometry={geo} material={mat} />;
}

function StarFieldBackground({ variant }: { variant: GlobeVariant }) {
  // Nos heróis coloridos o céu tem de ser ESTRELADO a sério (a ref2 pede-o
  // literalmente). Quatro camadas, cada uma com o seu contra-zoom, dão a
  // profundidade que uma só não dá — e como o véu azul do espaço foi cortado,
  // é este campo que preenche o fundo negro.
  if (variant === "atmo" || variant === "dawn") {
    return (
      <>
        {/* poeira de fundo: densa, discreta, quase toda pequena */}
        <StarLayer count={2600} size={0.2} opacity={0.4} color="#8fb4ea" speed={0.75} seed={1} spread={1.5} twinkle={0.1} />
        {/* campo médio */}
        <StarLayer count={900} size={0.3} opacity={0.6} color="#cfe0ff" speed={1.0} seed={2} spread={1.6} twinkle={0.14} />
        {/* estrelas de primeira grandeza — raras e brancas, umas poucas âmbar */}
        <StarLayer count={260} size={0.5} opacity={0.85} color="#ffffff" speed={1.25} seed={3} spread={1.8} warm={0.22} twinkle={0.18} />
        {/* as maiores, esparsas: é a variação de tamanho que dá escala ao céu */}
        <StarLayer count={70} size={0.85} opacity={1} color="#fff4e2" speed={1.5} seed={4} spread={2.2} warm={0.5} twinkle={0.22} />
      </>
    );
  }
  return (
    <StarLayer
      count={900}
      size={0.42}
      opacity={0.85}
      color={variant === "ember" ? "#ffc890" : "#aebfd8"}
      speed={0.9}
      seed={0}
      spread={1.6}
      warm={variant === "ember" ? 0.4 : 0.15}
    />
  );
}

/** Névoa colorida de fundo — dá o tom do espaço por variante. */
function SpaceTint({ color, opacity }: { color: string; opacity: number }) {
  const texture = useMemo(() => {
    const cv = document.createElement("canvas");
    cv.width = 256;
    cv.height = 256;
    const ctx = cv.getContext("2d")!;
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(cv);
  }, [color]);

  return (
    <sprite position={[0, 0, -60]} scale={[150, 150, 1]}>
      <spriteMaterial
        map={texture}
        transparent
        opacity={opacity}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </sprite>
  );
}

/* ------------------------------ atmosfera --------------------------------- */

/** Casca fresnel — back: halo exterior; front: rim iluminado no limbo. */
function AtmosphereShell({
  radius,
  color,
  intensity,
  power,
  side,
}: {
  radius: number;
  color: string;
  intensity: number;
  power: number;
  side: "front" | "back";
}) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: side === "back" ? THREE.BackSide : THREE.FrontSide,
        uniforms: {
          uColor: { value: new THREE.Color(color) },
          uPower: { value: power },
          uIntensity: { value: intensity },
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
    [color, intensity, power, side],
  );

  return (
    <mesh material={material} scale={radius}>
      <sphereGeometry args={[1, 64, 64]} />
    </mesh>
  );
}

/**
 * BRILHO DA ATMOSFERA — UMA camada só, com queda CONTÍNUA.
 *
 * A primeira tentativa empilhava cascas (aresta fina + corpo + sopro + halo,
 * mais as duas cascas do próprio planeta): cada casca tem o seu pico de
 * fresnel e o que se via eram três anéis azuis em vez de UM brilho.
 *
 * Aqui é uma única função, avaliada por pixel:
 *
 *   · o raio câmara→pixel dá o parâmetro de impacto b (distância da linha ao
 *     centro do planeta); x = b / R, onde x = 1 é exatamente o LIMBO;
 *   · halo — 1 no limbo → 0 em x = 1 + uHalo (o ar visto contra o espaço);
 *   · rim  — 1 no limbo → 0 para dentro do disco (o ar visto contra o planeta);
 *   · edge — agulha fina centrada no limbo: a aresta viva do "corte".
 *
 * As três valem o seu máximo no limbo e caem para zero dos dois lados → a
 * soma é contínua: um brilho único que atravessa a aresta do planeta sem
 * degrau nenhum. O incêndio do amanhecer entra pela NORMAL do ponto de limbo
 * mais próximo (não por outra casca), por isso também não faz anel.
 */
function AtmosphereGlow({
  center,
  radius,
  color,
  hotColor = "#ffc477",
  intensity = 0.6,
  halo = 0.28,
  rim = 0.14,
  rimGain = 0.5,
  falloff = 2.3,
  edge = 0.012,
  edgeGain = 0.5,
  sunDir = [0, 1, 0],
  hot = 0,
  hotSignal,
  hotPower = 2.4,
}: {
  center: [number, number, number];
  radius: number;
  color: string;
  hotColor?: string;
  intensity?: number;
  /** Até onde o halo se estende para fora do limbo (fração do raio). */
  halo?: number;
  /** Largura do rim para dentro do disco (fração do raio). */
  rim?: number;
  rimGain?: number;
  /** Expoente da queda do halo (2 = largo e suave; 4 = colado ao limbo). */
  falloff?: number;
  /** Largura da aresta viva centrada no limbo (fração do raio). */
  edge?: number;
  edgeGain?: number;
  /** Direção do sol (unidades do mundo, do centro do planeta para o sol). */
  sunDir?: [number, number, number];
  /** Intensidade fixa do incêndio; `hotSignal` sobrepõe-se (lido por frame). */
  hot?: number;
  hotSignal?: { value: number };
  hotPower?: number;
}) {
  const { camera } = useThree();

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        // A atmosfera é AR POR CIMA do limbo: está à frente do planeta, por
        // isso o planeta não pode cortá-la (com teste de profundidade, o disco
        // tapava metade do rim).
        depthTest: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uCenter: { value: new THREE.Vector3(...center) },
          uRadius: { value: radius },
          uColor: { value: new THREE.Color(color) },
          uHotColor: { value: new THREE.Color(hotColor) },
          uIntensity: { value: intensity },
          uHalo: { value: halo },
          uRim: { value: rim },
          uRimGain: { value: rimGain },
          uFalloff: { value: falloff },
          uEdge: { value: edge },
          uEdgeGain: { value: edgeGain },
          uSunDir: { value: new THREE.Vector3(...sunDir).normalize() },
          uHot: { value: hot },
          uHotPower: { value: hotPower },
          uInvViewProj: { value: new THREE.Matrix4() },
        },
        // Quadrilátero de ECRÃ INTEIRO: o vértice só reconstrói o raio da
        // câmara até ao pixel (plano distante) — a posição de clip é a do
        // próprio NDC. Nada disto passa por matriz de modelo.
        vertexShader: /* glsl */ `
          uniform mat4 uInvViewProj;
          varying vec3 vRay;
          void main() {
            vec4 far = uInvViewProj * vec4(position.xy, 1.0, 1.0);
            vRay = far.xyz / far.w - cameraPosition;
            gl_Position = vec4(position.xy, 0.0, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uCenter;
          uniform float uRadius;
          uniform vec3 uColor;
          uniform vec3 uHotColor;
          uniform float uIntensity;
          uniform float uHalo;
          uniform float uRim;
          uniform float uRimGain;
          uniform float uFalloff;
          uniform float uEdge;
          uniform float uEdgeGain;
          uniform vec3 uSunDir;
          uniform float uHot;
          uniform float uHotPower;
          varying vec3 vRay;

          void main() {
            vec3 ro = cameraPosition;
            vec3 rd = normalize(vRay);
            vec3 oc = uCenter - ro;
            float tca = dot(oc, rd);
            vec3 closest = oc - tca * rd;
            // x = 1.0 e exatamente o limbo do planeta
            float x = length(closest) / uRadius;

            // O halo so existe FORA do disco (x > 1): dentro do disco nao ha
            // espaco a frente da Terra. Era aqui que o brilho aparecia por
            // cima do planeta (o clamp dava 1 no interior TODO).
            float halo = step(1.0, x)
              * pow(clamp((1.0 + uHalo - x) / uHalo, 0.0, 1.0), uFalloff);
            // O rim vive SO DENTRO do disco: 1 no limbo a descer a 0 a uRim de
            // profundidade. (Antes a rampa subia para FORA e valia 1 em todo o
            // ceu — era isto que espalhava o azul pelo espaco inteiro.)
            float inside = step(x, 1.0);
            float rim = inside * pow(clamp((1.0 - x) / uRim, 0.0, 1.0), 1.7);
            float edge = uEdge > 0.0
              ? pow(clamp(1.0 - abs(x - 1.0) / uEdge, 0.0, 1.0), 2.0)
              : 0.0;
            float air = halo + rim * uRimGain + edge * uEdgeGain;

            // Incendio: a normal do ponto de limbo mais proximo vs. o sol
            vec3 n = normalize(closest);
            float sun = pow(clamp(dot(n, normalize(uSunDir)), 0.0, 1.0), uHotPower) * uHot;

            vec3 col = mix(uColor, uHotColor, clamp(sun, 0.0, 1.0));
            // A aresta viva puxa para o branco: e o "corte" do limbo.
            col = mix(col, vec3(1.0), clamp(edge * 0.35, 0.0, 1.0));
            float a = air * uIntensity * (1.0 + sun * 1.8);
            if (a < 0.002) discard;
            gl_FragColor = vec4(col, a);
          }
        `,
      }),
    [
      center,
      radius,
      color,
      hotColor,
      intensity,
      halo,
      rim,
      rimGain,
      falloff,
      edge,
      edgeGain,
      sunDir,
      hot,
      hotPower,
    ],
  );

  // Matriz do raio por pixel + incêndio por frame — sem re-render de React.
  useFrame(() => {
    const cam = camera as THREE.PerspectiveCamera;
    cam.updateMatrixWorld();
    const inv = material.uniforms.uInvViewProj.value as THREE.Matrix4;
    inv.multiplyMatrices(cam.matrixWorld, cam.projectionMatrixInverse);
    if (hotSignal && !earthZoom.paused.value) {
      const uniform = material.uniforms.uHot;
      if (uniform) uniform.value = hotSignal.value;
    }
  });

  // O brilho é calculado por pixel em espaço de mundo, num quadrilátero de
  // ecrã inteiro: não tem aresta nenhuma. Um quadrilátero finito mostrava o
  // próprio recorte como limite quadrado (o parâmetro de impacto converge
  // para a distância da câmara, nunca chega a zero antes da borda).
  return (
    <mesh material={material} renderOrder={1} frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  );
}

/** Halo aditivo ATRÁS do planeta — QUEDA EXPONENCIAL CONTÍNUA até zero na
 *  borda do sprite: sem degraus, sem anéis, sem limites visíveis. */
function HaloGlow({
  position,
  radius,
  rgb,
  opacity = 0.5,
}: {
  position: [number, number, number];
  radius: number;
  rgb: [number, number, number];
  opacity?: number;
}) {
  const texture = useMemo(() => {
    const cv = document.createElement("canvas");
    cv.width = 512;
    cv.height = 512;
    const ctx = cv.getContext("2d")!;
    const g = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
    // pow(1−t, 2.4): cheio no centro → 0 suave na borda do sprite
    const stops = 16;
    for (let s = 0; s <= stops; s++) {
      const t = s / stops;
      const a = Math.pow(1 - t, 2.4);
      g.addColorStop(t, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`);
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 512);
    return new THREE.CanvasTexture(cv);
  }, [rgb]);

  return (
    <sprite position={position} scale={[radius * 3.6, radius * 3.6, 1]}>
      <spriteMaterial
        map={texture}
        transparent
        opacity={opacity}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </sprite>
  );
}

/* -------------------------------- corpos ---------------------------------- */

/** Terra realista opaca: map + roughness (mar brilha) + bump (relevo) + nuvens. */
function RealisticEarth({
  position = [0, 0, 0],
  radius = 1.5,
  atmoColor,
  atmoIntensity = 0.6,
  spin = 0.08,
  clouds = true,
  sunDir,
  nightTexture,
  nightTint = "#c6d2ea",
}: {
  position?: [number, number, number];
  radius?: number;
  atmoColor?: string;
  atmoIntensity?: number;
  spin?: number;
  clouds?: boolean;
  /** TERRA NOTURNA — mapa REAL da NASA (Black Marble, domínio público,
   *  em /textures/earth-night.jpg). A superfície já é a imagem final da
   *  noite: é desenhada SEM luz (Basic), por isso não há continentes verdes
   *  de dia a aparecer no escuro, e o sol não "acende" a noite. */
  nightTexture?: string;
  /** Tom aplicado ao mapa noturno (o Black Marble já vem azulado). */
  nightTint?: string;
  /** Direção do sol (do centro do planeta para o sol, em unidades do mundo).
   *  Com sol definido as nuvens deixam de ser brancas chapadas: apanham a luz
   *  do lado do sol (borda quente) e apagam-se no lado noturno — é o "nuvens
   *  apanhadas pela luz" do amanhecer (ref4). */
  sunDir?: [number, number, number];
}) {
  // 1.ª pintura: 384×192 com 4 oitavas (instantâneo, já realista)
  // Com mapa noturno, nada disto é preciso — poupa-se a geração toda.
  const baseMaps = useMemo(
    () => (nightTexture ? null : buildProceduralEarthMaps(384, 192, 4, 3.7)),
    [nightTexture],
  );
  // swap: 1024×512 com 5 oitavas quando pronto
  const [hiMaps, setHiMaps] = useState<EarthMaps | null>(null);
  // 768x384 (em vez de 512x256): as nuvens são o que passa mais perto da
  // câmara no fim do mergulho, e a 512 a textura desmanchava-se toda.
  const cloudTex = useMemo(() => (clouds ? buildCloudTexture(768, 384) : null), [clouds]);

  const [night, setNight] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    if (!nightTexture) return;
    let alive = true;
    // O Black Marble vem gradado a azul pela NASA (continentes com B−R de +12
    // a +21) e o tint multiplicava AINDA mais azul — a Terra ficava meia
    // azulada toda. A passagem por canvas com `saturate` dessatura o mapa
    // antes de criar a textura: continentes neutros, oceanos azul-escuros,
    // luzes de cidade intactas (estas são desenhadas pelo CityLights à parte).
    const el = new Image();
    el.onload = () => {
      if (!alive) return;
      const cv = document.createElement("canvas");
      cv.width = el.naturalWidth;
      cv.height = el.naturalHeight;
      const ctx = cv.getContext("2d")!;
      try {
        ctx.filter = "saturate(0.55)";
      } catch {
        /* filtro opcional — sem ele fica o mapa original */
      }
      ctx.drawImage(el, 0, 0);
      ctx.filter = "none";
      const tex = new THREE.CanvasTexture(cv);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = THREE.RepeatWrapping;
      tex.anisotropy = MAX_ANISO;
      setNight(tex);
    };
    el.src = nightTexture;
    return () => {
      alive = false;
    };
  }, [nightTexture]);

  // Nuvens COM sol — shader próprio: espalhamento frontal perto do sol,
  // nuvens cinza-azuladas na noite. Um material difuso standard não faria
  // isto (a luz direcional não aquece a borda das nuvens).
  const litCloudMaterial = useMemo(() => {
    if (!cloudTex || !sunDir) return null;
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uMap: { value: cloudTex },
        uSunDir: { value: new THREE.Vector3(...sunDir).normalize() },
        uWarm: { value: new THREE.Color("#ffd2a0") },
        uOpacity: { value: 0.82 },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        varying vec3 vNormalW;
        void main() {
          vUv = uv;
          vNormalW = normalize(mat3(modelMatrix) * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D uMap;
        uniform vec3 uSunDir;
        uniform vec3 uWarm;
        uniform float uOpacity;
        varying vec2 vUv;
        varying vec3 vNormalW;
        void main() {
          vec4 c = texture2D(uMap, vUv);
          if (c.a < 0.01) discard;
          float d = dot(normalize(vNormalW), normalize(uSunDir));
          float day = smoothstep(-0.30, 0.32, d);
          float rim = pow(clamp(d, 0.0, 1.0), 2.2);
          vec3 col = mix(vec3(0.26, 0.33, 0.46), vec3(1.0), day);
          col = mix(col, uWarm, rim * 0.9);
          gl_FragColor = vec4(col, c.a * uOpacity);
        }
      `,
    });
  }, [cloudTex, sunDir]);

  useEffect(() => {
    if (nightTexture) return; // a noite não precisa do mapa diurno a 1024
    let alive = true;
    const id = setTimeout(() => {
      buildRealEarthMaps(1024, 512, 5).then((hi) => {
        if (alive && hi) setHiMaps(hi);
      });
    }, 60);
    return () => {
      alive = false;
      clearTimeout(id);
    };
  }, [nightTexture]);

  const maps = hiMaps ?? baseMaps;
  const earth = useRef<THREE.Mesh>(null);
  const cloudMesh = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (earthZoom.paused.value) return;
    if (earth.current) earth.current.rotation.y += delta * spin;
    if (cloudMesh.current) cloudMesh.current.rotation.y += delta * spin * 1.45;
  });

  return (
    <group position={position}>
      <mesh ref={earth} scale={[radius, radius, radius]}>
        <sphereGeometry args={[1, 96, 96]} />
        {night ? (
          // Depois de carregar o mapa noturno, a superfície passa a ser a
          // própria imagem da noite (sem luz: o que se vê é o que a NASA viu).
          <meshBasicMaterial map={night} color={nightTint} />
        ) : maps ? (
          <meshStandardMaterial
            map={maps.map}
            roughnessMap={maps.rough}
            bumpMap={maps.bump}
            bumpScale={0.9}
            roughness={1}
            metalness={0.0}
          />
        ) : null}
      </mesh>
      {cloudTex && (
        <mesh
          ref={cloudMesh}
          scale={[radius * 1.018, radius * 1.018, radius * 1.018]}
          material={litCloudMaterial ?? undefined}
        >
          <sphereGeometry args={[1, 64, 64]} />
          {!litCloudMaterial && (
            <meshStandardMaterial
              map={cloudTex}
              transparent
              opacity={0.78}
              depthWrite={false}
              roughness={1}
            />
          )}
        </mesh>
      )}
      {atmoColor && (
        <>
          {/* rim iluminado NO limbo (front) + halo externo largo (back) */}
          <AtmosphereShell radius={radius * 1.002} color={atmoColor} intensity={atmoIntensity * 0.42} power={3.2} side="front" />
          <AtmosphereShell radius={radius * 1.1} color={atmoColor} intensity={atmoIntensity} power={2.3} side="back" />
        </>
      )}
    </group>
  );
}

/**
 * Disco macio das estrelas — gl_Point é um QUADRADO por definição; sem esta
 * textura os pontinhos aparecem com cantos ("estrelas quadradas").
 */
function starDotTexture(): THREE.CanvasTexture {
  const size = 64;
  const cv = document.createElement("canvas");
  cv.width = size;
  cv.height = size;
  const ctx = cv.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.34, "rgba(255,255,255,0.85)");
  g.addColorStop(0.7, "rgba(255,255,255,0.2)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(cv);
}

/**
 * LUA ESCURA (ref4) — a lua do amanhecer está À FRENTE do sol: o que se vê é
 * uma silhueta escura. Mas silhueta não quer dizer bola lisa — o relevo real
 * (mares, crateras) tem de espreitar, só que sem luz que o revele.
 *
 * Por isso o mapa lunar entra ESCURECIDO por multiplicação: a NASA
 * (/textures/moon-nasa.jpg, mapa equirectangular de domínio público) e, se o
 * ficheiro faltar, o mapa procedural da MoonBall. A multiplicação preserva o
 * contraste relativo (as crateras continuam a ler-se) enquanto baixa a
 * luminância; o gradiente vertical é que dá a leitura do contraluz — base
 * virada ao limbo respira, topo cai a quase-preto.
 */
function darkenLunar(source: CanvasImageSource | null, w: number, h: number): THREE.CanvasTexture {
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext("2d")!;
  // Base neutra: só se vê se não houver mapa nenhum (lua lisa, mas escura).
  ctx.fillStyle = "#5a616d";
  ctx.fillRect(0, 0, w, h);
  // Contraste em alta: no mapa da NASA os mares são só ~10% mais escuros que o
  // planalto — sem este empurrão, escurecida, a face da lua desaparecia.
  if (source) {
    try {
      ctx.filter = "contrast(1.5) saturate(1.05)";
    } catch {
      /* filtro opcional */
    }
    ctx.drawImage(source, 0, 0, w, h);
    ctx.filter = "none";
  }
  ctx.globalCompositeOperation = "multiply";
  const shade = ctx.createLinearGradient(0, h, 0, 0);
  shade.addColorStop(0, "#7b8391"); // base, virada ao limbo
  shade.addColorStop(0.45, "#434a55");
  shade.addColorStop(1, "#15181d"); // topo, contra o espaço
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = "source-over";
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = THREE.RepeatWrapping;
  t.anisotropy = MAX_ANISO;
  const any = t as unknown as { colorSpace?: unknown };
  if ("colorSpace" in any) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function DarkMoon({
  position,
  radius = 0.6,
}: {
  position: [number, number, number];
  radius?: number;
}) {
  // 1.ª pintura: mapa procedural (instantâneo, já com mares e crateras).
  const procedural = useMemo(
    () => darkenLunar(buildMoonMaps(384, 192).map.image as HTMLCanvasElement, 384, 192),
    [],
  );
  const [texture, setTexture] = useState<THREE.CanvasTexture>(procedural);

  // Troca pelo mapa REAL da NASA assim que carrega — mesma mistura, relevo
  // verdadeiro. Se a rede/ficheiro falhar, fica o procedural (nada rebenta).
  useEffect(() => {
    let alive = true;
    new THREE.TextureLoader().load("/textures/moon-nasa.jpg", (tex) => {
      if (!alive) return;
      const img = tex.image as HTMLImageElement;
      const next = darkenLunar(img, img.width, img.height);
      setTexture((prev) => {
        prev.dispose();
        return next;
      });
    });
    return () => {
      alive = false;
    };
  }, []);

  // BORDO ILUMINADO — o resto de luz na contraluz: mais forte em CIMA (é de
  // onde o sol a acende, por trás) e mais discreto nas LATERAIS; em baixo,
  // quase nada (esse lado está virado à Terra).
  const rimMaterial = useMemo(() => {
    const dir = new THREE.Vector3(...DAWN_SUN).sub(new THREE.Vector3(...DAWN_MOON)).normalize();
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uDir: { value: dir },
        uWarm: { value: new THREE.Color("#ffe9c8") },
        uCool: { value: new THREE.Color("#8fb4ee") },
      },
      vertexShader: /* glsl */ `
        varying vec3 vN;
        varying vec3 vV;
        void main() {
          vN = normalize(mat3(modelMatrix) * normal);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vV = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uDir;
        uniform vec3 uWarm;
        uniform vec3 uCool;
        varying vec3 vN;
        varying vec3 vV;
        void main() {
          // Brilho COLADO ao limbo: uma aresta VIVA (4.4) mais uma franja curta
          // (2.6), as duas com queda rapida. A coroa larga que aqui esteve (1.35)
          // espalhava luz pelo ceu em vez de contornar a lua.
          float e = 1.0 - abs(dot(normalize(vN), normalize(vV)));
          float fres = 0.22 * pow(e, 2.6) + 0.95 * pow(e, 4.4);
          float toward = clamp(dot(normalize(vN), normalize(uDir)), 0.0, 1.0);
          // 0.26 nas laterais, 1.0 no topo (o lado de onde o sol a acende)
          float gain = 0.26 + 0.74 * pow(toward, 0.5);
          vec3 col = mix(uCool, uWarm, pow(toward, 1.2));
          gl_FragColor = vec4(col, fres * gain);
        }
      `,
    });
  }, []);

  return (
    // FACE VIRADA À TERRA — o mapa da NASA está centrado em 0° de longitude, que
    // é exactamente o ponto da lua que olha para a Terra (a face dos mares).
    // Na esfera do three o centro da textura (u = 0.5) cai no +X local; girar
    // -90° em Y leva-o para +Z, a direcção da câmara — é esta a face que se vê.
    <group position={position} scale={[radius, radius, radius]} rotation={[0, -Math.PI / 2, 0]}>
      <mesh>
        <sphereGeometry args={[1, 64, 64]} />
        {/* Basic (não standard): em contraluz o que se vê é a silhueta — reagir
            às luzes da cena só a punha com o sol a bater onde não bate. */}
        <meshBasicMaterial map={texture} />
      </mesh>
      {/* Casca do bordo, um pouco maior: é ela que desenha o contorno */}
      <mesh material={rimMaterial} scale={1.014}>
        <sphereGeometry args={[1, 64, 64]} />
      </mesh>
    </group>
  );
}

/** Lua 3D: map + bump de crateras; o lado noturno fica escuro (fase real). */
function MoonBall({
  position,
  radius = 0.4,
}: {
  position: [number, number, number];
  radius?: number;
}) {
  const maps = useMemo(() => buildMoonMaps(512, 256), []);
  return (
    <mesh position={position} scale={[radius, radius, radius]}>
      <sphereGeometry args={[1, 64, 64]} />
      <meshStandardMaterial map={maps.map} bumpMap={maps.bump} bumpScale={1.4} roughness={1} metalness={0} />
    </mesh>
  );
}

/** Sol — núcleo quente + glow largo aditivo. */
function SunSprite({
  position,
  coreScale = 4.5,
  glowScale = 12,
  color = "#ff9a3d",
}: {
  position: [number, number, number];
  coreScale?: number;
  glowScale?: number;
  color?: string;
}) {
  const coreTex = useMemo(() => {
    const cv = document.createElement("canvas");
    cv.width = 256;
    cv.height = 256;
    const ctx = cv.getContext("2d")!;
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, "#fffdf4");
    g.addColorStop(0.22, "#ffe9b0");
    g.addColorStop(0.5, color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(cv);
  }, [color]);

  return (
    <group position={position}>
      <sprite scale={[glowScale, glowScale, 1]}>
        <spriteMaterial map={coreTex} transparent opacity={0.85} depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
      <sprite scale={[coreScale, coreScale, 1]}>
        <spriteMaterial map={coreTex} transparent opacity={1} depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
    </group>
  );
}

/**
 * Amostra os CLARÕES DE CIDADE a partir do MAPA NOTURNO real (Black Marble):
 * cada amostra da grelha lê a LUMINOSIDADE do mapa e só vira ponto onde há luz
 * — os pontos ficam exatamente onde estão as cidades a sério (Europa, Índia,
 * China, costa leste dos EUA…), com brilho proporcional à luz medida.
 *
 * A primeira versão inventava as luzes a partir da máscara de terra, o que
 * acendia cidades onde não há ninguém — e, por cima do mapa real, notava-se.
 * Devolve posições, fase (cintilância própria de cada luz) e brilho.
 */
function sampleCityLights(
  img: HTMLImageElement,
  opts: { radius: number; threshold: number; maxLat: number; cap: number },
): { position: Float32Array; phase: Float32Array; bright: Float32Array } {
  const { radius, threshold, maxLat, cap } = opts;
  const empty = {
    position: new Float32Array(0),
    phase: new Float32Array(0),
    bright: new Float32Array(0),
  };
  const w = img.width;
  const h = img.height;
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  if (!ctx) return empty;
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, w, h).data;
  const lum = (lat: number, lon: number) => {
    const x = Math.min(w - 1, Math.max(0, Math.round(((lon + 180) / 360) * w)));
    const y = Math.min(h - 1, Math.max(0, Math.round(((90 - lat) / 180) * h)));
    const i = (y * w + x) * 4;
    // O Black Marble é laranja/branco sobre preto: o maior canal é o que vale.
    return Math.max(data[i], data[i + 1], data[i + 2]);
  };

  const positions: number[] = [];
  const phases: number[] = [];
  const brights: number[] = [];
  const STEP = 0.9;
  for (let lat = -maxLat; lat <= maxLat; lat += STEP) {
    const lonStep = STEP / Math.max(Math.cos((lat * Math.PI) / 180), 0.15);
    for (let lon = -180; lon < 180; lon += lonStep) {
      const l = lum(lat, lon);
      if (l < threshold) continue;
      const p = latLonToVec3(lat, lon, radius);
      positions.push(p.x, p.y, p.z);
      phases.push(hash3(Math.round(lat * 4), Math.round(lon * 4), 7));
      brights.push(clamp01((l - threshold) / 130) * 0.75 + 0.25);
      if (positions.length / 3 >= cap) break;
    }
    if (positions.length / 3 >= cap) break;
  }
  return {
    position: Float32Array.from(positions),
    phase: Float32Array.from(phases),
    bright: Float32Array.from(brights),
  };
}

/**
 * LUZES DE CIDADE (ref2) — os clarões dourados do lado noturno, a sério:
 *
 *   · só acendem onde a superfície está virada para o lado contrário ao sol
 *     (o dia apaga-as — nada de pontos a brilhar sobre continentes iluminados);
 *   · cada luz cintila com a sua própria fase (nunca piscam em uníssono);
 *   · o corpo do clarão acompanha o scroll via `intensitySignal` (heroCine);
 *   · rodam com o planeta — mesma rotação do map em RealisticEarth.
 *
 * O ponto ocluso atrás do planeta é escondido pela própria Terra (o teste de
 * profundidade fica ligado, só o depósito é que não escreve).
 */
function CityLights({
  position = [0, 0, 0],
  radius,
  sunDir,
  intensitySignal,
  spin = 0,
  threshold = 44,
  maxLat = 70,
  pointSize = 0.013,
  maxPx = 6,
  texture = "/textures/earth-night.jpg",
}: {
  position?: [number, number, number];
  radius: number;
  sunDir: [number, number, number];
  intensitySignal?: { value: number };
  spin?: number;
  /** Luminosidade mínima do mapa noturno para virar clarão (0–255). */
  threshold?: number;
  maxLat?: number;
  pointSize?: number;
  maxPx?: number;
  texture?: string;
}) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const { size, camera, gl } = useThree();
  const points = useRef<THREE.Points>(null);

  useEffect(() => {
    const el = new Image();
    el.onload = () => setImg(el);
    el.src = texture;
  }, [texture]);

  const geometry = useMemo(() => {
    if (!img) return null;
    const { position: pos, phase, bright } = sampleCityLights(img, {
      radius,
      threshold,
      maxLat,
      cap: 3200,
    });
    if (!pos.length) return null;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("aPhase", new THREE.BufferAttribute(phase, 1));
    geo.setAttribute("aBright", new THREE.BufferAttribute(bright, 1));
    return geo;
  }, [img, radius, threshold, maxLat]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uIntensity: { value: intensitySignal ? intensitySignal.value : 1 },
          uColorCore: { value: new THREE.Color("#fff0cf") },
          uColorHalo: { value: new THREE.Color("#e8a33c") },
          uSize: { value: pointSize },
          uScale: { value: 400 },
          uMaxPx: { value: maxPx },
          uSunDir: { value: new THREE.Vector3(...sunDir).normalize() },
        },
        vertexShader: /* glsl */ `
          attribute float aPhase;
          attribute float aBright;
          uniform float uTime;
          uniform float uIntensity;
          uniform float uSize;
          uniform float uScale;
          uniform float uMaxPx;
          uniform vec3 uSunDir;
          varying float vAlpha;
          varying float vBright;
          void main() {
            vec3 nw = normalize(mat3(modelMatrix) * position);
            float sun = dot(nw, normalize(uSunDir));
            // lado noturno: 1 de noite, 0 de dia (banda larga = crepusculo).
            // edge0 > edge1 e comportamento INDEFINIDO em GLSL e o ANGLE/D3D
            // devolve 0 (mesma armadilha ja documentada no GlassGlobe): a
            // banda tem de ser montada ao contrario, com o 1.0 - smoothstep.
            float night = 1.0 - smoothstep(-0.5, 0.15, sun);
            // cintilancia individual: cada cidade com o seu ritmo
            float twinkle = 0.58 + 0.42 * sin(uTime * 1.6 + aPhase * 6.2831);
            vAlpha = night * twinkle * aBright * uIntensity;
            vBright = aBright;
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            // As cidades maiores (mais luz no mapa) ficam com o claras maiores.
            // (sem virgula final na chamada: o GLSL nao aceita listas com
            // virgula pendurada — era isto que derrubava o vertex shader)
            gl_PointSize = clamp(
              uSize * (uScale / -mv.z) * (0.65 + 0.7 * aBright),
              1.0,
              uMaxPx
            );
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uColorCore;
          uniform vec3 uColorHalo;
          varying float vAlpha;
          varying float vBright;
          void main() {
            vec2 d = gl_PointCoord - 0.5;
            float r = length(d) * 2.0;
            float core = smoothstep(1.0, 0.0, r);
            float a = pow(core, 2.6) * vAlpha;
            if (a < 0.004) discard;
            gl_FragColor = vec4(mix(uColorHalo, uColorCore, vBright), a);
          }
        `,
      }),
    [sunDir, pointSize, maxPx, intensitySignal],
  );

  useFrame((state, delta) => {
    if (earthZoom.paused.value) return;
    if (points.current) points.current.rotation.y += delta * spin;
    material.uniforms.uTime.value = state.clock.elapsedTime;
    if (intensitySignal) material.uniforms.uIntensity.value = intensitySignal.value;
    const fov = (camera as THREE.PerspectiveCamera).fov ?? 42;
    material.uniforms.uScale.value =
      (size.height * gl.getPixelRatio()) / (2 * Math.tan((fov * Math.PI) / 360));
  });

  if (!geometry) return null;
  return <points ref={points} geometry={geometry} material={material} position={position} />;
}

/**
 * SOL ESTRELADO (ref4) — camadas aditivas, todas procedurais:
 *
 *   bloom   queda larga — aquece o ar à volta do disco;
 *   streak  agulha anamórfica (comprida na horizontal, curta na vertical);
 *   star    8 raios curtos que rodam devagar — o cintilar do "estrelado";
 *   core    o disco do sol.
 *
 * `sunriseSignal` (0 → 1) faz o sol EMERGIR de trás do limbo e o flare abrir;
 * `driftSignal` dá o parallax lateral contra o limbo. Lido por frame.
 */
function StarSun({
  position,
  sunriseSignal,
  driftSignal,
  rest = 0.35,
  sink = 2.7,
  drift = 1.1,
  core = 1.7,
  bloom = 5.6,
  streak = [2.6, 1.6] as [number, number],
  rays = 1.35,
  color = "#ffb44e",
}: {
  position: [number, number, number];
  sunriseSignal?: { value: number };
  driftSignal?: { value: number };
  /** `sunrise` em que o sol está pousado no limbo (estado de repouso). */
  rest?: number;
  /** Quanto desce quando `sunrise` vai a 0 — atrás do limbo (nascer literal). */
  sink?: number;
  /** Deslocamento lateral máximo do parallax, em unidades do mundo. */
  drift?: number;
  core?: number;
  bloom?: number;
  streak?: [number, number];
  rays?: number;
  color?: string;
}) {
  const coreTex = useMemo(
    () =>
      radialTexture([
        [0, "#fffdf4"],
        [0.18, "#ffeec2"],
        [0.42, color],
        [0.72, "rgba(255,150,60,0.28)"],
        [1, "rgba(255,140,50,0)"],
      ]),
    [color],
  );
  const bloomTex = useMemo(
    () =>
      radialTexture(
        [
          [0, "rgba(255,222,170,0.55)"],
          [0.3, "rgba(255,186,110,0.22)"],
          [0.62, "rgba(255,160,80,0.07)"],
          [1, "rgba(255,150,60,0)"],
        ],
        512,
      ),
    [],
  );
  // Agulha anamórfica: o cruzamento comprido na horizontal é a assinatura do
  // flare da ref4 (vem da ESCALA do sprite, não do desenho da textura).
  // SEM raio vertical: com o sol atrás da lua, a metade de baixo do raio
  // vertical aparecia como um feixe a descer da lua até ao limbo da Terra.
  const streakTex = useMemo(
    () =>
      flareTexture("#ffe8c6", [
        { angle: 0, len: 0.98, width: 3.4, gain: 0.95 },
        { angle: Math.PI / 4, len: 0.3, width: 2.4, gain: 0.18 },
        { angle: -Math.PI / 4, len: 0.3, width: 2.4, gain: 0.18 },
      ]),
    [],
  );
  // 8 raios curtos e vivos — é esta camada que roda. Sem raio vertical
  // (mesma razão do streak: por baixo do sol-frente-da-lua vira feixe).
  const starTex = useMemo(
    () =>
      flareTexture("#fff3dc", [
        { angle: 0, len: 0.92, width: 4.4, gain: 0.7 },
        { angle: Math.PI / 4, len: 0.7, width: 3.2, gain: 0.42 },
        { angle: -Math.PI / 4, len: 0.7, width: 3.2, gain: 0.42 },
        { angle: Math.PI / 8, len: 0.46, width: 2.2, gain: 0.24 },
        { angle: -Math.PI / 8, len: 0.46, width: 2.2, gain: 0.24 },
        { angle: (3 * Math.PI) / 8, len: 0.46, width: 2.2, gain: 0.24 },
        { angle: (-3 * Math.PI) / 8, len: 0.46, width: 2.2, gain: 0.24 },
      ]),
    [],
  );

  const group = useRef<THREE.Group>(null);
  const coreMesh = useRef<THREE.Sprite>(null);
  const bloomMesh = useRef<THREE.Sprite>(null);
  const streakMesh = useRef<THREE.Sprite>(null);
  const starMesh = useRef<THREE.Sprite>(null);

  useFrame((state, delta) => {
    if (earthZoom.paused.value) return;
    const g = group.current;
    if (!g) return;
    const s = sunriseSignal ? clamp01(sunriseSignal.value) : 1;
    // O sol SOBE: sai de trás do limbo (a Terra esconde-o) e ganha altura.
    g.position.set(
      position[0] + (driftSignal ? driftSignal.value : 0) * drift,
      position[1] - (rest - s) * sink,
      position[2],
    );

    const open = clamp01(s / 0.85); // o flare abre com o amanhecer
    const breathe = 0.93 + 0.07 * Math.sin(state.clock.elapsedTime * 1.5);

    if (coreMesh.current) {
      const k = core * (0.72 + open * 0.5) * breathe;
      coreMesh.current.scale.set(k, k, 1);
      (coreMesh.current.material as THREE.SpriteMaterial).opacity = 0.85 + open * 0.15;
    }
    if (bloomMesh.current) {
      const k = bloom * (0.7 + open * 0.55) * breathe;
      bloomMesh.current.scale.set(k, k, 1);
    }
    if (streakMesh.current && streakMesh.current.material) {
      const [sw, sh] = streak;
      const k = 0.55 + open * 0.4;
      streakMesh.current.scale.set(sw * k, sh * k, 1);
      (streakMesh.current.material as THREE.SpriteMaterial).opacity = 0.25 + open * 0.7;
    }
    if (starMesh.current && starMesh.current.material) {
      const mat = starMesh.current.material as THREE.SpriteMaterial;
      mat.rotation += delta * 0.06; // raios a rodar devagar
      const k = rays * (0.75 + open * 0.5);
      starMesh.current.scale.set(k, k, 1);
      mat.opacity = 0.3 + open * 0.65;
    }
  });

  return (
    <group ref={group} position={position}>
      <sprite ref={bloomMesh} scale={[bloom, bloom, 1]}>
        <spriteMaterial
          map={bloomTex}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
      <sprite ref={streakMesh} scale={[streak[0], streak[1], 1]}>
        <spriteMaterial
          map={streakTex}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
      <sprite ref={starMesh} scale={[rays, rays, 1]}>
        <spriteMaterial
          map={starTex}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
      <sprite ref={coreMesh} scale={[core, core, 1]}>
        <spriteMaterial
          map={coreTex}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
    </group>
  );
}

/** Planeta em SILHUETA (ref3). */
function SilhouettePlanet({
  position,
  radius = 0.5,
  color = "#171009",
  ring = false,
}: {
  position: [number, number, number];
  radius?: number;
  color?: string;
  ring?: boolean;
}) {
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[radius, 32, 32]} />
        <meshBasicMaterial color={color} />
      </mesh>
      {ring && (
        <mesh rotation={[Math.PI / 2.4, 0.2, 0]}>
          <ringGeometry args={[radius * 1.45, radius * 1.85, 64]} />
          <meshBasicMaterial color="#c9a06a" transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

/* -------------------------------- cenas ----------------------------------- */

function GalaxyScene() {
  // ref1: Terra CENTRADA e grande, lua menor no canto superior direito
  return (
    <>
      <SpaceTint color="rgba(40,70,130,0.9)" opacity={0.16} />
      <RealisticEarth
        position={[0, 0, 0]}
        radius={1.02}
        atmoColor="#7fb6f0"
        atmoIntensity={1.0}
        spin={0.08}
      />
      {/* halo de brilho à volta do planeta (atrás — só aparece no limbo) */}
      <HaloGlow position={[0, 0, -0.4]} radius={1.02} rgb={[90, 150, 230]} opacity={0.5} />
      <MoonBall position={[0.82, 0.78, -0.55]} radius={0.24} />
      {/* sol quente vindo da direita + preenchimento azul da câmara */}
      <directionalLight position={[5, 2, 3.5]} intensity={2.6} color="#fff3dd" />
      <pointLight position={[0, 0.6, 6]} intensity={0.9} color="#8fb0dd" distance={24} />
      <ambientLight intensity={0.16} />
    </>
  );
}

/** Centro da Terra em /hero-b — o limbo sobe do fundo do ecrã (ref2). */
const ATMO_EARTH: [number, number, number] = [0, -2.85, 0];
/** O sol está ATRÁS do planeta: o lado que a câmara vê é o NOTURNO — é isso
 *  que faz as luzes de cidade brilharem e o limbo ficar azul elétrico.
 *  (Governa as luzes, o lado iluminado do map e as nuvens.) */
const ATMO_SUN_DIR: [number, number, number] = [0.25, 0.55, -0.8];

function AtmoScene() {
  // ref2: limbo azul elétrico a ocupar a base do frame + cidades acesas
  return (
    <>
      {/* Fundo quase preto: o azul do espaco tem de vir das estrelas e do
          limbo, nao de um veu por cima do ceu inteiro. */}
      <SpaceTint color="rgba(20,50,110,0.9)" opacity={0.04} />
      {/* TERRA NOTURNA (Black Marble da NASA) — sem nuvens: no escuro não
          acrescentam nada, e o que interessa são as luzes das cidades.
          O albedo diurno chegou a ser testado aqui e ficou pior: o lado que a
          câmara vê é o noturno, e o mapa real só o enchia de verde e castanho. */}
      <RealisticEarth
        position={ATMO_EARTH}
        radius={2.7}
        spin={0.05}
        clouds={false}
        nightTexture="/textures/earth-night.jpg"
        // Tint NEUTRO: o mapa (agora dessaturado) já não precisa de correção de
        // cor — um tint azulado pintava os continentes de azul.
        nightTint="#efefef"
      />
      {/* UM brilho: azul elétrico, com a aresta viva no limbo e o halo a
          desfazer-se no espaço — tudo na mesma camada, sem anéis. */}
      <AtmosphereGlow
        center={ATMO_EARTH}
        radius={2.7}
        color="#3f8fff"
        intensity={0.62}
        halo={0.13}
        rim={0.06}
        rimGain={0.32}
        falloff={3.6}
        edge={0.009}
        edgeGain={0.5}
        sunDir={ATMO_SUN_DIR}
      />
      {/* CIDADES — clarões dourados do lado noturno, a ganhar corpo no scroll */}
      <CityLights
        position={ATMO_EARTH}
        radius={2.7}
        sunDir={ATMO_SUN_DIR}
        intensitySignal={heroCine.cities}
        spin={0.05}
      />
      {/* Sol atrás do planeta: o que se vê é o lado noturno, com o limbo a arder em azul */}
      <directionalLight position={[2.5, 2.64, -8]} intensity={1.6} color="#dceaff" />
      <ambientLight intensity={0.1} />
    </>
  );
}

function EmberScene() {
  // ref3: Sol AO CENTRO + 4 planetas em silhueta
  return (
    <>
      <SpaceTint color="rgba(150,70,20,0.9)" opacity={0.12} />
      <SunSprite position={[0, 0.1, -0.5]} coreScale={4.2} glowScale={11} color="#ff8a2a" />
      <SilhouettePlanet position={[2.3, 0.5, 0.4]} radius={0.5} ring color="#1a120a" />
      <SilhouettePlanet position={[-2.5, -0.25, -0.9]} radius={0.42} color="#101a24" />
      <SilhouettePlanet position={[1.9, -0.7, -1.6]} radius={0.36} color="#1d130b" />
      <SilhouettePlanet position={[-1.8, 0.75, 1.2]} radius={0.32} color="#181322" />
      <pointLight position={[0, 0.1, -0.5]} intensity={3} color="#ffa040" distance={30} />
      <ambientLight intensity={0.08} />
    </>
  );
}

/** Centro da Terra no amanhecer (ref4). */
const DAWN_EARTH: [number, number, number] = [0, -3.4, -0.4];
/** Direção do sol vista do centro da Terra — governa o incêndio do limbo e o
 *  lado das nuvens que apanha a luz. */
const DAWN_SUN_DIR: [number, number, number] = [0.06, 0.81, -0.59];
/** O sol pousa no limbo, atrás da Terra: nasce de trás do planeta. */
const DAWN_SUN: [number, number, number] = [0.12, 0.8, -3.2];
/** Lua ESCURA entre a câmara e o sol (a ref4 tem-na à frente do disco):
 *  grande, com a base a entrar um pouco atrás do limbo da Terra — o sol
 *  espreita por cima dela. */
const DAWN_MOON: [number, number, number] = [0.1, 0.1, -2.5];
const DAWN_MOON_R = 0.6;

function DawnScene() {
  // ref4: limbo EM BAIXO, atmosfera a incendiar-se no contacto, sol estrelado
  return (
    <>
      {/* Fundo quase preto (ver nota no AtmoScene). */}
      <SpaceTint color="rgba(30,55,100,0.9)" opacity={0.04} />
      {/* TERRA NOTURNA (Black Marble) + nuvens: a superfície é a noite real e
          as nuvens continuam a apanhar a luz do nascer (ref4). */}
      <RealisticEarth
        position={DAWN_EARTH}
        radius={3.1}
        spin={0.04}
        sunDir={DAWN_SUN_DIR}
        nightTexture="/textures/earth-night.jpg"
        nightTint="#ddd6c8"
      />
      {/* UM brilho: azul frio em todo o arco, a INCENDIAR-SE no ponto de
          contacto à medida que o sol nasce (azul a fundir com dourado). */}
      <AtmosphereGlow
        center={DAWN_EARTH}
        radius={3.1}
        color="#7fb0e8"
        hotColor="#ffc477"
        intensity={0.58}
        halo={0.14}
        rim={0.06}
        rimGain={0.34}
        falloff={3.6}
        edge={0.009}
        edgeGain={0.48}
        sunDir={DAWN_SUN_DIR}
        hot={0.35}
        hotSignal={heroCine.sunrise}
        hotPower={2.2}
      />
      {/* Sem halo quente próprio: o calor do amanhecer já vem do incêndio do
          brilho (hotSignal) + do bloom do próprio sol — mais uma camada larga
          aqui era só mais um anel concorrente e engolia o sol. */}
      {/* LUA ESCURA — silhueta com a base no limbo e À FRENTE do sol: é ela que
          dá a escala e o drama do nascer (o disco do sol espreita por cima e
          as agulhas do flare espalham-se à volta do escuro). Ref4. */}
      <DarkMoon position={DAWN_MOON} radius={DAWN_MOON_R} />
      {/* SOL ESTRELADO — nasce com o scroll, o flare abre, os raios rodam. */}
      <StarSun
        position={DAWN_SUN}
        sunriseSignal={heroCine.sunrise}
        driftSignal={heroCine.drift}
        sink={1.5}
        drift={0.45}
        core={1.2}
        bloom={3.4}
        streak={[2.6, 1.6]}
        rays={1.25}
      />
      <pointLight position={[0.12, 0.6, -3]} intensity={2.4} color="#ffcf90" distance={26} />
      <directionalLight position={[0.6, 4.7, -6.3]} intensity={1.8} color="#ffe2b0" />
      <ambientLight intensity={0.1} />
    </>
  );
}

/* ---------------------------- componente raiz ----------------------------- */

export default function EarthScene({ variant }: { variant: GlobeVariant }) {
  const [webgl, setWebgl] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      const c = document.createElement("canvas");
      setWebgl(!!(c.getContext("webgl2") || c.getContext("webgl")));
    } catch {
      setWebgl(false);
    }
  }, []);

  // Homepage original intacta: "silver" é exatamente o globo de vidro de sempre
  if (variant === "silver") {
    return <GlassGlobe variant="silver" />;
  }

  if (webgl === false) {
    const bgColor =
      variant === "galaxy"
        ? "#0c1424"
        : variant === "atmo"
          ? "#04101f"
          : variant === "ember"
            ? "#170d06"
            : "#0a0f18";
    return (
      <div className="absolute inset-0 z-0 flex items-center justify-center">
        <div
          className="h-[70vmin] w-[70vmin] rounded-full"
          style={{ background: `radial-gradient(circle, ${bgColor} 0%, #030509 100%)` }}
        />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-0">
      <Suspense fallback={null}>
        <Canvas
          camera={{ position: [0, 0.25, 3.7], fov: FOV, near: 0.05, far: 500 }}
          dpr={[1, 2]}
          gl={{ alpha: true, antialias: true }}
        >
          <CameraRig variant={variant} />
          <StarFieldBackground variant={variant} />

          {variant === "galaxy" && <GalaxyScene />}
          {variant === "atmo" && <AtmoScene />}
          {variant === "ember" && <EmberScene />}
          {variant === "dawn" && <DawnScene />}
        </Canvas>
      </Suspense>
    </div>
  );
}

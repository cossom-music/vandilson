/**
 * Progresso partilhado do zoom (dolly da câmara) entre o GSAP (HomeIntro)
 * e a cena Three.js (GlassGlobe).
 *
 * O timeline GSAP com scrub anima `earthZoom.progress.value` de 0 → 1
 * no primeiro ato; o CameraRig dentro do Canvas lê este valor a cada frame
 * e interpola a posição da câmara. É isto que torna o zoom nítido a
 * qualquer nível: é geometria, não escala de raster.
 */
export const earthZoom = {
  /** 0 = câmara afastada (globo inteiro) · 1 = câmara dentro do globo */
  progress: { value: 0 },
};

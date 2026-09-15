/**
 * Sinais cinematográficos do herói — o mesmo padrão de `earthZoom`: o GSAP
 * (HomeIntro) escreve estes números com o scrub do scroll e a cena Three.js
 * (EarthScene) lê-os a cada frame. Sem re-render de React no caminho.
 *
 *   cities  (/hero-b, ref2)  0 → 1   corpo das luzes de cidade no lado noturno
 *   sunrise (/hero-d, ref4)  0 → 1   o sol sobe no limbo: sai de trás da Terra,
 *                                    o flare abre e o ponto de contacto incendeia
 *   drift   (/hero-d, ref4) -1 → 1   parallax lateral do sol/flare contra o limbo
 *
 * Os valores por omissão são o estado EM REPOUSO — o que se vê no topo da
 * página (e também, sem GSAP a correr, com prefers-reduced-motion).
 */
export const heroCine = {
  cities: { value: 0.9 },
  sunrise: { value: 0.35 },
  drift: { value: 0 },
};

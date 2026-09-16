import HomeIntro from "@/components/home/HomeIntro";
import HomeOutro from "@/components/home/HomeOutro";
import StarField from "@/components/home/StarField";

/**
 * Homepage — variante dawn (sol estrelado com flare sobre o limbo,
 * termina no Hub de Escolha).
 */
export default function HomePage() {
  return (
    <>
      {/* Campo estelar global — um canvas fixo atrás de todo o conteúdo,
          subtil em toda a página; os reforços locais vivem nas secções. */}
      <StarField />

      {/* Ato 1–2 — globo (mergulho → fade out) e Hub de Escolha, num viewport fixo */}
      <HomeIntro variant="dawn" />

      {/* Ato 3–4 — Sintonia pinada + Sobre/Agenda a subir por cima (GSAP pin) */}
      <HomeOutro />
    </>
  );
}

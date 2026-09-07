import HomeIntro from "@/components/home/HomeIntro";
import HomeOutro from "@/components/home/HomeOutro";
import StarField from "@/components/home/StarField";

export default function HomePage() {
  return (
    <>
      {/* Campo estelar global — um canvas fixo atrás de todo o conteúdo,
          subtil em toda a página; os reforços locais vivem nas secções. */}
      <StarField />

      {/* Ato 1–2 — globo (mergulho → fade out) e Discografia (fade in), num viewport fixo */}
      <HomeIntro />

      {/* Ato 3–4 — Sintonia pinada + Sobre/Agenda a subir por cima (GSAP pin) */}
      <HomeOutro />
    </>
  );
}

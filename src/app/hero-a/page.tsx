import type { Metadata } from "next";
import HomeIntro from "@/components/home/HomeIntro";
import HomeOutro from "@/components/home/HomeOutro";
import StarField from "@/components/home/StarField";

export const metadata: Metadata = {
  title: "TESTE · Hero A — Via Láctea",
  robots: { index: false, follow: false },
};

/**
 * PÁGINA DE TESTE (não indexável) — a homepage completa com o herói na
 * variante A (nebulosa + sol quente + lua). Comparar com /, /hero-b/c/d.
 * TODAS as secções são as reais — só a cor do herói muda.
 */
export default function Page() {
  return (
    <>
      <StarField />
      <HomeIntro variant="galaxy" />
      <HomeOutro />
    </>
  );
}

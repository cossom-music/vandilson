import type { Metadata } from "next";
import HomeIntro from "@/components/home/HomeIntro";
import HomeOutro from "@/components/home/HomeOutro";
import StarField from "@/components/home/StarField";

export const metadata: Metadata = {
  title: "TESTE · Hero B — Limbo Vivo",
  robots: { index: false, follow: false },
};

/** PÁGINA DE TESTE — variante B: atmosfera azul elétrica + luzes de cidade. */
export default function Page() {
  return (
    <>
      <StarField />
      <HomeIntro variant="atmo" />
      <HomeOutro />
    </>
  );
}

import type { Metadata } from "next";
import HomeIntro from "@/components/home/HomeIntro";
import HomeOutro from "@/components/home/HomeOutro";
import StarField from "@/components/home/StarField";

export const metadata: Metadata = {
  title: "TESTE · Hero D — Amanhecer Orbital",
  robots: { index: false, follow: false },
};

/** PÁGINA DE TESTE — variante D: sol estrelado com flare sobre o limbo. */
export default function Page() {
  return (
    <>
      <StarField />
      <HomeIntro variant="dawn" />
      <HomeOutro />
    </>
  );
}

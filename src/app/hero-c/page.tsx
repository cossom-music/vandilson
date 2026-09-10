import type { Metadata } from "next";
import HomeIntro from "@/components/home/HomeIntro";
import HomeOutro from "@/components/home/HomeOutro";
import StarField from "@/components/home/StarField";

export const metadata: Metadata = {
  title: "TESTE · Hero C — Sistema em Chama",
  robots: { index: false, follow: false },
};

/** PÁGINA DE TESTE — variante C: sol de fogo + anéis de órbita (eco Sintonia). */
export default function Page() {
  return (
    <>
      <StarField />
      <HomeIntro variant="ember" />
      <HomeOutro />
    </>
  );
}

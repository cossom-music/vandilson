import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSiteContent } from "@/lib/content-server";
import Trajetoria from "@/components/universo/Trajetoria";
import Constelacao from "@/components/universo/Constelacao";

export const metadata: Metadata = {
  title: "Universo — Vandilson Neto",
  robots: { index: false, follow: false }, // nunca em motores de busca
};

/**
 * /universo — VISIBILIDADE controlada pelo admin (secção siteVisibility,
 * interruptor no painel /admin/universo):
 *  · universoVisible=false (default) → redirect imediato para /;
 *  · universoVisible=true → página acessível por URL (continua fora de
 *    motores de busca — o menu/CTA públicos também só aparecem quando
 *    o interruptor está ligado; ver Header.tsx e SobrePanels.tsx).
 *
 * Estrutura (quando visível):
 *   1. TRAJETÓRIA (modelo 2) — as eras do diário em colunas;
 *   2. CONSTELAÇÃO (modelo 1) — colaboradores ligados ao centro, painel
 *      de detalhes ao clicar numa estrela;
 *   3. PLAYER EM ÓRBITA — pílula fixa no fundo, GLOBAL no layout raiz
 *      (o áudio continua ao navegar entre páginas).
 */
export default async function UniversoPage() {
  const content = await getSiteContent();
  if (!content.siteVisibility.universoVisible) {
    redirect("/"); // oculta — quem adivinhar o URL cai na homepage
  }

  return (
    <>
      {/* Header e Footer são globais (layout.tsx) — aqui vive só o conteúdo */}
      <main className="relative bg-night-950 pt-16 md:pt-20">
        <Trajetoria milestones={content.milestones} eras={content.eras} />
        <Constelacao collaborators={content.collaborators} />

        {/* Respiro final para o player não tapar o fim da página */}
        <div aria-hidden="true" className="h-28" />
      </main>
    </>
  );
}

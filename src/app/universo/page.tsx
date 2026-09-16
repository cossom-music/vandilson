import type { Metadata } from "next";
import { getSiteContent } from "@/lib/content-server";
import Trajetoria from "@/components/universo/Trajetoria";
import Constelacao from "@/components/universo/Constelacao";

export const metadata: Metadata = {
  title: "Universo — Vandilson Neto",
  description:
    "A trajetória, a constelação de colaborações e a música em órbita contínua.",
};

/**
 * /universo — o diário de bordo do artista:
 *   1. TRAJETÓRIA (modelo 2) — as eras do diário em colunas;
 *   2. CONSTELAÇÃO (modelo 1) — colaboradores ligados ao centro, painel de
 *      detalhes ao clicar numa estrela;
 *   3. PLAYER EM ÓRBITA — pílula fixa no fundo, GLOBAL no layout raiz
 *      (o áudio continua ao navegar entre páginas).
 */
export default async function UniversoPage() {
  const content = await getSiteContent();

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

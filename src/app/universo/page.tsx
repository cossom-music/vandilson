import type { Metadata } from "next";
import { getSiteContent } from "@/lib/content-server";
import Trajetoria from "@/components/universo/Trajetoria";
import Constelacao from "@/components/universo/Constelacao";

export const metadata: Metadata = {
  title: "Universo — Vandilson Neto",
  robots: { index: false, follow: false }, // oculta de motores de busca
};

/**
 * /universo — OCULTA do público (pedido): não está em menus, não tem
 * CTAs a apontar para ela e os motores de busca são instruídos a não a
 * indexar nem seguir links dela. Continua acessível por URL direto —
 * útil para o artista a partilhar seletivamente; o admin de gestão
 * (/admin/universo) e o player Em Órbita (global) não são afetados.
 *
 * Estrutura (se voltar a ser publicada, basta restaurar o menu/CTA):
 *   1. TRAJETÓRIA (modelo 2) — as eras do diário em colunas;
 *   2. CONSTELAÇÃO (modelo 1) — colaboradores ligados ao centro, painel
 *      de detalhes ao clicar numa estrela;
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

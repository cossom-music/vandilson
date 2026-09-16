"use client";

import OrbitPlayer from "@/components/universo/OrbitPlayer";
import type { PlayerTrack } from "@/content";

export type AudioTrack = PlayerTrack & { coverUrl: string | null; src: string };

/**
 * ÁUDIO CONTÍNUO ENTRE PÁGINAS
 *
 * Monta o OrbitPlayer no LAYOUT raiz (src/app/layout.tsx), fora do troco de
 * páginas. O Next preserva a árvore do layout entre navegações — o componente
 * (e o seu <audio> + estado interno) nunca desmonta, por isso a música
 * continua ao mudar de página. A página /universo deixa de montar o próprio
 * player: este global basta.
 *
 * Sem playlist curada não monta nada — zero custo nas páginas.
 */
export default function AudioProvider({
  playlist,
}: {
  playlist: AudioTrack[];
}) {
  if (playlist.length === 0) return null;
  return <OrbitPlayer playlist={playlist} />;
}

import type { PlayerTrack, Release } from "@/content";

const STORAGE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

/**
 * URL público de um MP3 do bucket "audio" (igual ao publicCoverUrl das capas).
 * Sem Supabase configurado → null (o player mostra "áudio indisponível").
 */
export function publicAudioUrl(path: string | null | undefined): string | null {
  if (!path || !STORAGE_URL) return null;
  return `${STORAGE_URL}/storage/v1/object/public/audio/${path}`;
}

/**
 * As faixas DISPONÍVEIS para curadoria no admin: cada faixa de cada
 * lançamento que tenha audioPath, com capa do lançamento para o player.
 * É desta lista que o admin escolhe a playlist (e a ordem).
 */
export type PlayableTrack = PlayerTrack & {
  /** Capa do lançamento (para o disco do player) — pode ser null (planeta procedural). */
  coverUrl: string | null;
  /** Duração na tracklist, se definida. */
  duration?: string;
};

export function playableTracks(releases: Release[]): PlayableTrack[] {
  const out: PlayableTrack[] = [];
  for (const r of releases) {
    if (!r.tracklist) continue;
    for (const t of r.tracklist) {
      if (!t.audioPath) continue;
      out.push({
        title: t.title,
        releaseTitle: r.title,
        audioPath: t.audioPath,
        coverUrl: r.image ?? null,
        duration: t.duration,
      });
    }
  }
  return out;
}

/**
 * A playlist efetiva do site: as faixas curadas que AINDA têm MP3 no
 * storage disponível. Se uma faixa curada deixar de existir na tracklist
 * (título mudou, faixa apagada), cai fora automaticamente — sem erros.
 */
export function resolvePlaylist(
  curated: PlayerTrack[],
  releases: Release[],
): (PlayerTrack & { coverUrl: string | null; src: string })[] {
  const available = new Map<string, PlayableTrack>();
  for (const t of playableTracks(releases)) {
    available.set(`${t.releaseTitle}::${t.title}`, t);
  }
  const out: (PlayerTrack & { coverUrl: string | null; src: string })[] = [];
  for (const c of curated) {
    const fallback: PlayableTrack = { ...c, coverUrl: null };
    const match = available.get(`${c.releaseTitle}::${c.title}`) ?? fallback;
    const src = publicAudioUrl(c.audioPath ?? match.audioPath);
    if (!src) continue;
    out.push({
      title: c.title,
      releaseTitle: c.releaseTitle,
      audioPath: c.audioPath,
      coverUrl: match.coverUrl,
      src,
    });
  }
  return out;
}

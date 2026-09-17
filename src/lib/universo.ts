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
export type PlayableTrack = Omit<PlayerTrack, "coverUrl"> & {
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
 * ID de Spotify a partir de um link/URI colado no admin — aceita track,
 * album, playlist, episode e show (com ou sem prefixo intl-xx/ na URL).
 * Null se não for um link/URI válido.
 */
export function spotifyIdFromLink(
  link: string,
): { id: string; kind: "track" | "album" | "playlist" | "episode" | "show" } | null {
  const m = link.match(
    /(?:open\.spotify\.com\/(?:intl-[a-z]{2}\/)?|spotify:)(track|album|playlist|episode|show)[:/]([A-Za-z0-9]{22})/,
  );
  if (!m) return null;
  return {
    kind: m[1] as "track" | "album" | "playlist" | "episode" | "show",
    id: m[2],
  };
}

/** URL do embed oficial do Spotify para um ID de faixa (tema escuro). */
export function spotifyEmbedUrl(spotifyId: string): string {
  return `https://open.spotify.com/embed/track/${spotifyId}?utm_source=vandilson-neto&theme=0`;
}

/**
 * A playlist efetiva do site — aceita DOIS tipos de faixa curada:
 *  · MP3: audioPath no bucket "audio" (toca no <audio> nativo — faixa
 *    completa para todos os visitantes);
 *  · SPOTIFY: spotifyId (toca no embed oficial via IFrame API — prévia de
 *    30s para visitantes sem Spotify logado, faixa completa com sessão).
 * MP3 cujo áudio deixou de existir caem fora automaticamente — sem erros.
 */
export function resolvePlaylist(
  curated: PlayerTrack[],
  releases: Release[],
): (Omit<PlayerTrack, "coverUrl"> & { coverUrl: string | null; src: string })[] {
  const available = new Map<string, PlayableTrack>();
  for (const t of playableTracks(releases)) {
    available.set(`${t.releaseTitle}::${t.title}`, t);
  }
  const out: (Omit<PlayerTrack, "coverUrl"> & { coverUrl: string | null; src: string })[] = [];
  for (const c of curated) {
    // Faixa SPOTIFY: o src é o URL do embed oficial
    if (c.spotifyId) {
      out.push({
        title: c.title,
        releaseTitle: c.releaseTitle,
        spotifyId: c.spotifyId,
        coverUrl: c.coverUrl ?? null,
        src: spotifyEmbedUrl(c.spotifyId),
      });
      continue;
    }
    // Faixa MP3: precisa de audioPath e de storage configurado
    const fallback: PlayableTrack = { ...c, coverUrl: null };
    const match = available.get(`${c.releaseTitle}::${c.title}`) ?? fallback;
    const src = publicAudioUrl(c.audioPath ?? match.audioPath);
    if (!src) continue;
    out.push({
      title: c.title,
      releaseTitle: c.releaseTitle,
      audioPath: c.audioPath,
      coverUrl: c.coverUrl ?? match.coverUrl,
      src,
    });
  }
  return out;
}

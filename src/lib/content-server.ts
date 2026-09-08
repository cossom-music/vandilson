import "server-only";
import { unstable_cache } from "next/cache";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import { seedContent, type SiteContent, type Release } from "@/content";

const STORAGE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

/** Chaves de `site_content` cujo valor substitui a seed por completo. */
const SECTION_KEYS = [
  "artist",
  "socials",
  "contact",
  "homeSections",
  "homeHighlights",
  "shows",
] as const;

type SectionKey = (typeof SECTION_KEYS)[number];

function publicCoverUrl(path: string | null): string | null {
  if (!path || !STORAGE_URL) return null;
  return `${STORAGE_URL}/storage/v1/object/public/covers/${path}`;
}

function rowToRelease(row: {
  id: string;
  title: string;
  year: string;
  type: string;
  description: string | null;
  cover_path: string | null;
  tracklist: unknown;
  curiosities: unknown;
  facts: unknown;
}): Release {
  return {
    id: row.id,
    title: row.title,
    year: row.year,
    type: (["Single", "EP", "Álbum"] as const).includes(row.type as Release["type"])
      ? (row.type as Release["type"])
      : "Single",
    description: row.description ?? undefined,
    image: publicCoverUrl(row.cover_path),
    tracklist: Array.isArray(row.tracklist) ? (row.tracklist as Release["tracklist"]) : undefined,
    curiosities: Array.isArray(row.curiosities)
      ? row.curiosities.map((c) => String(c))
      : undefined,
    facts: Array.isArray(row.facts)
      ? (row.facts as NonNullable<Release["facts"]>)
      : undefined,
  };
}

async function fetchSiteContent(): Promise<SiteContent> {
  // Sem Supabase configurado → seed (o site funciona sempre)
  if (!supabaseConfigured || !supabase) return seedContent;

  try {
    // Secções pequenas (artist, socials, …) — mergem sobre a seed
    const merged: SiteContent = structuredClone(seedContent);

    const { data: sections } = await supabase
      .from("site_content")
      .select("key, value")
      .in("key", SECTION_KEYS as unknown as string[]);

    if (sections) {
      for (const row of sections) {
        const key = row.key as SectionKey;
        if (!row.value || typeof row.value !== "object") continue;
        if (key === "artist") {
          merged.artist = { ...merged.artist, ...(row.value as object) } as SiteContent["artist"];
        } else if (Array.isArray(row.value)) {
          // socials / shows — substituem por completo
          if (key === "socials") merged.socials = row.value as SiteContent["socials"];
          if (key === "shows") merged.shows = row.value as SiteContent["shows"];
        } else {
          (merged as unknown as Record<string, unknown>)[key] = row.value;
        }
      }
    }

    // Lançamentos — se a tabela tiver linhas, são a fonte de verdade;
    // vazia (schema ainda não corrido) → seed.
    const { data: releaseRows, error: releasesError } = await supabase
      .from("releases")
      .select("id, title, year, type, description, cover_path, tracklist, curiosities, facts")
      .order("position", { ascending: true });

    if (releasesError) {
      console.warn("[content-server] releases indisponíveis — a usar seed.", releasesError.message);
    } else if (releaseRows && releaseRows.length > 0) {
      merged.releases = releaseRows.map(rowToRelease);
    }

    return merged;
  } catch (err) {
    // Tabelas ainda não criadas, rede, etc. → o site continua a funcionar com a seed.
    console.warn("[content-server] a usar conteúdo seed (fallback).", err);
    return seedContent;
  }
}

/**
 * Conteúdo do site para renderização — cacheado com a tag `site-content`.
 * Depois de guardar no admin, chamar revalidateTag("site-content") (+
 * revalidatePath) para o site público apanhar as mudanças.
 */
export const getSiteContent = unstable_cache(fetchSiteContent, ["site-content-v1"], {
  revalidate: 60,
  tags: ["site-content"],
});

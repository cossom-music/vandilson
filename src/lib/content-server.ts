import "server-only";
import { unstable_cache } from "next/cache";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import { seedContent, type SiteContent, type Release } from "@/content";
import snapshot from "@/generated/content-snapshot.json";

const STORAGE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

/** Chaves de `site_content` cujo valor substitui a seed por completo. */
const SECTION_KEYS = [
  "artist",
  "socials",
  "contact",
  "homeSections",
  "homeHighlights",
  "shows",
  "milestones",
  "eras",
  "collaborators",
  "playerPlaylist",
  "siteVisibility",
] as const;

type SectionKey = (typeof SECTION_KEYS)[number];

type SectionRow = { key: string; value: unknown };

type ReleaseRow = {
  id: string;
  title: string;
  year: string;
  type: string;
  description: string | null;
  cover_path: string | null;
  featured: boolean | null;
  hidden: boolean | null;
  home_position: number | null;
  tracklist: unknown;
  curiosities: unknown;
  facts: unknown;
};

/**
 * Último conteúdo real conhecido, gerado a partir do Supabase por
 * `scripts/snapshot-content.mjs` (prebuild em CI) e versionado no repo.
 * É o que o site mostra quando a base de dados está offline — nunca a seed
 * de placeholder, para o site continuar a parecer o original.
 */
const snapshotData = snapshot as unknown as {
  generatedAt?: string | null;
  /** Conteúdo completo já montado (recuperado de um cache de produção). */
  content?: Partial<SiteContent>;
  /** Formato bruto: linhas de `site_content` + `releases` (script de CI). */
  sections?: SectionRow[];
  releases?: ReleaseRow[];
};

/** Objetos (artist, siteVisibility…) fazem merge campo a campo; arrays
 *  substituem por completo. Assim o snapshot não perde campos novos da seed. */
function mergeSnapshot(base: SiteContent, snapshotContent: Partial<SiteContent>): SiteContent {
  const merged: SiteContent = structuredClone(base);
  const target = merged as unknown as Record<string, unknown>;
  for (const [key, value] of Object.entries(snapshotContent)) {
    if (value === undefined || value === null) continue;
    const current = target[key];
    if (Array.isArray(value)) {
      target[key] = value;
    } else if (
      typeof value === "object" &&
      current &&
      typeof current === "object" &&
      !Array.isArray(current)
    ) {
      target[key] = { ...(current as object), ...(value as object) };
    } else {
      target[key] = value;
    }
  }
  return merged;
}

function publicCoverUrl(path: string | null): string | null {
  if (!path || !STORAGE_URL) return null;
  return `${STORAGE_URL}/storage/v1/object/public/covers/${path}`;
}

function rowToRelease(row: ReleaseRow): Release {
  return {
    id: row.id,
    title: row.title,
    year: row.year,
    type: (["Single", "EP", "Álbum"] as const).includes(row.type as Release["type"])
      ? (row.type as Release["type"])
      : "Single",
    description: row.description ?? undefined,
    image: publicCoverUrl(row.cover_path),
    featured: row.featured ?? false,
    hidden: row.hidden ?? false,
    homeOrder: row.home_position ?? undefined,
    tracklist: Array.isArray(row.tracklist) ? (row.tracklist as Release["tracklist"]) : undefined,
    curiosities: Array.isArray(row.curiosities)
      ? row.curiosities.map((c) => String(c))
      : undefined,
    facts: Array.isArray(row.facts)
      ? (row.facts as NonNullable<Release["facts"]>)
      : undefined,
  };
}

/** Aplica as secções JSONB sobre uma base — só chaves com valor válido. */
function applySections(target: SiteContent, rows: SectionRow[]) {
  for (const row of rows) {
    const key = row.key as SectionKey;
    const value = row.value;
    if (!value || typeof value !== "object") continue;

    if (key === "artist") {
      target.artist = { ...target.artist, ...(value as object) } as SiteContent["artist"];
    } else if (Array.isArray(value)) {
      // socials / shows / milestones / eras / collaborators /
      // playerPlaylist — arrays substituem por completo
      if (key === "socials") target.socials = value as SiteContent["socials"];
      if (key === "shows") target.shows = value as SiteContent["shows"];
      if (key === "milestones") target.milestones = value as SiteContent["milestones"];
      if (key === "eras") target.eras = value as SiteContent["eras"];
      if (key === "collaborators") target.collaborators = value as SiteContent["collaborators"];
      if (key === "playerPlaylist") target.playerPlaylist = value as SiteContent["playerPlaylist"];
      // siteVisibility é objeto (não array) — tratado no ramo else abaixo
    } else {
      (target as unknown as Record<string, unknown>)[key] = value;
    }
  }
}

/** Base = seed + snapshot real (lançamentos vazios no snapshot → seed). */
function buildContent(base: SiteContent, rows: SectionRow[], releaseRows: ReleaseRow[]): SiteContent {
  const merged: SiteContent = structuredClone(base);
  applySections(merged, rows);
  if (releaseRows.length > 0) merged.releases = releaseRows.map(rowToRelease);
  return merged;
}

/** Snapshot já montado sobre a seed — calculado uma vez por processo. */
let snapshotBase: SiteContent | null = null;
/** Último fetch completo com sucesso (BD online) — melhor fallback do processo. */
let lastGoodContent: SiteContent | null = null;

function fallbackContent(): SiteContent {
  if (lastGoodContent) return lastGoodContent;
  if (!snapshotBase) {
    snapshotBase = snapshotData.content
      ? mergeSnapshot(seedContent, snapshotData.content)
      : buildContent(seedContent, snapshotData.sections ?? [], snapshotData.releases ?? []);
  }
  return snapshotBase;
}

async function fetchSiteContent(): Promise<SiteContent> {
  // Sem Supabase configurado → melhor conteúdo local disponível
  // (snapshot real, ou seed se o snapshot ainda estiver vazio).
  if (!supabaseConfigured || !supabase) return fallbackContent();

  const [sectionsResult, releasesResult] = await Promise.all([
    supabase
      .from("site_content")
      .select("key, value")
      .in("key", SECTION_KEYS as unknown as string[]),
    // Lançamentos — se a tabela tiver linhas, são a fonte de verdade;
    // vazia (schema ainda não corrido) → mantém a base.
    // Ordenação: position global (usa em /discografia); a ordem da
    // secção Ouvir (homeOrder) é resolvida no cliente a partir de
    // home_position — ver DiscografiaContent.
    supabase
      .from("releases")
      .select(
        "id, title, year, type, description, cover_path, featured, hidden, home_position, tracklist, curiosities, facts",
      )
      .order("position", { ascending: true }),
  ]);

  if (sectionsResult.error) {
    console.warn("[content-server] site_content indisponível.", sectionsResult.error.message);
  }
  if (releasesResult.error) {
    console.warn("[content-server] releases indisponível.", releasesResult.error.message);
  }

  // Leitura parcial não é conteúdo "bom": falhar aqui faz o `getSiteContent`
  // devolver o último conteúdo completo (snapshot / fetch anterior) — e,
  // como os erros não são cacheados, a BD volta a ser tentada na próxima.
  if (sectionsResult.error || releasesResult.error) {
    throw new Error("Conteúdo indisponível no Supabase.");
  }

  const content = buildContent(
    fallbackContent(),
    sectionsResult.data ?? [],
    releasesResult.data ?? [],
  );
  lastGoodContent = content;
  return content;
}

/**
 * Data Cache do conteúdo (tag `site-content`).
 *
 * TTL longo (conteúdo muda raramente) — cada leitura à BD custa egress; a
 * frescura é garantida por `updateTag("site-content")` nas server actions do
 * admin, não pelo relógio. As páginas continuam a ser revalidadas por
 * `revalidatePath` no mesmo sítio.
 */
const cachedFetchSiteContent = unstable_cache(fetchSiteContent, ["site-content-v2"], {
  revalidate: 86_400,
  tags: ["site-content"],
});

/**
 * Conteúdo do site para renderização. BD offline (restringida, rede, schema
 * em falta) → último conteúdo real conhecido, nunca a seed de placeholder.
 */
export async function getSiteContent(): Promise<SiteContent> {
  try {
    return await cachedFetchSiteContent();
  } catch (err) {
    console.warn(
      "[content-server] BD indisponível — a servir o último conteúdo bom (snapshot).",
      err,
    );
    return fallbackContent();
  }
}

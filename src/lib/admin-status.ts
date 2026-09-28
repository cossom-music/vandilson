import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase-server";

/**
 * ESTADO POR SECÇÃO — alimenta os badges do rail do admin (modelo B:
 * «editado» acende a âmbar, secções nunca tocadas ficam «seed»).
 *
 * Fontes:
 *  · site_content.updated_at — secções JSONB (perfil, textos, socials…);
 *  · releases.updated_at — tabela com updated_at próprio.
 *
 * IMPORTANTE (serialização): o resultado atravessa a fronteira
 * servidor→cliente (props do AdminShell). Por isso:
 *  · NADA de Map/Date — devolve um objeto plano com ISO strings;
 *  · NADA de imports de "server-only" no TIPO exportado — o tipo fica
 *    aqui definido e o AdminShell importa só o tipo.
 */

export type SectionStatusDTO = {
  /** Contagem curta para o badge (ex.: "3 lançamentos"). Vazio = sem contagem. */
  meta: string;
  /** Última edição em ISO 8601, ou null se nunca editada. */
  updatedAtIso: string | null;
};

/** Chaves de site_content que cada secção do admin consulta. */
const SECTION_SOURCES: Record<string, string[]> = {
  "/admin/perfil": ["artist", "socials", "contact"],
  "/admin/textos": ["homeSections", "homeHighlights"],
  "/admin/universo": ["milestones", "eras", "collaborators", "playerPlaylist"],
};

const EMPTY: Record<string, SectionStatusDTO> = Object.fromEntries(
  [
    "/admin",
    "/admin/perfil",
    "/admin/textos",
    "/admin/lancamentos",
    "/admin/agenda",
    "/admin/universo",
    "/admin/seguranca",
  ].map((k) => [k, { meta: "", updatedAtIso: null }]),
);

export async function getSectionStatuses(): Promise<Record<string, SectionStatusDTO>> {
  const out: Record<string, SectionStatusDTO> = { ...EMPTY };
  const supabase = await createSupabaseServerClient();

  // Sem Supabase → estado neutro (o admin mostra aviso nas páginas; o
  // rail continua a funcionar com contagens de seed quando existirem).
  if (!supabase) return out;

  try {
    // 1 · updated_at das secções JSONB
    const { data: contentRows } = await supabase
      .from("site_content")
      .select("key, updated_at");

    const latestByKey = new Map<string, Date>();
    for (const row of contentRows ?? []) {
      const d = row.updated_at ? new Date(row.updated_at) : null;
      if (d && !Number.isNaN(d.getTime())) {
        const prev = latestByKey.get(row.key);
        if (!prev || d > prev) latestByKey.set(row.key, d);
      }
    }

    // 2 · contagens/updated_at de lançamentos (tabela própria)
    const { data: releaseRows } = await supabase
      .from("releases")
      .select("id, hidden, updated_at");
    const releases = releaseRows ?? [];
    const visibleReleases = releases.filter((r) => !r.hidden);
    const latestReleaseEdit = releases.reduce<Date | null>((acc, r) => {
      const d = r.updated_at ? new Date(r.updated_at) : null;
      return d && (!acc || d > acc) ? d : acc;
    }, null);

    // 3 · shows (vivem em site_content como array — contagem via length)
    const showsRaw = (
      await supabase
        .from("site_content")
        .select("key, value, updated_at")
        .eq("key", "shows")
        .maybeSingle()
    ).data as { key: string; value: unknown; updated_at: string | null } | null;
    let showCount: number | null = null;
    let showsEdit: Date | null = null;
    if (showsRaw?.value && Array.isArray(showsRaw.value)) {
      showCount = showsRaw.value.length;
      const d = showsRaw.updated_at ? new Date(showsRaw.updated_at) : null;
      if (d && !Number.isNaN(d.getTime())) showsEdit = d;
    }

    const fmt = (n: number, one: string, many: string) =>
      `${n} ${n === 1 ? one : many}`;

    const latestOf = (keys: string[]): Date | null => {
      let acc: Date | null = null;
      for (const k of keys) {
        const d = latestByKey.get(k);
        if (d && (!acc || d > acc)) acc = d;
      }
      return acc;
    };

    const iso = (d: Date | null) => (d ? d.toISOString() : null);

    out["/admin/perfil"] = {
      meta: "",
      updatedAtIso: iso(latestOf(SECTION_SOURCES["/admin/perfil"])),
    };
    out["/admin/textos"] = {
      meta: "",
      updatedAtIso: iso(latestOf(SECTION_SOURCES["/admin/textos"])),
    };
    out["/admin/lancamentos"] = {
      meta: visibleReleases.length > 0 ? fmt(visibleReleases.length, "lançamento", "lançamentos") : "",
      updatedAtIso: iso(latestReleaseEdit),
    };
    out["/admin/agenda"] = {
      meta: showCount !== null ? fmt(showCount, "show", "shows") : "",
      updatedAtIso: iso(showsEdit),
    };
    out["/admin/universo"] = {
      meta: "",
      updatedAtIso: iso(latestOf(SECTION_SOURCES["/admin/universo"])),
    };
  } catch {
    // Tabelas ainda não criadas, rede… → estado neutro, sem partir o rail.
  }

  return out;
}

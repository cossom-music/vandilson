import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase-server";

/**
 * ESTADO POR SECÇÃO — alimenta os badges do rail do admin (modelo B:
 * «editado» acende a âmbar, secções nunca tocadas ficam «seed»).
 *
 * Fontes:
 *  · site_content.updated_at — secções JSONB (perfil, textos, socials…);
 *  · releases.shows.updated_at — tabelas com updated_at próprio.
 *
 * O badge mostra TAMBÉM uma contagem útil (ex.: «3 lançamentos») — os
 * dados vêm da mesma leitura, sem queries extra.
 */

export type SectionStatus = {
  /** Contagem curta para o badge (ex.: "3 lançamentos"). */
  meta: string;
  /** Última edição desta secção (a mais recente das fontes). */
  updatedAt: Date | null;
};

/** Chaves de site_content que cada secção do admin consulta. */
const SECTION_SOURCES: Record<string, string[]> = {
  "/admin/perfil": ["artist", "socials", "contact"],
  "/admin/textos": ["homeSections", "homeHighlights"],
  "/admin/universo": ["milestones", "eras", "collaborators", "playerPlaylist"],
};

export async function getSectionStatuses(): Promise<Map<string, SectionStatus>> {
  const map = new Map<string, SectionStatus>();
  const supabase = await createSupabaseServerClient();

  // Sem Supabase → estado neutro (o admin mostra aviso nas páginas; o
  // rail continua a funcionar com contagens de seed quando existirem).
  if (!supabase) return map;

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

    // ── Montar o estado por rota ──
    const latestOf = (keys: string[]): Date | null => {
      let acc: Date | null = null;
      for (const k of keys) {
        const d = latestByKey.get(k);
        if (d && (!acc || d > acc)) acc = d;
      }
      return acc;
    };

    map.set("/admin/perfil", {
      meta: "",
      updatedAt: latestOf(SECTION_SOURCES["/admin/perfil"]),
    });
    map.set("/admin/textos", {
      meta: "",
      updatedAt: latestOf(SECTION_SOURCES["/admin/textos"]),
    });
    map.set("/admin/lancamentos", {
      meta: visibleReleases.length > 0 ? fmt(visibleReleases.length, "lançamento", "lançamentos") : "",
      updatedAt: latestReleaseEdit,
    });
    map.set("/admin/agenda", {
      meta: showCount !== null ? fmt(showCount, "show", "shows") : "",
      updatedAt: showsEdit,
    });
    map.set("/admin/universo", {
      meta: "",
      updatedAt: latestOf(SECTION_SOURCES["/admin/universo"]),
    });
    map.set("/admin/seguranca", { meta: "", updatedAt: null });
    map.set("/admin", { meta: "", updatedAt: null });
  } catch {
    // Tabelas ainda não criadas → estado neutro, sem partir o rail.
  }

  return map;
}

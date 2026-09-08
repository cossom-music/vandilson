"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";

/** Chaves de secção editáveis no site_content. */
const SECTION_KEYS = new Set([
  "artist",
  "socials",
  "contact",
  "homeSections",
  "homeHighlights",
  "shows",
]);

/** Limpa o cache do conteúdo do site público. */
function revalidateSiteContent() {
  revalidateTag("site-content");
  revalidatePath("/");
  revalidatePath("/discografia");
}

export type ActionResult = { ok: boolean; error?: string };

/* ── Auth ─────────────────────────────────────────────────── */

export async function signIn(formData: FormData): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase não configurado." };

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: "Credenciais inválidas." };
  redirect("/admin");
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase?.auth.signOut();
  redirect("/admin/login");
}

/* ── Conteúdo (secções JSON de site_content) ──────────────── */

async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return supabase;
}

export async function updateSection(
  key: string,
  value: unknown,
): Promise<ActionResult> {
  const supabase = await requireAdmin();
  if (!supabase) return { ok: false, error: "Sessão expirada. Entre novamente." };
  if (!SECTION_KEYS.has(key) || (typeof value !== "object" && !Array.isArray(value)) || value === null) {
    return { ok: false, error: "Secção inválida." };
  }

  const { error } = await supabase
    .from("site_content")
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });

  if (error) return { ok: false, error: error.message };
  revalidateSiteContent();
  return { ok: true };
}

/* ── Lançamentos ──────────────────────────────────────────── */

export type ReleaseInput = {
  id?: string;
  title: string;
  year: string;
  type: "Single" | "EP" | "Álbum";
  description: string;
  coverPath: string | null;
  featured: boolean;
  tracklist: { title: string; duration?: string }[];
  curiosities: string[];
  facts: { label: string; value: string }[];
};

function cleanRelease(input: ReleaseInput) {
  const tracklist = input.tracklist
    .map((t) => ({ title: t.title.trim(), duration: t.duration?.trim() || undefined }))
    .filter((t) => t.title.length > 0);
  const curiosities = input.curiosities.map((c) => c.trim()).filter((c) => c.length > 0);
  const facts = input.facts
    .map((f) => ({ label: f.label.trim(), value: f.value.trim() }))
    .filter((f) => f.label.length > 0);
  return {
    title: input.title.trim(),
    year: input.year.trim(),
    type: input.type,
    description: input.description.trim() || null,
    cover_path: input.coverPath || null,
    featured: input.featured,
    tracklist,
    curiosities,
    facts,
  };
}

export async function saveRelease(input: ReleaseInput): Promise<ActionResult> {
  const supabase = await requireAdmin();
  if (!supabase) return { ok: false, error: "Sessão expirada. Entre novamente." };
  if (!input.title.trim() || !input.year.trim()) {
    return { ok: false, error: "Título e ano são obrigatórios." };
  }
  const payload = cleanRelease(input);

  if (input.id) {
    const { error } = await supabase
      .from("releases")
      .update(payload)
      .eq("id", input.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { data: last } = await supabase
      .from("releases")
      .select("position")
      .order("position", { ascending: false })
      .limit(1);
    const next = (last?.[0]?.position ?? -1) + 1;
    const { error } = await supabase.from("releases").insert({ ...payload, position: next });
    if (error) return { ok: false, error: error.message };
  }

  revalidateSiteContent();
  return { ok: true };
}

export async function deleteRelease(id: string): Promise<ActionResult> {
  const supabase = await requireAdmin();
  if (!supabase) return { ok: false, error: "Sessão expirada. Entre novamente." };

  // Apaga também a capa do storage, se existir
  const { data: row } = await supabase
    .from("releases")
    .select("cover_path")
    .eq("id", id)
    .maybeSingle();
  if (row?.cover_path) {
    await supabase.storage.from("covers").remove([row.cover_path]);
  }

  const { error } = await supabase.from("releases").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidateSiteContent();
  return { ok: true };
}

/** Liga/desliga o destaque na secção "Ouvir" da homepage. */
export async function toggleFeatured(id: string, featured: boolean): Promise<ActionResult> {
  const supabase = await requireAdmin();
  if (!supabase) return { ok: false, error: "Sessão expirada. Entre novamente." };

  const { error } = await supabase.from("releases").update({ featured }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidateSiteContent();
  return { ok: true };
}

/**
 * Reordena os lançamentos para a ordem exata de `ids` (drag-and-drop no
 * admin). Escreve `position = índice + 1` para cada id — update (não
 * upsert): o upsert parcial violava as constraints NOT NULL das restantes
 * colunas (title, year, …).
 */
export async function reorderReleases(ids: string[]): Promise<ActionResult> {
  const supabase = await requireAdmin();
  if (!supabase) return { ok: false, error: "Sessão expirada. Entre novamente." };
  if (!Array.isArray(ids) || ids.length === 0) {
    return { ok: false, error: "Lista de ordem vazia." };
  }
  if (new Set(ids).size !== ids.length) {
    return { ok: false, error: "Ordem inválida (ids repetidos)." };
  }

  // Confirma que todos os ids existem — evita escrever posições para
  // lançamentos apagados entretanto por outro separador.
  const { data: existing, error: listError } = await supabase
    .from("releases")
    .select("id");
  if (listError) return { ok: false, error: listError.message };
  const existingIds = new Set((existing ?? []).map((r) => r.id));
  if (ids.some((id) => !existingIds.has(id))) {
    return { ok: false, error: "A lista mudou — recarregue a página." };
  }

  let position = 0;
  for (const id of ids) {
    position += 1;
    const { error } = await supabase
      .from("releases")
      .update({ position })
      .eq("id", id);
    if (error) return { ok: false, error: error.message };
  }

  revalidateSiteContent();
  return { ok: true };
}

/** Move um lançamento para cima/baixo (troca a position com o vizinho). */
export async function moveRelease(id: string, direction: "up" | "down"): Promise<ActionResult> {
  const supabase = await requireAdmin();
  if (!supabase) return { ok: false, error: "Sessão expirada. Entre novamente." };

  const { data: rows, error: listError } = await supabase
    .from("releases")
    .select("id, position")
    .order("position", { ascending: true });
  if (listError) return { ok: false, error: listError.message };

  const idx = rows?.findIndex((r) => r.id === id) ?? -1;
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (idx < 0 || !rows || swapIdx < 0 || swapIdx >= rows.length) {
    return { ok: false, error: "Impossível mover." };
  }

  const a = rows[idx];
  const b = rows[swapIdx];
  // update (não upsert): o upsert com só {id, position} tentaria inserir
  // as restantes colunas NOT NULL (title, year, …) como null e violava
  // a constraint. Duas updates sequenciais — position não tem unique.
  const {
    error,
  } = await supabase.from("releases").update({ position: b.position }).eq("id", a.id);
  if (error) return { ok: false, error: error.message };
  const { error: error2 } = await supabase
    .from("releases")
    .update({ position: a.position })
    .eq("id", b.id);
  if (error2) return { ok: false, error: error2.message };

  revalidateSiteContent();
  return { ok: true };
}

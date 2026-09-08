import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { ReleaseInput } from "@/app/admin/actions";

export type AdminRelease = ReleaseInput & {
  id: string;
  imageUrl: string | null;
  featured: boolean;
};

const STORAGE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

function rowToAdminRelease(row: {
  id: string;
  title: string;
  year: string;
  type: string;
  description: string | null;
  cover_path: string | null;
  featured: boolean | null;
  tracklist: unknown;
  curiosities: unknown;
  facts: unknown;
}): AdminRelease {
  return {
    id: row.id,
    title: row.title,
    year: row.year,
    type: (["Single", "EP", "Álbum"] as const).includes(row.type as ReleaseInput["type"])
      ? (row.type as ReleaseInput["type"])
      : "Single",
    description: row.description ?? "",
    coverPath: row.cover_path,
    imageUrl: row.cover_path && STORAGE_URL
      ? `${STORAGE_URL}/storage/v1/object/public/covers/${row.cover_path}`
      : null,
    featured: row.featured ?? false,
    tracklist: Array.isArray(row.tracklist)
      ? (row.tracklist as ReleaseInput["tracklist"])
      : [],
    curiosities: Array.isArray(row.curiosities)
      ? row.curiosities.map((c) => String(c))
      : [],
    facts: Array.isArray(row.facts)
      ? (row.facts as ReleaseInput["facts"])
      : [],
  };
}

/**
 * Lançamentos para o admin, direto da BD (com cover_path). Se o Supabase
 * não estiver configurado devolve null — as páginas mostram um aviso.
 */
export async function getAdminReleases(): Promise<AdminRelease[] | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("releases")
    .select("id, title, year, type, description, cover_path, featured, tracklist, curiosities, facts")
    .order("position", { ascending: true });

  if (error) return null;
  return (data ?? []).map(rowToAdminRelease);
}

export async function getAdminRelease(id: string): Promise<AdminRelease | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("releases")
    .select("id, title, year, type, description, cover_path, featured, tracklist, curiosities, facts")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return rowToAdminRelease(data);
}

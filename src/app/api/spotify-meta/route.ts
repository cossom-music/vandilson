import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { spotifyIdFromLink } from "@/lib/universo";

export const dynamic = "force-dynamic";

/**
 * GET /api/spotify-meta?link=… — metadados de um link do Spotify via oEmbed
 * oficial (sem credenciais): título, autor e thumbnail. Usado no admin ao
 * colar um link para a playlist do OrbitPlayer.
 *
 * PROTEGIDO: só admins autenticados (o site público nunca chama isto —
 * limita abuso de proxy e evita tráfego outbound de visitantes).
 */
export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }
  }

  const link = new URL(request.url).searchParams.get("link")?.trim() ?? "";
  const parsed = spotifyIdFromLink(link);
  if (!parsed) {
    return NextResponse.json(
      { error: "Link do Spotify inválido. Exemplo: https://open.spotify.com/track/…" },
      { status: 400 },
    );
  }

  // oEmbed oficial: devolve título ("title"), autor ("thumbnail_url") etc.
  const embedUrl =
    parsed.kind === "track"
      ? `https://open.spotify.com/track/${parsed.id}`
      : `https://open.spotify.com/${parsed.kind}/${parsed.id}`;
  try {
    const res = await fetch(
      `https://open.spotify.com/oembed?url=${encodeURIComponent(embedUrl)}`,
      { cache: "no-store" },
    );
    if (!res.ok) {
      return NextResponse.json(
        { error: "Spotify não respondeu para este link." },
        { status: 502 },
      );
    }
    const meta = (await res.json()) as {
      title?: string;
      thumbnail_url?: string;
    };
    return NextResponse.json({
      kind: parsed.kind,
      id: parsed.id,
      title: meta.title ?? "",
      coverUrl: meta.thumbnail_url ?? null,
    });
  } catch {
    return NextResponse.json(
      { error: "Falha ao contactar o Spotify." },
      { status: 502 },
    );
  }
}

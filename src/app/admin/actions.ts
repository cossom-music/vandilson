"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getMfaStatus } from "@/lib/mfa-server";

/** Chaves de secção editáveis no site_content. */
const SECTION_KEYS = new Set([
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
]);

/** Limpa o cache do conteúdo do site público. */
function revalidateSiteContent() {
  revalidateTag("site-content");
  revalidatePath("/");
  revalidatePath("/discografia");
  revalidatePath("/universo");
}

export type ActionResult = { ok: boolean; error?: string };

/* ── Auth ─────────────────────────────────────────────────── */

const LOGIN_WINDOW_MINUTES = 15;

/** IP do pedido (atrás de proxy/CDN da Vercel) — só para hashear. */
async function clientIp(): Promise<string> {
  const { headers } = await import("next/headers");
  const h = await headers();
  const ip =
    h.get("x-real-ip") ??
    h.get("cf-connecting-ip") ??
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "desconhecido";
  return ip;
}

export async function signIn(formData: FormData): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Credenciais inválidas." };

  // ── Rate limiting (5 falhas / 15 min, por email+IP) ──
  // RPCs SECURITY DEFINER: a tabela login_attempts tem RLS total —
  // ninguém a lê/escreve diretamente pela anon key.
  const ip = await clientIp();
  const { data: ipHash } = await supabase.rpc("hash_ip", { p_ip: ip });
  const ipKey = typeof ipHash === "string" ? ipHash : ip; // fallback local (sem pgcrypto)

  const { data: blocked, error: blockedErr } = await supabase.rpc("is_login_blocked", {
    p_email: email,
    p_ip_hash: ipKey,
  });
  if (!blockedErr && blocked === true) {
    return {
      ok: false,
      error: `Demasiadas tentativas. Aguarde ${LOGIN_WINDOW_MINUTES} minutos antes de voltar a tentar.`,
    };
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  // Registo de auditoria de autenticação (sucesso e falha) — a falha ao
  // gravar o log NUNCA bloqueia o login.
  await supabase.rpc("record_login_attempt", {
    p_email: email || "(vazio)",
    p_ip_hash: ipKey,
    p_success: !error,
  });

  if (error) return { ok: false, error: "Credenciais inválidas." };
  // ── 2FA (MFA nativo): sessão AAL1 + fator verificado → desafio TOTP ──
  const mfa = await getMfaStatus(supabase);
  if (mfa.needsChallenge) redirect("/admin/mfa");
  redirect("/admin");
}

/* ── 2FA TOTP (MFA nativo do Supabase) ───────────────────── */

/** Estado 2FA para a página /admin/seguranca. */
export async function getMfaState(): Promise<
  { ok: true; hasVerified: boolean; aal: string } | { ok: false; error: string }
> {
  const supabase = await requireAdmin();
  if (!supabase) return { ok: false, error: "Sessão expirada. Entre novamente." };
  const mfa = await getMfaStatus(supabase);
  return { ok: true, hasVerified: mfa.hasVerified, aal: mfa.aal };
}

/** Inicia o enroll TOTP: cria fator não-verificado e devolve segredo+QR. */
export async function enrollTotp(): Promise<
  | { ok: true; factorId: string; qr: string; secret: string }
  | { ok: false; error: string }
> {
  const supabase = await requireAdmin();
  if (!supabase) return { ok: false, error: "Sessão expirada. Entre novamente." };
  // Já tem 2FA ativa → não repetir enroll
  const mfa = await getMfaStatus(supabase);
  if (mfa.hasVerified) {
    return { ok: false, error: "A 2FA já está ativa." };
  }
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "Painel Vandilson",
  });
  if (error || !data) return { ok: false, error: error?.message ?? "Falha ao iniciar 2FA." };
  return {
    ok: true,
    factorId: data.id,
    qr: data.totp.qr_code,
    secret: data.totp.secret,
  };
}

/** Confirma o enroll com o código de 6 dígitos da app autenticadora. */
export async function confirmTotp(factorId: string, code: string): Promise<ActionResult> {
  const supabase = await requireAdmin();
  if (!supabase) return { ok: false, error: "Sessão expirada. Entre novamente." };
  const clean = code.replace(/\D/g, "");
  if (clean.length !== 6) return { ok: false, error: "Código deve ter 6 dígitos." };
  // Um challenge por confirmação; verify sobe a sessão para AAL2
  const challenge = await supabase.auth.mfa.challenge({ factorId });
  if (challenge.error || !challenge.data) {
    return { ok: false, error: challenge.error?.message ?? "Falha ao iniciar verificação." };
  }
  const verify = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.data.id,
    code: clean,
  });
  if (verify.error) return { ok: false, error: "Código inválido. Tenta novamente." };
  return { ok: true };
}

/** Desafio TOTP no login (página /admin/mfa) — sobe a sessão para AAL2. */
export async function verifyTotpLogin(code: string): Promise<ActionResult> {
  const supabase = await requireAdmin();
  if (!supabase) return { ok: false, error: "Sessão expirada. Entre novamente." };
  const clean = code.replace(/\D/g, "");
  if (clean.length !== 6) return { ok: false, error: "Código deve ter 6 dígitos." };
  const mfa = await getMfaStatus(supabase);
  if (!mfa.needsChallenge) redirect("/admin");
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const factor = (factors?.totp ?? []).find((f) => f.status === "verified");
  if (!factor) return { ok: false, error: "Nenhum fator 2FA ativo." };
  const challenge = await supabase.auth.mfa.challenge({ factorId: factor.id });
  if (challenge.error || !challenge.data) {
    return { ok: false, error: challenge.error?.message ?? "Falha ao iniciar verificação." };
  }
  const verify = await supabase.auth.mfa.verify({
    factorId: factor.id,
    challengeId: challenge.data.id,
    code: clean,
  });
  if (verify.error) return { ok: false, error: "Código inválido. Tenta novamente." };
  redirect("/admin");
}

/** Desativa o fator TOTP verificado (exige sessão AAL2). */
export async function disableTotp(): Promise<ActionResult> {
  const supabase = await requireAdmin();
  if (!supabase) return { ok: false, error: "Sessão expirada. Entre novamente." };
  const mfa = await getMfaStatus(supabase);
  if (!mfa.hasVerified) return { ok: false, error: "A 2FA não está ativa." };
  if (mfa.aal !== "aal2") {
    return { ok: false, error: "Confirma um código 2FA antes de desativar." };
  }
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const factor = (factors?.totp ?? []).find((f) => f.status === "verified");
  if (!factor) return { ok: false, error: "Nenhum fator 2FA ativo." };
  const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
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
  tracklist: { title: string; duration?: string; audioPath?: string }[];
  curiosities: string[];
  facts: { label: string; value: string }[];
};

function cleanRelease(input: ReleaseInput) {
  const tracklist = input.tracklist
    .map((t) => ({
      title: t.title.trim(),
      duration: t.duration?.trim() || undefined,
      audioPath: t.audioPath?.trim() || undefined,
    }))
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

/* ── Uploads validados no servidor (auditoria MÉDIO 6) ──────
   Antes: upload direto do browser com contentType do cliente e
   sem limite de tamanho. Agora: server action revalida sessão,
   magic bytes, extensão e tamanho; o NOME do objeto é gerado no
   servidor — o nome do ficheiro do cliente nunca é confiado. */

export type UploadResult = { ok: boolean; path?: string; error?: string };

/** Assinaturas (magic bytes) dos formatos aceites. */
const IMAGE_MIME: Record<string, string> = {
  "image/jpeg": "jpeg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};
const AUDIO_MIME: Record<string, string> = {
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/aac": "aac",
  "audio/ogg": "ogg",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
};
const IMAGE_MAX = 5 * 1024 * 1024; // 5 MB
const AUDIO_MAX = 20 * 1024 * 1024; // 20 MB

/** Lê os primeiros bytes e identifica o tipo REAL do ficheiro. */
function detectMime(buf: Uint8Array): string | null {
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) return "image/png";
  // WEBP: RIFF....WEBP
  if (
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf.at(8) === 0x57 && buf.at(9) === 0x45 && buf.at(10) === 0x42 && buf.at(11) === 0x50
  ) return "image/webp";
  // AVIF: ....ftypavif
  if (
    buf.at(4) === 0x66 && buf.at(5) === 0x74 && buf.at(6) === 0x79 && buf.at(7) === 0x70 &&
    (buf.at(8) === 0x61 || buf.at(9) === 0x61) // avif / avis
  ) return "image/avif";
  // MP3: ID3 ou frame sync 0xFFEx
  if (buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) return "audio/mpeg";
  if (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0) return "audio/mpeg";
  // MP4/M4A: ....ftyp
  if (
    buf.at(4) === 0x66 && buf.at(5) === 0x74 && buf.at(6) === 0x79 && buf.at(7) === 0x70
  ) return "audio/mp4";
  // OGG: OggS
  if (buf[0] === 0x4f && buf[1] === 0x67 && buf[2] === 0x67 && buf[3] === 0x53) return "audio/ogg";
  // WAV: RIFF....WAVE
  if (
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf.at(8) === 0x57 && buf.at(9) === 0x41 && buf.at(10) === 0x56 && buf.at(11) === 0x45
  ) return "audio/wav";
  return null;
}

function safeExt(mime: string): string {
  return IMAGE_MIME[mime] ?? AUDIO_MIME[mime] ?? "bin";
}

/** Validação comum + upload para o bucket indicado. */
async function validatedUpload(
  file: File,
  kind: "image" | "audio",
  bucket: "covers" | "audio",
  prefix: string,
): Promise<UploadResult> {
  const supabase = await requireAdmin();
  if (!supabase) return { ok: false, error: "Sessão expirada. Entre novamente." };

  const max = kind === "image" ? IMAGE_MAX : AUDIO_MAX;
  if (file.size <= 0 || file.size > max) {
    return {
      ok: false,
      error: `Ficheiro ${kind === "image" ? "demasiado grande (máx. 5 MB)" : "demasiado grande (máx. 20 MB)"}.`,
    };
  }

  const buf = new Uint8Array(await file.arrayBuffer());
  const mime = detectMime(buf);
  if (!mime) return { ok: false, error: "Tipo de ficheiro não reconhecido." };
  const allowed = kind === "image" ? IMAGE_MIME : AUDIO_MIME;
  if (!(mime in allowed)) {
    return { ok: false, error: `Conteúdo não é ${kind === "image" ? "uma imagem" : "áudio"} válido.` };
  }

  // Nome gerado NO SERVIDOR — extensão derivada do tipo REAL detectado
  const name = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeExt(mime)}`;
  const { error } = await supabase.storage.from(bucket).upload(name, file, {
    contentType: mime, // o MIME validado, nunca o do cliente
    upsert: false,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, path: name };
}

/** Upload de capa/foto (bucket público "covers"). */
export async function uploadCoverImage(file: File): Promise<UploadResult> {
  return validatedUpload(file, "image", "covers", "r");
}

/** Upload de áudio de faixa (bucket público "audio"). */
export async function uploadAudioTrack(file: File): Promise<UploadResult> {
  return validatedUpload(file, "audio", "audio", "t");
}

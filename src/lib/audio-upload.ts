"use client";

import { supabaseBrowser } from "@/lib/supabase-browser";

/**
 * UPLOAD DIRETO browser → Supabase Storage (bucket "audio").
 *
 * Porque não passar pela Server Action: em plataformas serverless (Vercel)
 * o body das funções está limitado a ~4.5 MB e NÃO é configurável — o
 * `bodySizeLimit` do next.config só vale em servidor próprio. Um MP3 comum
 * (>4.5MB) rebenta com FUNCTION_PAYLOAD_TOO_LARGE antes de chegar ao Next.
 * O Storage do Supabase não tem esse limite (o bucket aceita até 50MB) e a
 * policy de upload já exige sessão de admin autenticada.
 *
 * Validações replicadas da server action (auditoria MÉDIO 6):
 *  · tamanho máximo 50MB (limite do bucket);
 *  · MIME aceites restringidos à lista do bucket;
 *  · magic bytes verificados no browser antes de enviar (o bucket do
 *    Supabase volta a validar o contentType no destino);
 *  · nome gerado no cliente com timestamp + aleatório — sem nomes do
 *    utilizador, sem path traversal (o bucket é de escrita do admin).
 */

export type AudioUploadResult =
  | { ok: true; path: string }
  | { ok: false; error: string };

const AUDIO_MAX = 50 * 1024 * 1024; // 50 MB — igual ao file_size_limit do bucket

const AUDIO_EXT: Record<string, string> = {
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/aac": "aac",
  "audio/ogg": "ogg",
  "audio/wav": "wav",
};

/** Lê os primeiros bytes e identifica o tipo REAL do ficheiro. */
function detectAudioMime(buf: Uint8Array): string | null {
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
  // AAC ADTS: FF Fx (sincronização) — distinto do MP3 pelo segundo byte
  if (buf[0] === 0xff && (buf[1] & 0xf6) === 0xf0) return "audio/aac";
  return null;
}

export async function uploadAudioDirect(file: File): Promise<AudioUploadResult> {
  if (!supabaseBrowser) {
    return { ok: false, error: "Supabase não configurado." };
  }
  // Sessão obrigatória — a policy de INSERT do bucket só aceita authenticated.
  const { data: session } = await supabaseBrowser.auth.getSession();
  if (!session.session) {
    return { ok: false, error: "Sessão expirada. Entre novamente." };
  }
  if (file.size <= 0 || file.size > AUDIO_MAX) {
    return { ok: false, error: "Ficheiro demasiado grande (máx. 50 MB)." };
  }

  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const mime = detectAudioMime(head);
  if (!mime) return { ok: false, error: "Conteúdo não é áudio válido." };

  // Nome gerado aqui (timestamp + aleatório) — igual ao padrão da server action.
  const ext = AUDIO_EXT[mime] ?? "bin";
  const name = `a-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabaseBrowser.storage.from("audio").upload(name, file, {
    contentType: mime, // o MIME validado por magic bytes, nunca o do cliente
    upsert: false,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, path: name };
}

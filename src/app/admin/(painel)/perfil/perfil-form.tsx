"use client";

import { startTransition, useRef, useState } from "react";
import { updateSection } from "../../actions";
import { supabaseBrowser } from "@/lib/supabase-browser";
import type { Artist, Contact, Social } from "@/content";
import { Alert, Button, Field, Panel, TextArea, TextInput } from "../../_ui";

/* ── Save com estado ──────────────────────────────────────── */

function useSectionSave(key: string) {
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const save = (value: unknown) => {
    setPending(true);
    setNotice(null);
    startTransition(async () => {
      const res = await updateSection(key, value);
      setPending(false);
      setNotice(
        res.ok
          ? { kind: "ok", text: "Guardado — o site já está atualizado." }
          : { kind: "err", text: res.error ?? "Erro ao guardar." },
      );
    });
  };

  return { save, pending, notice };
}

function SaveBar({
  pending,
  notice,
  onSave,
}: {
  pending: boolean;
  notice: { kind: "ok" | "err"; text: string } | null;
  onSave: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button type="button" onClick={onSave} disabled={pending}>
        {pending ? "A guardar…" : "Guardar alterações"}
      </Button>
      {notice ? <Alert kind={notice.kind}>{notice.text}</Alert> : null}
    </div>
  );
}

/* ── Artista ──────────────────────────────────────────────── */

export function ArtistForm({ initial }: { initial: Artist }) {
  const [draft, setDraft] = useState<Artist>(initial);
  const { save, pending, notice } = useSectionSave("artist");

  /* Foto: ficheiro novo + preview + path anterior (para apagar do storage) */
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(initial.photo ?? null);
  const prevPhotoPath = useRef<string | null>(extractPath(initial.photo));
  const photoInput = useRef<HTMLInputElement>(null);
  const [photoBusy, setPhotoBusy] = useState(false);

  const set = <K extends keyof Artist>(key: K, value: Artist[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const setBio = (i: number, text: string) =>
    setDraft((d) => ({ ...d, longBio: d.longBio.map((p, j) => (j === i ? text : p)) }));

  const addBio = () => setDraft((d) => ({ ...d, longBio: [...d.longBio, ""] }));
  const removeBio = (i: number) =>
    setDraft((d) => ({ ...d, longBio: d.longBio.filter((_, j) => j !== i) }));

  /* ── Foto ── */
  const pickPhoto = (file: File | null) => {
    if (!file) return;
    setPhotoFile(file);
    if (photoUrl?.startsWith("blob:")) URL.revokeObjectURL(photoUrl);
    setPhotoUrl(URL.createObjectURL(file));
  };

  const removePhoto = () => {
    setPhotoFile(null);
    if (photoUrl?.startsWith("blob:")) URL.revokeObjectURL(photoUrl);
    setPhotoUrl(null);
    set("photo", null);
  };

  /** path do objeto no bucket a partir do URL público. */
  function extractPath(url: string | null | undefined): string | null {
    if (!url) return null;
    const m = /\/covers\/(.+)$/.exec(url);
    return m ? decodeURIComponent(m[1]) : null;
  }

  /** Envia a foto nova (se houver) e devolve o URL público final. */
  async function uploadPhoto(): Promise<string | null> {
    if (!photoFile) return draft.photo ?? null;
    if (!supabaseBrowser) throw new Error("Supabase não configurado para o upload.");
    const m = /\.(jpe?g|png|webp|avif)$/i.exec(photoFile.name);
    const name = `artist-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${m ? m[1].toLowerCase() : "jpg"}`;
    const { error } = await supabaseBrowser.storage
      .from("covers")
      .upload(name, photoFile, { contentType: photoFile.type });
    if (error) throw new Error(error.message);
    return supabaseBrowser.storage.from("covers").getPublicUrl(name).data.publicUrl;
  }

  return (
    <Panel title="Artista">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Nome (mostrado no header/footer)">
          <TextInput value={draft.name} onChange={(e) => set("name", e.target.value)} />
        </Field>
        <Field label="Primeiro nome (herói)">
          <TextInput value={draft.firstName} onChange={(e) => set("firstName", e.target.value)} />
        </Field>
        <Field label="Último nome (herói)">
          <TextInput value={draft.lastName} onChange={(e) => set("lastName", e.target.value)} />
        </Field>
        <Field label="Frase (tagline)">
          <TextInput value={draft.tagline} onChange={(e) => set("tagline", e.target.value)} />
        </Field>
      </div>

      <div className="mt-5">
        <Field label="Bio curta" hint="Usada em destaque / destaques da home.">
          <TextArea
            rows={3}
            value={draft.shortBio}
            onChange={(e) => set("shortBio", e.target.value)}
          />
        </Field>
      </div>

      <div className="mt-5">
        <span className="mb-2 block text-[11px] font-medium uppercase tracking-[0.14em] text-silver-500">
          Biografia longa
        </span>
        <div className="space-y-3">
          {draft.longBio.map((paragraph, i) => (
            <div key={i} className="flex items-start gap-2">
              <TextArea
                rows={3}
                value={paragraph}
                onChange={(e) => setBio(i, e.target.value)}
                className="flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                onClick={() => removeBio(i)}
                aria-label="Remover parágrafo"
              >
                ×
              </Button>
            </div>
          ))}
        </div>
        <Button type="button" variant="ghost" onClick={addBio} className="mt-3">
          + Adicionar parágrafo
        </Button>
      </div>

      <div className="mt-5">
        <Field label="Legenda da fotografia">
          <TextInput value={draft.photoAlt} onChange={(e) => set("photoAlt", e.target.value)} />
        </Field>
      </div>

      {/* ── Fotografia (bucket covers, como as capas) ── */}
      <div className="mt-6">
        <span className="mb-2 block text-[11px] font-medium uppercase tracking-[0.14em] text-silver-500">
          Fotografia
        </span>
        <div className="flex flex-wrap items-center gap-5">
          <div className="relative h-28 w-28 overflow-hidden rounded-full border border-white/10 bg-night-950">
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- preview local/foto do CMS
              <img src={photoUrl} alt="Pré-visualização da fotografia" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-center text-[10px] uppercase tracking-[0.14em] text-silver-700">
                Sem foto
              </span>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <input
              ref={photoInput}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              className="hidden"
              onChange={(e) => pickPhoto(e.target.files?.[0] ?? null)}
            />
            <Button type="button" variant="ghost" onClick={() => photoInput.current?.click()} disabled={photoBusy}>
              {photoUrl ? "Substituir foto…" : "Enviar foto…"}
            </Button>
            {photoUrl ? (
              <Button type="button" variant="danger" onClick={removePhoto} disabled={photoBusy}>
                Remover foto
              </Button>
            ) : null}
            <p className="max-w-[240px] text-xs text-mist/60">
              PNG, JPG, WebP ou AVIF até 15 MB. A foto vive dentro do disco do eclipse, na biografia.
            </p>
          </div>
        </div>
      </div>

      {/* ── Coordenadas (carta celeste) ── */}
      <div className="mt-6 grid gap-5 sm:grid-cols-3">
        <Field label="Origem" hint="Coordenada na bio.">
          <TextInput
            value={draft.origin ?? ""}
            onChange={(e) => set("origin", e.target.value)}
            placeholder="Moçambique"
          />
        </Field>
        <Field label="Base" hint="Coordenada na bio.">
          <TextInput
            value={draft.base ?? ""}
            onChange={(e) => set("base", e.target.value)}
            placeholder="Lisboa"
          />
        </Field>
        <Field label="Órbita" hint="Coordenada na bio.">
          <TextInput
            value={draft.orbit ?? ""}
            onChange={(e) => set("orbit", e.target.value)}
            placeholder="Mundo"
          />
        </Field>
      </div>

      <div className="mt-6 border-t border-white/10 pt-5">
        <SaveBar
          pending={pending}
          notice={notice}
          onSave={async () => {
            setPhotoBusy(true);
            try {
              const url = await uploadPhoto();
              const finalDraft = { ...draft, photo: url };
              // apaga a foto antiga substituída
              const prev = prevPhotoPath.current;
              const nextPath = url ? extractPath(url) : null;
              if (prev && prev !== nextPath && supabaseBrowser) {
                await supabaseBrowser.storage.from("covers").remove([prev]);
              }
              prevPhotoPath.current = nextPath;
              setPhotoFile(null);
              setPhotoBusy(false);
              set("photo", url);
              save(finalDraft);
            } catch (err) {
              setPhotoBusy(false);
              alert(err instanceof Error ? err.message : "Erro no upload da foto.");
            }
          }}
        />
      </div>
    </Panel>
  );
}

/* ── Redes sociais ────────────────────────────────────────── */

const NETWORKS: Social["label"][] = [
  "Instagram",
  "YouTube",
  "Spotify",
  "Apple Music",
  "TikTok",
  "Facebook",
  "X",
  "Threads",
  "SoundCloud",
];

export function SocialsForm({ initial }: { initial: Social[] }) {
  const [rows, setRows] = useState<Social[]>(
    NETWORKS.map(
      (label) =>
        initial.find((s) => s.label === label) ?? { label, handle: "", url: "", visible: false },
    ),
  );
  const { save, pending, notice } = useSectionSave("socials");

  const setRow = (i: number, patch: Partial<Social>) =>
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  return (
    <Panel title="Redes sociais">
      <p className="-mt-2 mb-5 text-xs leading-relaxed text-mist/70">
        Cada rede ativa é uma órbita na secção Sintonia. Liga ou desliga cada rede com o
        interruptor — as desligadas deixam de aparecer em todo o site.
      </p>
      <div className="space-y-4">
        {rows.map((row, i) => (
          <div
            key={row.label}
            className="grid items-end gap-3 rounded-xl border border-white/[0.07] bg-night-950/40 p-4 md:grid-cols-[150px_1fr_1.4fr_auto]"
          >
            <Field label="Rede">
              <TextInput value={row.label} readOnly className="opacity-60" />
            </Field>
            <Field label="Handle">
              <TextInput
                value={row.handle}
                onChange={(e) => setRow(i, { handle: e.target.value })}
                placeholder="@utilizador"
              />
            </Field>
            <Field label="Link">
              <TextInput
                value={row.url}
                onChange={(e) => setRow(i, { url: e.target.value })}
                placeholder="https://…"
              />
            </Field>
            <Field label="Visível">
              <label className="flex h-[38px] cursor-pointer items-center justify-center gap-2 rounded-lg border border-white/10 px-3 text-xs text-mist/80 select-none">
                <input
                  type="checkbox"
                  checked={row.visible !== false}
                  onChange={(e) => setRow(i, { visible: e.target.checked })}
                  className="h-4 w-4 accent-mist"
                />
                {row.visible !== false ? "Na órbita" : "Oculta"}
              </label>
            </Field>
          </div>
        ))}
      </div>
      <div className="mt-6 border-t border-white/10 pt-5">
        <SaveBar pending={pending} notice={notice} onSave={() => save(rows)} />
      </div>
    </Panel>
  );
}

/* ── Contacto ─────────────────────────────────────────────── */

export function ContactForm({ initial }: { initial: Contact }) {
  const [email, setEmail] = useState(initial.email);
  const { save, pending, notice } = useSectionSave("contact");

  return (
    <Panel title="Contacto / Booking">
      <Field
        label="E-mail"
        hint="Aparece no header, na Sintonia e no rodapé (mailto)."
      >
        <TextInput
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="max-w-md"
        />
      </Field>
      <div className="mt-6 border-t border-white/10 pt-5">
        <SaveBar pending={pending} notice={notice} onSave={() => save({ email })} />
      </div>
    </Panel>
  );
}

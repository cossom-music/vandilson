"use client";

import { startTransition, useState } from "react";
import { updateSection } from "../../actions";
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

  const set = <K extends keyof Artist>(key: K, value: Artist[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const setBio = (i: number, text: string) =>
    setDraft((d) => ({ ...d, longBio: d.longBio.map((p, j) => (j === i ? text : p)) }));

  const addBio = () => setDraft((d) => ({ ...d, longBio: [...d.longBio, ""] }));
  const removeBio = (i: number) =>
    setDraft((d) => ({ ...d, longBio: d.longBio.filter((_, j) => j !== i) }));

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

      <div className="mt-6 border-t border-white/10 pt-5">
        <SaveBar pending={pending} notice={notice} onSave={() => save(draft)} />
      </div>
    </Panel>
  );
}

/* ── Redes sociais ────────────────────────────────────────── */

const NETWORKS: Social["label"][] = ["Instagram", "YouTube", "Spotify", "Apple Music"];

export function SocialsForm({ initial }: { initial: Social[] }) {
  const [rows, setRows] = useState<Social[]>(
    NETWORKS.map((label) => initial.find((s) => s.label === label) ?? { label, handle: "", url: "" }),
  );
  const { save, pending, notice } = useSectionSave("socials");

  const setRow = (i: number, patch: Partial<Social>) =>
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  return (
    <Panel title="Redes sociais">
      <p className="-mt-2 mb-5 text-xs leading-relaxed text-mist/70">
        Cada rede é uma órbita na secção Sintonia — a ordem é fixa (o desenho das órbitas
        depende dela). Edite o handle e o link de cada uma.
      </p>
      <div className="space-y-4">
        {rows.map((row, i) => (
          <div
            key={row.label}
            className="grid items-end gap-3 rounded-xl border border-white/[0.07] bg-night-950/40 p-4 md:grid-cols-[160px_1fr_1.4fr]"
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

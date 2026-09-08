"use client";

import { startTransition, useState } from "react";
import { updateSection } from "../../actions";
import type { HomeHighlights, HomeSections } from "@/content";
import { Alert, Button, Field, Panel, TextArea, TextInput } from "../../_ui";

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

export function HomeSectionsForm({ initial }: { initial: HomeSections }) {
  const [draft, setDraft] = useState<HomeSections>(initial);
  const { save, pending, notice } = useSectionSave("homeSections");

  const setMusic = (k: keyof HomeSections["music"], v: string) =>
    setDraft((d) => ({ ...d, music: { ...d.music, [k]: v } }));
  const setContact = (k: keyof HomeSections["contact"], v: string) =>
    setDraft((d) => ({ ...d, contact: { ...d.contact, [k]: v } }));

  return (
    <Panel title="Secções da home">
      <p className="-mt-2 mb-5 text-xs leading-relaxed text-mist/70">
        Secção <em>Ouvir / Discografia</em> (a pilha de lançamentos) e secção{" "}
        <em>Sintonia / Onde a música vive</em> (as órbitas das redes).
      </p>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Eyebrow — Ouvir">
          <TextInput value={draft.music.eyebrow} onChange={(e) => setMusic("eyebrow", e.target.value)} />
        </Field>
        <Field label="Título — Ouvir">
          <TextInput value={draft.music.title} onChange={(e) => setMusic("title", e.target.value)} />
        </Field>
      </div>
      <div className="mt-5">
        <Field label="CTA da discografia">
          <TextInput value={draft.music.cta} onChange={(e) => setMusic("cta", e.target.value)} />
        </Field>
      </div>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <Field label="Eyebrow — Sintonia">
          <TextInput
            value={draft.contact.eyebrow}
            onChange={(e) => setContact("eyebrow", e.target.value)}
          />
        </Field>
        <Field label="Título — Sintonia">
          <TextInput
            value={draft.contact.title}
            onChange={(e) => setContact("title", e.target.value)}
          />
        </Field>
      </div>
      <div className="mt-6 border-t border-white/10 pt-5">
        <SaveBar pending={pending} notice={notice} onSave={() => save(draft)} />
      </div>
    </Panel>
  );
}

export function HomeHighlightsForm({ initial }: { initial: HomeHighlights }) {
  const [draft, setDraft] = useState<HomeHighlights>(initial);
  const { save, pending, notice } = useSectionSave("homeHighlights");

  const setLatest = (k: keyof HomeHighlights["latest"], v: string) =>
    setDraft((d) => ({ ...d, latest: { ...d.latest, [k]: v } }));

  return (
    <Panel title="Destaques">
      <p className="-mt-2 mb-5 text-xs leading-relaxed text-mist/70">
        Destaque do último lançamento (descrição que entra na secção Ouvir, em
        ecrãs maiores) e frase CTA.
      </p>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Rótulo do destaque">
          <TextInput value={draft.latest.label} onChange={(e) => setLatest("label", e.target.value)} />
        </Field>
        <Field label="Título do destaque">
          <TextInput value={draft.latest.title} onChange={(e) => setLatest("title", e.target.value)} />
        </Field>
      </div>
      <div className="mt-5">
        <Field label="Descrição do destaque">
          <TextArea rows={3} value={draft.latest.description} onChange={(e) => setLatest("description", e.target.value)} />
        </Field>
      </div>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <Field label="CTA — Ouvir agora">
          <TextInput value={draft.listenCta} onChange={(e) => setDraft((d) => ({ ...d, listenCta: e.target.value }))} />
        </Field>
        <Field label="Teaser da bio (destaque)">
          <TextInput value={draft.bioTeaser} onChange={(e) => setDraft((d) => ({ ...d, bioTeaser: e.target.value }))} />
        </Field>
      </div>
      <div className="mt-6 border-t border-white/10 pt-5">
        <SaveBar pending={pending} notice={notice} onSave={() => save(draft)} />
      </div>
    </Panel>
  );
}

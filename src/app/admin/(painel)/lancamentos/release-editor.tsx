"use client";

import { startTransition, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { saveRelease, type ReleaseInput } from "../../actions";
import { supabaseBrowser } from "@/lib/supabase-browser";
import type { AdminRelease } from "@/lib/admin-releases";
import { Alert, Button, Field, Panel, Select, TextArea, TextInput } from "../../_ui";

type Draft = Omit<ReleaseInput, "coverPath"> & {
  coverPath: string | null;
};

export function ReleaseEditor({ release }: { release: AdminRelease | null }) {
  const router = useRouter();
  const empty = (): Draft => ({
    title: "",
    year: "",
    type: "Single",
    description: "",
    coverPath: null,
    featured: false,
    tracklist: [{ title: "", duration: "" }],
    curiosities: [""],
    facts: [{ label: "", value: "" }],
  });
  const fromRelease = (r: AdminRelease): Draft => ({
    id: r.id,
    title: r.title,
    year: r.year,
    type: r.type,
    description: r.description,
    coverPath: r.coverPath,
    featured: r.featured,
    tracklist: r.tracklist,
    curiosities: r.curiosities,
    facts: r.facts,
  });
  const [draft, setDraft] = useState<Draft>(() => (release ? fromRelease(release) : empty()));
  // Capa: ficheiro escolhido (ainda não enviado) + preview
  const [newFile, setNewFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(release?.imageUrl ?? null);
  const previousPath = useRef(release?.coverPath ?? null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  /* ── listas aninhadas ── */
  const setTrack = (i: number, patch: Partial<{ title: string; duration?: string }>) =>
    setDraft((d) => ({
      ...d,
      tracklist: d.tracklist.map((t, j) => (j === i ? { ...t, ...patch } : t)),
    }));
  const setCurio = (i: number, v: string) =>
    setDraft((d) => ({ ...d, curiosities: d.curiosities.map((c, j) => (j === i ? v : c)) }));
  const setFact = (i: number, patch: { label: string; value: string }) =>
    setDraft((d) => ({ ...d, facts: d.facts.map((f, j) => (j === i ? { ...f, ...patch } : f)) }));

  /* ── capa ── */
  const pickFile = (file: File | null) => {
    if (!file) return;
    setNewFile(file);
    if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const removeCover = () => {
    setNewFile(null);
    if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setDraft((d) => ({ ...d, coverPath: null }));
  };

  const ext = (name: string) => {
    const m = /\.(jpe?g|png|webp|avif)$/i.exec(name);
    return m ? m[1].toLowerCase() : "jpg";
  };

  const save = () => {
    setBusy(true);
    setNotice(null);
    startTransition(async () => {
      try {
        // 1 · enviar capa nova (se houver) — o nome fica pronto antes do save
        let finalPath = draft.coverPath;
        if (newFile) {
          if (!supabaseBrowser) throw new Error("Supabase não configurado para o upload.");
          const name = `r-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext(newFile.name)}`;
          const { error: upErr } = await supabaseBrowser.storage
            .from("covers")
            .upload(name, newFile, { contentType: newFile.type });
          if (upErr) throw new Error(upErr.message);
          finalPath = name;
          setDraft((d) => ({ ...d, coverPath: name }));
          setNewFile(null);
        }

        // 2 · gravar na BD
        const res = await saveRelease({ ...draft, coverPath: finalPath });
        if (!res.ok) throw new Error(res.error ?? "Erro ao guardar.");

        // 3 · limpar capa antiga substituída/removida
        const prev = previousPath.current;
        if (prev && prev !== finalPath && supabaseBrowser) {
          await supabaseBrowser.storage.from("covers").remove([prev]);
        }
        previousPath.current = finalPath;

        setNotice({ kind: "ok", text: "Guardado." });
        setBusy(false);
        router.push("/admin/lancamentos");
        router.refresh();
      } catch (err) {
        setBusy(false);
        setNotice({ kind: "err", text: err instanceof Error ? err.message : "Erro ao guardar." });
      }
    });
  };

  const title = release ? "Editar lançamento" : "Novo lançamento";

  return (
    <Panel title={title}>
      <div className="grid gap-5 sm:grid-cols-[1fr_140px_170px]">
        <Field label="Título *">
          <TextInput value={draft.title} onChange={(e) => set("title", e.target.value)} />
        </Field>
        <Field label="Ano *">
          <TextInput value={draft.year} onChange={(e) => set("year", e.target.value)} placeholder="2026" />
        </Field>
        <Field label="Tipo">
          <Select
            value={draft.type}
            onChange={(e) => set("type", e.target.value as Draft["type"])}
          >
            <option value="Single">Single</option>
            <option value="EP">EP</option>
            <option value="Álbum">Álbum</option>
          </Select>
        </Field>
      </div>

      <div className="mt-5">
        <Field label="Descrição" hint="Linha curta mostrada na ficha e na homepage.">
          <TextArea rows={2} value={draft.description} onChange={(e) => set("description", e.target.value)} />
        </Field>
      </div>

      {/* ── Capa ── */}
      <div className="mt-6">
        <span className="mb-2 block text-[11px] font-medium uppercase tracking-[0.14em] text-silver-500">
          Capa
        </span>
        <div className="flex flex-wrap items-center gap-5">
          <div className="relative h-28 w-28 overflow-hidden rounded-full border border-white/10 bg-night-950">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- preview local/capa do CMS
              <img src={previewUrl} alt="Pré-visualização da capa" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-center text-[10px] uppercase tracking-[0.14em] text-silver-700">
                Sem capa
              </span>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
            />
            <Button type="button" variant="ghost" onClick={() => fileInput.current?.click()}>
              {previewUrl ? "Substituir capa…" : "Enviar capa…"}
            </Button>
            {previewUrl ? (
              <Button type="button" variant="danger" onClick={removeCover}>
                Remover capa
              </Button>
            ) : null}
            <p className="max-w-[240px] text-xs text-mist/60">
              PNG, JPG, WebP ou AVIF até 15 MB. A capa vira a superfície do planeta.
            </p>
          </div>
        </div>
      </div>

      {/* ── Destaque na homepage ── */}
      <div className="mt-6">
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/[0.07] bg-night-950/40 p-4">
          <input
            type="checkbox"
            checked={draft.featured}
            onChange={(e) => set("featured", e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-silver-300"
          />
          <span>
            <span className="block text-sm font-medium text-cream">
              Destacar na secção “Ouvir” da homepage
            </span>
            <span className="mt-1 block text-xs text-mist/60">
              Os lançamentos marcados aparecem no grid de planetas da homepage.
              Se nenhum estiver marcado, a homepage mostra todos.
            </span>
          </span>
        </label>
      </div>

      {/* ── Tracklist ── */}
      <div className="mt-7">
        <span className="mb-2 block text-[11px] font-medium uppercase tracking-[0.14em] text-silver-500">
          Tracklist
        </span>
        <div className="space-y-2">
          {draft.tracklist.map((track, i) => (
            <div
              key={i}
              className="grid grid-cols-[1.75rem_minmax(0,1fr)_4.5rem_auto] items-center gap-2"
            >
              <span className="text-right font-mono text-[11px] text-silver-600">
                {String(i + 1).padStart(2, "0")}
              </span>
              <TextInput
                value={track.title}
                onChange={(e) => setTrack(i, { title: e.target.value })}
                placeholder="Título da faixa"
              />
              <TextInput
                value={track.duration ?? ""}
                onChange={(e) => setTrack(i, { duration: e.target.value })}
                placeholder="3:42"
              />
              <Button type="button" variant="ghost" aria-label="Remover faixa" onClick={() => set("tracklist", draft.tracklist.filter((_, j) => j !== i))}>
                ×
              </Button>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="ghost"
          className="mt-3"
          onClick={() => set("tracklist", [...draft.tracklist, { title: "", duration: "" }])}
        >
          + Adicionar faixa
        </Button>
      </div>

      {/* ── Curiosidades ── */}
      <div className="mt-7">
        <span className="mb-2 block text-[11px] font-medium uppercase tracking-[0.14em] text-silver-500">
          Curiosidades
        </span>
        <div className="space-y-2">
          {draft.curiosities.map((curio, i) => (
            <div key={i} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
              <TextArea
                rows={1}
                value={curio}
                onChange={(e) => setCurio(i, e.target.value)}
                placeholder="Uma curiosidade sobre o lançamento"
              />
              <Button type="button" variant="ghost" aria-label="Remover curiosidade" onClick={() => set("curiosities", draft.curiosities.filter((_, j) => j !== i))}>
                ×
              </Button>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="ghost"
          className="mt-3"
          onClick={() => set("curiosities", [...draft.curiosities, ""])}
        >
          + Adicionar curiosidade
        </Button>
      </div>

      {/* ── Ficha técnica ── */}
      <div className="mt-7">
        <span className="mb-2 block text-[11px] font-medium uppercase tracking-[0.14em] text-silver-500">
          Ficha técnica
        </span>
        <div className="space-y-2">
          {draft.facts.map((fact, i) => (
            <div
              key={i}
              className="grid grid-cols-[minmax(7rem,10rem)_minmax(0,1fr)_auto] items-center gap-2"
            >
              <TextInput
                value={fact.label}
                onChange={(e) => setFact(i, { ...fact, label: e.target.value })}
                placeholder="Produção"
              />
              <TextInput
                value={fact.value}
                onChange={(e) => setFact(i, { ...fact, value: e.target.value })}
                placeholder="A confirmar"
              />
              <Button type="button" variant="ghost" aria-label="Remover linha da ficha" onClick={() => set("facts", draft.facts.filter((_, j) => j !== i))}>
                ×
              </Button>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="ghost"
          className="mt-3"
          onClick={() => set("facts", [...draft.facts, { label: "", value: "" }])}
        >
          + Adicionar à ficha
        </Button>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-white/10 pt-6">
        <Button type="button" onClick={save} disabled={busy}>
          {busy ? "A guardar…" : release ? "Guardar alterações" : "Criar lançamento"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/admin/lancamentos")}>
          Cancelar
        </Button>
        {notice ? <Alert kind={notice.kind}>{notice.text}</Alert> : null}
      </div>
    </Panel>
  );
}

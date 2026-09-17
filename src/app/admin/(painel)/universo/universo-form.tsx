"use client";

import { startTransition, useState } from "react";
import { updateSection } from "../../actions";
import type {
  Collaborator,
  Era,
  Milestone,
  PlayerTrack,
  Release,
} from "@/content";
import { playableTracks, spotifyIdFromLink } from "@/lib/universo";
import { Alert, Button, Panel, TextInput } from "../../_ui";

/** Guarda uma secção do site_content e mostra o resultado. */
function useSectionSave<T>(key: string, draft: T) {
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const save = () => {
    setPending(true);
    setNotice(null);
    startTransition(async () => {
      const res = await updateSection(key, draft);
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

/* ════════════════ PLAYER EM ÓRBITA — playlist curada ════════════════ */

function PlayerPlaylistForm({
  curated,
  releases,
}: {
  curated: PlayerTrack[];
  releases: Release[];
}) {
  const available = playableTracks(releases);
  const [draft, setDraft] = useState<PlayerTrack[]>(curated);
  const { save, pending, notice } = useSectionSave("playerPlaylist", draft);

  const key = (t: { title: string; releaseTitle: string }) =>
    `${t.releaseTitle}::${t.title}`;
  const selected = new Set(draft.map(key));

  // ── Adicionar faixa do SPOTIFY por link colado ──
  // O link é validado localmente (spotifyIdFromLink) e os metadados vêm
  // do oEmbed oficial via /api/spotify-meta (rota protegida por sessão).
  const [spotifyLink, setSpotifyLink] = useState("");
  const [spotifyBusy, setSpotifyBusy] = useState(false);
  const [spotifyError, setSpotifyError] = useState<string | null>(null);

  const addSpotify = async () => {
    setSpotifyError(null);
    const link = spotifyLink.trim();
    const parsed = spotifyIdFromLink(link);
    if (!parsed) {
      setSpotifyError("Link inválido — cola um link de open.spotify.com (track, álbum ou playlist).");
      return;
    }
    setSpotifyBusy(true);
    try {
      const res = await fetch(`/api/spotify-meta?link=${encodeURIComponent(link)}`);
      const meta = (await res.json()) as { title?: string; coverUrl?: string | null; error?: string };
      if (!res.ok) {
        setSpotifyError(meta.error ?? "Não foi possível buscar os dados do Spotify.");
        return;
      }
      const fullTitle = (meta.title ?? "").trim() || "Faixa do Spotify";
      // «Título — Álbum» ou «Título - Álbum» → separa em título + lançamento
      const [t, rel] = fullTitle.split(/\s+[-–—]\s+/, 2);
      const title = (t || fullTitle).trim();
      const releaseTitle = (rel ?? "Spotify").trim();
      const k = `${releaseTitle}::${title}`;
      setDraft((d) =>
        d.some((x) => `${x.releaseTitle}::${x.title}` === k)
          ? d
          : [...d, { title, releaseTitle, spotifyId: parsed.id, coverUrl: meta.coverUrl ?? undefined }],
      );
      setSpotifyLink("");
    } catch {
      setSpotifyError("Falha de rede ao contactar o Spotify.");
    } finally {
      setSpotifyBusy(false);
    }
  };

  const toggle = (t: { title: string; releaseTitle: string; audioPath?: string }) => {
    setDraft((d) =>
      selected.has(key(t))
        ? d.filter((x) => key(x) !== key(t))
        : [...d, { title: t.title, releaseTitle: t.releaseTitle, audioPath: t.audioPath }],
    );
  };

  // Reordenar: mover uma faixa curada uma posição
  const move = (i: number, dir: -1 | 1) => {
    setDraft((d) => {
      const j = i + dir;
      if (j < 0 || j >= d.length) return d;
      const next = [...d];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  return (
    <Panel title="Player Em Órbita — playlist">
      <p className="text-sm text-mist">
        Escolha as faixas que tocam no player fixo da página <b>/universo</b> e a
        ordem em que se sucedem. Só aparecem aqui as faixas que têm áudio carregado
        (no editor de <b>Lançamentos</b>, botão “Carregar áudio…” junto a cada faixa).
      </p>

      {/* Adicionar faixa do SPOTIFY por link */}
      <div className="mt-5 rounded-xl border border-white/10 bg-night-950/40 p-4">
        <span className="mb-2 block text-[11px] font-medium uppercase tracking-[0.14em] text-silver-500">
          Adicionar do Spotify
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <TextInput
            value={spotifyLink}
            onChange={(e) => {
              setSpotifyLink(e.target.value);
              setSpotifyError(null);
            }}
            placeholder="https://open.spotify.com/track/…"
            className="min-w-0 flex-1"
          />
          <Button type="button" variant="ghost" onClick={addSpotify} disabled={spotifyBusy}>
            {spotifyBusy ? "A buscar…" : "+ Adicionar"}
          	</Button>
        </div>
        {spotifyError ? (
          <p className="mt-2 text-xs text-red-400">{spotifyError}</p>
        ) : (
          <p className="mt-2 text-[11px] leading-relaxed text-mist/60">
            Funciona com links de faixas, álbuns e playlists. No site, a faixa
            toca pelo player do Spotify: prévia de 30s para visitantes sem
            Spotify logado, faixa completa com sessão. As faixas MP3 carregadas
            tocam completas para todos.
          </p>
        )}
      </div>

      {available.length === 0 ? (
        <p className="mt-5 rounded-xl border border-white/10 bg-night-950/40 p-4 text-sm text-mist/70">
          Ainda não há faixas com áudio carregado. Vá a <b>Lançamentos</b> → edite um
          lançamento → “Carregar áudio…” na faixa pretendida. As faixas com MP3
          aparecem aqui para entrar na playlist.
        </p>
      ) : (
        <div className="mt-5 space-y-5">
          {/* Faixas disponíveis — ligar/desligar */}
          <div>
            <span className="mb-2 block text-[11px] font-medium uppercase tracking-[0.14em] text-silver-500">
              Faixas disponíveis ({available.length})
            </span>
            <div className="grid gap-2 sm:grid-cols-2">
              {available.map((t) => {
                const on = selected.has(key(t));
                return (
                  <label
                    key={key(t)}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors ${
                      on
                        ? "border-amber-300/40 bg-amber-300/5"
                        : "border-white/10 bg-night-950/40 hover:border-silver-500/40"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggle(t)}
                      className="h-4 w-4 accent-amber-400"
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-cream">{t.title}</span>
                      <span className="block truncate text-[11px] text-mist/60">
                        {t.releaseTitle}
                        {t.duration ? ` · ${t.duration}` : ""}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Ordem da playlist */}
          {draft.length > 0 ? (
            <div>
              <span className="mb-2 block text-[11px] font-medium uppercase tracking-[0.14em] text-silver-500">
                Ordem de reprodução
              </span>
              <div className="space-y-2">
                {draft.map((t, i) => (
                  <div
                    key={key(t)}
                    className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-2 rounded-xl border border-white/10 bg-night-950/40 p-2.5"
                  >
                    <span className="text-center font-mono text-[11px] text-silver-500">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-cream">
                        {t.title}
                        {t.spotifyId ? (
                          <span className="ml-2 rounded bg-[#1DB954]/15 px-1.5 py-0.5 align-[1px] text-[9px] font-semibold uppercase tracking-[0.1em] text-[#1DB954]">
                            Spotify
                          </span>
                        ) : null}
                      </span>
                      <span className="block truncate text-[11px] text-mist/60">{t.releaseTitle}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Button type="button" variant="ghost" aria-label="Subir" onClick={() => move(i, -1)}>
                        ↑
                      </Button>
                      <Button type="button" variant="ghost" aria-label="Descer" onClick={() => move(i, 1)}>
                        ↓
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        aria-label="Remover da playlist"
                        onClick={() => toggle(t)}
                      >
                        ×
                      </Button>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-mist/60">
              Nenhuma faixa na playlist — o player fica oculto no site até escolher faixas.
            </p>
          )}

          <SaveBar pending={pending} notice={notice} onSave={save} />
        </div>
      )}
    </Panel>
  );
}

/* ════════════════ TRAJETÓRIA — marcos ════════════════ */

function MilestonesForm({ initial }: { initial: Milestone[] }) {
  const [draft, setDraft] = useState<Milestone[]>(initial);
  const { save, pending, notice } = useSectionSave("milestones", draft);

  const set = (i: number, patch: Partial<Milestone>) =>
    setDraft((d) => d.map((m, j) => (j === i ? { ...m, ...patch } : m)));

  return (
    <Panel title="Trajetória — marcos">
      <p className="text-sm text-mist">
        Os eventos do “Diário de Bordo” em /universo — cada um entra como evento
        na coluna (era) cujo intervalo de anos o apanha. Ordem = a que aqui está.
      </p>
      <div className="mt-5 space-y-3">
        {draft.map((m, i) => (
          <div key={i} className="rounded-xl border border-white/10 bg-night-950/40 p-3">
            <div className="grid gap-2 sm:grid-cols-[90px_minmax(0,1fr)_auto]">
              <TextInput value={m.year} onChange={(e) => set(i, { year: e.target.value })} placeholder="2025" />
              <TextInput value={m.title} onChange={(e) => set(i, { title: e.target.value })} placeholder="Título do marco" />
              <Button type="button" variant="ghost" aria-label="Remover marco" onClick={() => setDraft((d) => d.filter((_, j) => j !== i))}>
                ×
              </Button>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <TextInput
                value={m.note ?? ""}
                onChange={(e) => set(i, { note: e.target.value })}
                placeholder="Nota curta (opcional)"
              />
              <label className="flex shrink-0 cursor-pointer items-center gap-2 text-xs text-mist">
                <input
                  type="checkbox"
                  checked={m.major ?? false}
                  onChange={(e) => set(i, { major: e.target.checked })}
                  className="h-4 w-4 accent-amber-400"
                />
                Destaque
              </label>
            </div>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="ghost"
        className="mt-3"
        onClick={() => setDraft((d) => [...d, { year: "", title: "" }])}
      >
        + Adicionar marco
      </Button>
      <div className="mt-5">
        <SaveBar pending={pending} notice={notice} onSave={save} />
      </div>
    </Panel>
  );
}

/* ════════════════ CONSTELAÇÃO — colaboradores ════════════════ */

function CollaboratorsForm({ initial }: { initial: Collaborator[] }) {
  const [draft, setDraft] = useState<Collaborator[]>(initial);
  const { save, pending, notice } = useSectionSave("collaborators", draft);

  const set = (i: number, patch: Partial<Collaborator>) =>
    setDraft((d) => d.map((c, j) => (j === i ? { ...c, ...patch } : c)));

  return (
    <Panel title="Constelação — colaboradores">
      <p className="text-sm text-mist">
        As estrelas ligadas ao centro em /universo. Ao clicar numa estrela no site,
        abre o painel com o “projeto em comum”. “Destaque” acende a estrela a âmbar.
      </p>
      <div className="mt-5 space-y-3">
        {draft.map((c, i) => (
          <div key={i} className="rounded-xl border border-white/10 bg-night-950/40 p-3">
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_160px_auto]">
              <TextInput value={c.name} onChange={(e) => set(i, { name: e.target.value })} placeholder="Nome" />
              <TextInput value={c.role} onChange={(e) => set(i, { role: e.target.value })} placeholder="Papel (produção…)" />
              <Button type="button" variant="ghost" aria-label="Remover colaborador" onClick={() => setDraft((d) => d.filter((_, j) => j !== i))}>
                ×
              </Button>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <TextInput
                value={c.project ?? ""}
                onChange={(e) => set(i, { project: e.target.value })}
                placeholder="Projeto em comum (mostrado ao clicar)"
              />
              <label className="flex shrink-0 cursor-pointer items-center gap-2 text-xs text-mist">
                <input
                  type="checkbox"
                  checked={c.hot ?? false}
                  onChange={(e) => set(i, { hot: e.target.checked })}
                  className="h-4 w-4 accent-amber-400"
                />
                Destaque
              </label>
            </div>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="ghost"
        className="mt-3"
        onClick={() => setDraft((d) => [...d, { name: "", role: "" }])}
      >
        + Adicionar colaborador
      </Button>
      <div className="mt-5">
        <SaveBar pending={pending} notice={notice} onSave={save} />
      </div>
    </Panel>
  );
}

/* ════════════════ TRAJETÓRIA — eras do Diário de Bordo ════════════════ */

function ErasForm({ initial }: { initial: Era[] }) {
  const [draft, setDraft] = useState<Era[]>(initial);
  const { save, pending, notice } = useSectionSave("eras", draft);

  const set = (i: number, patch: Partial<Era>) =>
    setDraft((d) => d.map((e, j) => (j === i ? { ...e, ...patch } : e)));

  return (
    <Panel title="Trajetória — eras (colunas)">
      <p className="text-sm text-mist">
        As colunas do “Diário de Bordo” em /universo, por ordem de leitura. Os
        marcos cujo ano cai no intervalo (inclusivo) listam-se como eventos da
        coluna; os que caem fora de todas vão para a última. Deixar “até” vazio
        estende a última era até hoje.
      </p>
      <div className="mt-5 space-y-3">
        {draft.map((e, i) => (
          <div key={i} className="rounded-xl border border-white/10 bg-night-950/40 p-3">
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_86px_86px_auto]">
              <TextInput value={e.phase} onChange={(ev) => set(i, { phase: ev.target.value })} placeholder="Fase (Decolagem…)" />
              <TextInput value={e.from} onChange={(ev) => set(i, { from: ev.target.value })} placeholder="De (2019)" />
              <TextInput value={e.to ?? ""} onChange={(ev) => set(i, { to: ev.target.value || undefined })} placeholder="Até (2021)" />
              <Button type="button" variant="ghost" aria-label="Remover era" onClick={() => setDraft((d) => d.filter((_, j) => j !== i))}>
                ×
              </Button>
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <TextInput value={e.title} onChange={(ev) => set(i, { title: ev.target.value })} placeholder="Título da coluna" />
              <TextInput value={e.note ?? ""} onChange={(ev) => set(i, { note: ev.target.value })} placeholder="Nota de apoio (opcional)" />
            </div>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="ghost"
        className="mt-3"
        onClick={() => setDraft((d) => [...d, { phase: "", from: "", title: "" }])}
      >
        + Adicionar era
      </Button>
      <div className="mt-5">
        <SaveBar pending={pending} notice={notice} onSave={save} />
      </div>
    </Panel>
  );
}

/* ════════════════ página ════════════════ */

export default function UniversoForms({
  releases,
  milestones,
  eras,
  collaborators,
  playerPlaylist,
}: {
  releases: Release[];
  milestones: Milestone[];
  eras: Era[];
  collaborators: Collaborator[];
  playerPlaylist: PlayerTrack[];
}) {
  return (
    <div className="space-y-8">
      <PlayerPlaylistForm curated={playerPlaylist} releases={releases} />
      <ErasForm initial={eras} />
      <MilestonesForm initial={milestones} />
      <CollaboratorsForm initial={collaborators} />
    </div>
  );
}

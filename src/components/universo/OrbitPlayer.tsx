"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { PlayerTrack } from "@/content";

type PlaylistTrack = PlayerTrack & { coverUrl: string | null; src: string };

/** Estado persistido entre refreshes — por TAB (sessionStorage). */
const STORAGE_KEY = "orbit-player:v1";

const trackKey = (t: { releaseTitle: string; title: string }) =>
  `${t.releaseTitle}::${t.title}`;

function writeState(state: { trackKey: string; time: number }) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage indisponível (modo privado…) — o player funciona na mesma */
  }
}

/** Mola da transição encolhido ⇄ expandido. */
const spring = { type: "spring", stiffness: 380, damping: 30 } as const;

/** Capa do disco: URL do lançamento ou planeta procedural. */
const discBackground = (coverUrl: string | null) =>
  coverUrl
    ? `center/cover url(${coverUrl})`
    : "radial-gradient(circle at 34% 28%, #2b3140 0%, #10131c 62%, #080a0f 100%)";

/**
 * PLAYER "EM ÓRBITA" — dois estados com transição fluida (framer-motion):
 *  · ENCOLHIDO (estado inicial ao entrar no site): disco no canto
 *    inferior direito; a girar enquanto a faixa toca;
 *  · EXPANDIDO: pílula completa (capa, título, progresso, transportes),
 *    também ancorada no canto inferior direito;
 *  · no disco encolhido há um mini botão play/pause (é um player à primeira
 *    vista) — clicar na capa expande; o botão "–" minimiza de volta ao canto —
 *    NÃO existe fechar: a música continua nos dois estados (o <audio>
 *    vive fora da troca de estados e nunca desmonta);
 *  · toca os MP3 reais do bucket "audio" (playlist curada no admin);
 *  · sem playlist → não renderiza nada (o site fica limpo);
 *  · faixa sem URL resolvido → marcada como indisponível e saltada;
 *  · autoplay NUNCA (política dos browsers): o utilizador carrega no play;
 *  · faixa e posição persistem em sessionStorage — após um REFRESH retoma
 *    a faixa pausada no ponto onde estava (o play continua manual).
 */
export default function OrbitPlayer({ playlist }: { playlist: PlaylistTrack[] }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0); // 0..1
  const [dur, setDur] = useState(0);
  const [error, setError] = useState(false);
  const [expanded, setExpanded] = useState(false); // false = disco encolhido no canto

  const track = playlist[idx];

  // ── Retomar após refresh (sessionStorage) ──
  // O browser bloqueia autoplay, por isso retomamos a FAIXA e a POSIÇÃO
  // (pausada): o utilizador carrega no play e continua onde estava.
  const resumeRef = useRef(0); // segundos a aplicar quando a duração chegar
  const restoredRef = useRef(false);
  const lastSaveRef = useRef(0); // throttle da escrita no timeupdate

  useEffect(() => {
    if (restoredRef.current || playlist.length === 0) return;
    restoredRef.current = true;
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as { trackKey?: string; time?: number };
      if (!saved || typeof saved.time !== "number" || saved.time <= 0) return;
      // Por IDENTIDADE da faixa (não índice): a playlist pode ter mudado
      // desde o último refresh (admin guardou, faixas reordenadas…).
      const i = playlist.findIndex((t) => trackKey(t) === saved.trackKey);
      if (i < 0) return;
      setIdx(i);
      resumeRef.current = saved.time;
    } catch {
      /* storage indisponível — ignora */
    }
  }, [playlist]);

  // Aplica a posição guardada quando a duração da faixa é conhecida
  // (onDurationChange dispara com o preload="metadata")
  useEffect(() => {
    if (!Number.isFinite(dur) || dur <= 0 || resumeRef.current <= 0) return;
    const el = audioRef.current;
    if (el) {
      try {
        el.currentTime = Math.min(resumeRef.current, Math.max(0, dur - 0.5));
        setPos(el.duration > 0 ? el.currentTime / el.duration : 0);
      } catch {
        /* seek falhou — começa do início */
      }
    }
    resumeRef.current = 0;
  }, [dur, idx]);

  // Rede de segurança do throttle: escreve o estado ao esconder/fechar o tab
  useEffect(() => {
    const onHide = () => {
      const el = audioRef.current;
      const t = playlist[idx];
      if (el && t) writeState({ trackKey: trackKey(t), time: el.currentTime || 0 });
    };
    window.addEventListener("pagehide", onHide);
    return () => window.removeEventListener("pagehide", onHide);
  }, [playlist, idx]);

  // Índice válido quando a playlist muda (admin guardou, revalidate)
  useEffect(() => {
    if (idx >= playlist.length) {
      setIdx(0);
      setPlaying(false);
      setPos(0);
    }
  }, [playlist.length, idx]);

  // Trocar de faixa → parar e repor (o play é sempre manual)
  useEffect(() => {
    setPlaying(false);
    setPos(0);
    setDur(0);
    setError(false);
  }, [idx]);

  const fmt = (s: number) => {
    if (!Number.isFinite(s) || s <= 0) return "0:00";
    const m = Math.floor(s / 60);
    const ss = Math.floor(s % 60);
    return `${m}:${String(ss).padStart(2, "0")}`;
  };

  if (!track) return null;

  const toggle = async () => {
    const el = audioRef.current;
    if (!el) return;
    try {
      if (playing) {
        el.pause();
        setPlaying(false);
      } else {
        setError(false);
        await el.play();
        setPlaying(true);
      }
    } catch {
      setError(true);
      setPlaying(false);
    }
  };

  const skip = (dir: 1 | -1) => {
    if (playlist.length === 0) return;
    setIdx((i) => (i + dir + playlist.length) % playlist.length);
  };

  return (
    // Contexto de posicionamento (altura 0): os dois estados são absolutos
    // e ancorados no MESMO canto — o crossfade lê-se como um só morph.
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50">
      {/* Áudio real — persistente nos dois estados, o src vem do bucket
          "audio" (URL público). Sem controls: display none, nunca bloqueia. */}
      <audio
        ref={audioRef}
        src={track.src}
        preload="metadata"
        onTimeUpdate={(e) => {
          const el = e.currentTarget;
          setPos(el.duration > 0 ? el.currentTime / el.duration : 0);
          // Persistência throttled (~1×/3s): suficiente para retomar depois
          // de um refresh sem escrever no storage 4×/segundo.
          const now = Date.now();
          if (now - lastSaveRef.current > 3000) {
            lastSaveRef.current = now;
            writeState({ trackKey: trackKey(track), time: el.currentTime });
          }
        }}
        onPause={(e) => {
          // Pausa manual → guarda o ponto exato (o throttle podia estar a 3s).
          // el.ended: a faixa terminou — guardar a posição total faria o
          // próximo refresh retomar no fim da faixa, sem sentido.
          const el = e.currentTarget;
          if (el.currentTime > 0 && !el.ended) {
            writeState({ trackKey: trackKey(track), time: el.currentTime });
          }
        }}
        onDurationChange={(e) => setDur(e.currentTarget.duration)}
        onEnded={() => {
          if (playlist.length > 1) skip(1);
          else setPlaying(false);
        }}
        onError={() => {
          setError(true);
          setPlaying(false);
        }}
      />

      <AnimatePresence initial={false}>
        {expanded ? (
          // ── EXPANDIDO: a pílula completa ──
          <motion.div
            key="expanded"
            initial={{ opacity: 0, scale: 0.45 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.45, transition: { duration: 0.16, ease: "easeIn" } }}
            transition={spring}
            style={{ transformOrigin: "100% 100%", borderRadius: 9999 }}
            className="pointer-events-auto absolute bottom-4 right-4 w-[min(560px,calc(100vw-2.25rem))] border border-white/10 bg-night-950/85 p-2.5 shadow-[0_18px_50px_rgba(0,0,0,0.65)] backdrop-blur-md md:bottom-6 md:right-6"
            role="region"
            aria-label="Player Em Órbita"
          >
            {/* Minimizar — pequeno, no canto superior esquerdo: recolhe a
                pílula para o disco no canto; a música NÃO pára. */}
            <button
              type="button"
              onClick={() => setExpanded(false)}
              aria-label="Minimizar player"
              className="absolute -left-1 -top-1 z-10 flex h-5 w-5 items-center justify-center rounded-full border border-white/20 bg-night-950 text-silver-400 transition-colors hover:border-white/50 hover:text-white"
            >
              <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true">
                <path
                  d="M1 4h6"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>

            <div className="flex items-center gap-3.5">
              {/* Disco/capa — a capa do lançamento ou planeta procedural */}
              <div
                className={`relative h-11 w-11 shrink-0 overflow-hidden rounded-full ring-1 ring-white/15 ${playing ? "orbit-disc-spin" : ""}`}
                style={{ background: discBackground(track.coverUrl) }}
                aria-hidden="true"
              >
                {!track.coverUrl && (
                  <span className="absolute inset-[38%] rounded-full border border-white/25 bg-night-950" />
                )}
              </div>

              {/* Título + barra */}
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="truncate text-[13px] font-medium text-white">
                    <span
                      aria-hidden="true"
                      className={`mr-2 inline-block h-1.5 w-1.5 rounded-full align-[1px] ${
                        error ? "bg-red-400/70" : "bg-amber-300 shadow-[0_0_8px_rgba(255,182,94,0.8)]"
                      }`}
                    />
                    {track.title}
                  </p>
                  <p className="shrink-0 font-mono text-[9.5px] tabular-nums text-silver-600">
                    {fmt(pos * dur)} / {fmt(dur)}
                  </p>
                </div>
                <p className="mt-0.5 truncate text-[10px] uppercase tracking-[0.16em] text-mist/70">
                  {error ? "áudio indisponível — a seguir" : track.releaseTitle}
                </p>
                <div
                  className="mt-1.5 h-[3px] cursor-pointer rounded-full bg-white/10"
                  role="slider"
                  aria-label="Progresso da faixa"
                  aria-valuenow={Math.round(pos * 100)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  onClick={(e) => {
                    const el = audioRef.current;
                    if (!el || !Number.isFinite(el.duration)) return;
                    const r = e.currentTarget.getBoundingClientRect();
                    el.currentTime = ((e.clientX - r.left) / r.width) * el.duration;
                  }}
                >
                  <span
                    className="block h-full rounded-full bg-gradient-to-r from-silver-300 to-white"
                    style={{ width: `${Math.min(100, pos * 100)}%` }}
                  />
                </div>
              </div>

              {/* Transportes */}
              {playlist.length > 1 && (
                <button
                  type="button"
                  onClick={() => skip(-1)}
                  aria-label="Faixa anterior"
                  className="shrink-0 rounded-full border border-white/20 p-2 text-silver-300 transition-colors hover:border-white/45 hover:text-white"
                >
                  <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true">
                    <path d="M10 1 L3 6 L10 11 Z M2 1 v10" fill="currentColor" />
                  </svg>
                </button>
              )}
              <button
                type="button"
                onClick={toggle}
                aria-label={playing ? "Pausa" : "Tocar"}
                className="shrink-0 rounded-full bg-white p-2.5 text-night-950 transition-transform hover:scale-105"
              >
                {playing ? (
                  <svg width="11" height="12" viewBox="0 0 10 12" aria-hidden="true">
                    <path d="M1 0h2.6v12H1zM6.4 0H9v12H6.4z" fill="currentColor" />
                  </svg>
                ) : (
                  <svg width="11" height="12" viewBox="0 0 10 12" aria-hidden="true">
                    <path d="M1 0l8 6-8 6z" fill="currentColor" />
                  </svg>
                )}
              </button>
              {playlist.length > 1 && (
                <button
                  type="button"
                  onClick={() => skip(1)}
                  aria-label="Faixa seguinte"
                  className="shrink-0 rounded-full border border-white/20 p-2 text-silver-300 transition-colors hover:border-white/45 hover:text-white"
                >
                  <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true">
                    <path d="M2 1 L9 6 L2 11 Z M10 1 v10" fill="currentColor" />
                  </svg>
                </button>
              )}
            </div>
          </motion.div>
        ) : (
          // ── ENCOLHIDO: disco no canto inferior direito (estado inicial) ──
          // Clicar expande. A girar enquanto a faixa toca (sinal de vida).
          <motion.div
            key="collapsed"
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.4, transition: { duration: 0.16, ease: "easeIn" } }}
            transition={spring}
            whileHover={{ scale: 1.08 }}
            style={{ transformOrigin: "100% 100%" }}
            className="pointer-events-auto absolute bottom-4 right-4 h-14 w-14 md:bottom-6 md:right-6"
          >
            {/* O disco abre o player — um clique em qualquer parte da capa */}
            <button
              type="button"
              onClick={() => setExpanded(true)}
              aria-label={playing ? "Player a tocar — abrir player" : "Abrir player"}
              className="absolute inset-0 rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.55)] ring-1 ring-white/15"
            >
              <span
                aria-hidden="true"
                className={`absolute inset-0 overflow-hidden rounded-full ${playing ? "orbit-disc-spin" : ""}`}
                style={{ background: discBackground(track.coverUrl) }}
              >
                {!track.coverUrl && (
                  <span className="absolute inset-[38%] rounded-full border border-white/25 bg-night-950" />
                )}
              </span>
            </button>
            {/* Play/pause — diz que é player sem o abrir: quem só quer
                silenciar não precisa de expandir para pausar */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                void toggle();
              }}
              aria-label={playing ? "Pausar música" : "Tocar música"}
              className="absolute -bottom-1 -right-1 z-10 flex h-5 w-5 items-center justify-center rounded-full border border-white/25 bg-night-950 text-silver-300 shadow-[0_4px_14px_rgba(0,0,0,0.6)] transition-colors hover:border-white/60 hover:text-white"
            >
              {playing ? (
                <svg width="7" height="8" viewBox="0 0 10 12" aria-hidden="true">
                  <path d="M1 0h2.6v12H1zM6.4 0H9v12H6.4z" fill="currentColor" />
                </svg>
              ) : (
                <svg width="7" height="8" viewBox="0 0 10 12" aria-hidden="true">
                  <path d="M1 0l8 6-8 6z" fill="currentColor" />
                </svg>
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

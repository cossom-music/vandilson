"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { PlayerTrack } from "@/content";

type PlaylistTrack = Omit<PlayerTrack, "coverUrl"> & {
  coverUrl: string | null;
  src: string;
};

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

/** Capa do disco: URL do lançamento/Spotify ou planeta procedural. */
const discBackground = (coverUrl: string | null) =>
  coverUrl
    ? `center/cover url(${coverUrl})`
    : "radial-gradient(circle at 34% 28%, #2b3140 0%, #10131c 62%, #080a0f 100%)";

/** O carregador oficial cria window.onSpotifyIframeApiReady exatamente uma vez. */
declare global {
  interface Window {
    onSpotifyIframeApiReady?: (api: SpotifyIframeApi) => void;
    SpotifyIframeApi?: SpotifyIframeApi;
  }
}
type SpotifyIframeApi = {
  createController: (
    el: HTMLElement,
    opts: { uri?: string },
    cb: (c: SpotifyController) => void,
  ) => void;
};
type SpotifyController = {
  addListener: (ev: string, cb: (payload: unknown) => void) => void;
  loadUri: (uri: string) => void;
  play: () => void;
  pause: () => void;
  seek: (seconds: number) => void;
};

/**
 * PLAYER "EM ÓRBITA" — dois estados com transição fluida (framer-motion):
 *  · ENCOLHIDO (estado inicial ao entrar no site): disco no canto
 *    inferior direito, com mini botão play/pause; a girar enquanto toca;
 *  · EXPANDIDO: pílula completa (capa, título, progresso, transportes),
 *    também ancorada no canto inferior direito;
 *  · REPRODUÇÃO HÍBRIDA:
 *      - MP3 (bucket "audio") → <audio> nativo — faixa completa;
 *      - SPOTIFY (spotifyId) → embed oficial via IFrame API — prévia de
 *        30s para visitantes sem Spotify logado, faixa completa com
 *        sessão; os mesmos controlos (play/pause/seek/±faixa) comandam
 *        o controller do embed.
 *  · clicar na capa expande; o botão "–" minimiza — NÃO existe fechar:
 *    a música continua nos dois estados (nenhum motor de áudio desmonta);
 *  · sem playlist → não renderiza nada (o site fica limpo);
 *  · autoplay só por gesto: na entrada o play é manual; ±faixa e fim de
 *    faixa (MP3 e Spotify) avançam JÁ A TOCAR — o gesto do clique cobre a
 *    política de autoplay dos browsers;
 *  · faixa e posição persistem em sessionStorage — após um REFRESH retoma
 *    a faixa pausada no ponto onde estava (MP3 apenas; Spotify recomeça).
 */
export default function OrbitPlayer({ playlist }: { playlist: PlaylistTrack[] }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const spotifyHostRef = useRef<HTMLDivElement | null>(null);
  const spotifyCtlRef = useRef<SpotifyController | null>(null);
  const [spotifyReady, setSpotifyReady] = useState(false);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0); // 0..1
  const [dur, setDur] = useState(0);
  const [error, setError] = useState(false);
  const [expanded, setExpanded] = useState(false); // false = disco encolhido no canto

  const track = playlist[idx];
  const isSpotify = !!track?.spotifyId;

  // ── Retomar após refresh (sessionStorage) — MP3 apenas ──
  const resumeRef = useRef(0); // segundos a aplicar quando a duração chegar
  const restoredRef = useRef(false);
  const lastSaveRef = useRef(0); // throttle da escrita no timeupdate
  /** true → a faixa seguinte que ficar pronta toca DE IMEDIATO (±faixa/fim). */
  const autoPlayRef = useRef(false);
  /** Guarda anti-duplo-skip no fim de uma faixa Spotify. */
  const spotifyEndedRef = useRef(false);
  /** Timers/RAF do fade de volume em curso (cancelados em cada nova troca). */
  const fadeTimersRef = useRef<number[]>([]);

  const clearFades = () => {
    fadeTimersRef.current.forEach((t) => {
      window.clearTimeout(t);
      window.clearInterval(t);
    });
    fadeTimersRef.current = [];
  };

  /**
   * FADE DE VOLUME entre faixas — trocas suaves, sem “corte”.
   * MP3: volume real (0..1) em passos de interval, descida antes da troca
   * e subida na faixa nova. Spotify: a IFrame API não expõe volume — o
   * corte é imediato (como em todos os players de embed); só MP3 tem fade.
   */
  const fadeOutIn = useCallback(
    (outEl: HTMLAudioElement | null, onSwitched: () => void) => {
      clearFades();
      const steps = 6;
      const stepMs = 55; // ~330ms de descida + ~330ms de subida
      const out = outEl && !outEl.paused ? outEl : null;
      if (!out) {
        onSwitched();
        return;
      }
      const startVol = out.volume;
      let s = 0;
      const down = window.setInterval(() => {
        s += 1;
        try {
          out.volume = Math.max(0, startVol * (1 - s / steps));
        } catch {
          /* volume lançado raramente — ignora */
        }
        if (s >= steps) {
          window.clearInterval(down);
          out.pause();
          out.volume = startVol; // repõe para a próxima vez que tocar
          onSwitched();
          // Subida — MP3 entra suave; para Spotify é no-op (setPlaying já
          // mentiu? não: o playback_update corrige o estado)
          const inEl = audioRef.current;
          let u = 0;
          const up = window.setInterval(() => {
            u += 1;
            if (inEl && !inEl.paused) {
              try {
                inEl.volume = Math.min(1, (u / steps) * startVol);
              } catch {
                /* ignora */
              }
            }
            if (u >= steps) window.clearInterval(up);
          }, stepMs);
          fadeTimersRef.current.push(up);
          autoPlayRef.current = false;
        }
      }, stepMs);
      fadeTimersRef.current.push(down);
    },
    [],
  );

  useEffect(() => {
    if (restoredRef.current || playlist.length === 0) return;
    restoredRef.current = true;
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as { trackKey?: string; time?: number };
      if (!saved || typeof saved.time !== "number" || saved.time <= 0) return;
      const i = playlist.findIndex((t) => trackKey(t) === saved.trackKey);
      if (i < 0) return;
      setIdx(i);
      if (!playlist[i]?.spotifyId) resumeRef.current = saved.time;
    } catch {
      /* storage indisponível — ignora */
    }
  }, [playlist]);

  // Aplica a posição guardada quando a duração da faixa MP3 é conhecida
  useEffect(() => {
    if (isSpotify) return;
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
  }, [dur, idx, isSpotify]);

  // Unmount: nenhum fade a meio da troca de página
  useEffect(() => clearFades, []);

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

  // Trocar de faixa → repor estado (o PLAY da nova faixa é decidido pelo
  // autoPlayRef: ±faixa e fim de faixa tocam de imediato)
  useEffect(() => {
    setPlaying(false);
    setPos(0);
    setDur(0);
    setError(false);
    spotifyEndedRef.current = false;
  }, [idx]);

  // ── IFrame API do Spotify — controller único, carregado a pedido ──
  useEffect(() => {
    if (!isSpotify || spotifyCtlRef.current || !spotifyHostRef.current) return;
    let cancelled = false;
    const boot = (api: SpotifyIframeApi) => {
      if (cancelled || !spotifyHostRef.current) return;
      window.SpotifyIframeApi = api;
      api.createController(
        spotifyHostRef.current,
        { uri: `spotify:track:${track?.spotifyId ?? ""}` },
        (ctl) => {
          if (cancelled) return;
          spotifyCtlRef.current = ctl;
          ctl.addListener("ready", () => {
            setSpotifyReady(true);
            // Skip/fim de faixa pediu autoplay → arranca no 1.º ready
            if (autoPlayRef.current) {
              autoPlayRef.current = false;
              try {
                ctl.play();
                setPlaying(true);
              } catch {
                /* os retries do efeito de faixa cobrem */
              }
            }
          });
          ctl.addListener("playback_update", (payload) => {
            const e = payload as { data?: { position?: number; duration?: number; isPaused?: boolean } };
            const d = e?.data;
            if (!d) return;
            // Estado honesto: o embed confirma pausa/play por si só
            if (typeof d.isPaused === "boolean") setPlaying(!d.isPaused);
            if (typeof d.duration === "number" && d.duration > 0) {
              const position = typeof d.position === "number" ? d.position : 0;
              setDur(d.duration / 1000);
              setPos(position > 0 ? position / d.duration : 0);
              // Fim da faixa Spotify → avança a tocar, como o onEnded do MP3
              if (position >= d.duration - 50 && !spotifyEndedRef.current) {
                spotifyEndedRef.current = true;
                skip(1);
              }
            }
          });
          ctl.addListener("error", () => {
            setError(true);
            setPlaying(false);
          });
        },
      );
    };
    if (window.SpotifyIframeApi) boot(window.SpotifyIframeApi);
    else {
      window.onSpotifyIframeApiReady = boot;
      const s = document.createElement("script");
      s.src = "https://open.spotify.com/embed/iframe-api/v1";
      s.async = true;
      document.head.appendChild(s);
    }
    return () => {
      cancelled = true;
    };
    // Controller criado UMA vez — trocas de faixa vão por loadUri
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSpotify]);

  // Trocar para uma faixa Spotify → carregar o URI no controller.
  // Com autoPlayRef ativo (±faixa clicada), tenta o play assim que o embed
  // responde — o gesto do clique cobre a política de autoplay.
  useEffect(() => {
    const ctl = spotifyCtlRef.current;
    if (!isSpotify || !ctl || !track?.spotifyId) return;
    ctl.loadUri(`spotify:track:${track.spotifyId}`);
    if (!autoPlayRef.current) return;
    const tryPlay = () => {
      if (!autoPlayRef.current) return;
      try {
        ctl.play();
        setPlaying(true);
        autoPlayRef.current = false;
      } catch {
        /* o listener "ready" também consome o autoPlayRef */
      }
    };
    const t1 = window.setTimeout(tryPlay, 350);
    const t2 = window.setTimeout(tryPlay, 1000);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, isSpotify]);

  // MP3: autoPlayRef → a faixa nova toca assim que o elemento aceitar
  // (o src novo chega com o render; 80ms dá o tick do carregamento)
  useEffect(() => {
    if (isSpotify || !autoPlayRef.current) return;
    const el = audioRef.current;
    if (!el) return;
    autoPlayRef.current = false;
    let cancelled = false;
    const start = () => {
      if (cancelled) return;
      el.play()
        .then(() => {
          if (!cancelled) setPlaying(true);
        })
        .catch(() => {
          if (!cancelled) {
            setError(true);
            setPlaying(false);
          }
        });
    };
    const t = window.setTimeout(start, 80);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [idx, isSpotify]);

  const fmt = (s: number) => {
    if (!Number.isFinite(s) || s <= 0) return "0:00";
    const m = Math.floor(s / 60);
    const ss = Math.floor(s % 60);
    return `${m}:${String(ss).padStart(2, "0")}`;
  };

  if (!track) return null;

  const toggle = async () => {
    setError(false);
    if (isSpotify) {
      const ctl = spotifyCtlRef.current;
      if (!ctl || !spotifyReady) return;
      if (playing) {
        ctl.pause();
        setPlaying(false);
      } else {
        ctl.play();
        setPlaying(true);
      }
      return;
    }
    const el = audioRef.current;
    if (!el) return;
    try {
      if (playing) {
        el.pause();
        setPlaying(false);
      } else {
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
    // FADE OUT do motor atual e só então troca — trocas suaves, sem corte.
    // O autoPlayRef continua a autorizar o play imediato da faixa nova.
    fadeOutIn(audioRef.current, () => {
      spotifyCtlRef.current?.pause();
      autoPlayRef.current = true;
      setIdx((i) => (i + dir + playlist.length) % playlist.length);
    });
  };

  const seekTo = (fraction: number) => {
    const f = Math.min(1, Math.max(0, fraction));
    if (isSpotify) {
      const ctl = spotifyCtlRef.current;
      if (ctl && dur > 0) ctl.seek(f * dur);
      return;
    }
    const el = audioRef.current;
    if (el && Number.isFinite(el.duration)) el.currentTime = f * el.duration;
  };

  return (
    // Contexto de posicionamento (altura 0): os dois estados são absolutos
    // e ancorados no MESMO canto — o crossfade lê-se como um só morph.
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50">
      {/* ── Motores de áudio (persistentes nos dois estados) ──
          MP3: <audio> sem controls, nunca visível.
          SPOTIFY: host do embed a 1px sob a pílula — tem de estar "no
          ecrã" para os browsers permitirem play(); opacidade 0.01. */}
      <audio
        ref={audioRef}
        src={isSpotify ? undefined : track.src}
        preload="metadata"
        onTimeUpdate={(e) => {
          const el = e.currentTarget;
          setPos(el.duration > 0 ? el.currentTime / el.duration : 0);
          const now = Date.now();
          if (now - lastSaveRef.current > 3000) {
            lastSaveRef.current = now;
            writeState({ trackKey: trackKey(track), time: el.currentTime });
          }
        }}
        onPause={(e) => {
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
          if (!isSpotify) {
            setError(true);
            setPlaying(false);
          }
        }}
      />
      <div ref={spotifyHostRef} aria-hidden="true" className="h-px w-px overflow-hidden opacity-[0.01]" />

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
              {/* Disco/capa — capa do lançamento, Spotify ou planeta */}
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
                  {error
                    ? "áudio indisponível — a seguir"
                    : isSpotify
                      ? `${track.releaseTitle} · Spotify`
                      : track.releaseTitle}
                </p>
                <div
                  className="mt-1.5 h-[3px] cursor-pointer rounded-full bg-white/10"
                  role="slider"
                  aria-label="Progresso da faixa"
                  aria-valuenow={Math.round(pos * 100)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  onClick={(e) => {
                    const r = e.currentTarget.getBoundingClientRect();
                    seekTo((e.clientX - r.left) / r.width);
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
          // Clicar na capa expande; o mini botão play/pause controla a
          // música sem abrir — diz "sou um player" à primeira vista.
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

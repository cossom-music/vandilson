"use client";

import { useEffect, useRef, useState, type Ref } from "react";

/**
 * O globo em vídeo — idêntico ao referência `model-videos/Earth Spin.mp4`.
 *
 * Versão 6 — correção estrutural do bug "vídeo invisível mas clicável":
 *
 * CAUSA: o `<video>` vivia DENTRO da camada de zoom (`will-change: transform`)
 * JUNTO com o círculo opaco de fallback. Quando o Chrome promove essa camada
 * a layer composta, o vídeo (que tem layer própria) pode ficar z-ordenado
 * ATRÁS do conteúdo opaco da mesma stack — resultado: o vídeo existe, é
 * clicável (o hit-test usa o DOM), mas nunca é pintado. O /teste-globo
 * funcionava porque lá não há camada de zoom nem irmão opaco.
 *
 * CORREÇÃO:
 * - a camada de zoom (recebida via `zoomRef`) contém APENAS o vídeo;
 * - a Terra estática de fallback é um irmão FORA dessa camada, por baixo;
 * - z-index explícito (fallback z-0, vídeo z-10) + `isolate` na raiz tornam
 *   a ordem de composição determinística em qualquer browser;
 * - `style={{ opacity: 1 }}` inline: nada pode manter o vídeo a opacity 0;
 * - play() no ref callback (antes de qualquer effect) + tentativas
 *   persistentes + desbloqueio na primeira interação do utilizador;
 * - badge de diagnóstico apenas em desenvolvimento.
 */
export default function EarthVideo({
  className,
  zoomRef,
}: {
  className?: string;
  /** Ref para a camada que faz zoom no scroll — deve conter SÓ o vídeo. */
  zoomRef?: Ref<HTMLDivElement>;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Ref callback: corre na inserção do nó, ANTES de qualquer useEffect
  const attach = (video: HTMLVideoElement | null) => {
    videoRef.current = video;
    if (!video) return;
    video.muted = true;
    video.defaultMuted = true;
    const p = video.play();
    if (p) p.catch(() => {
      /* autoplay bloqueado — as tentativas abaixo pegam nisto */
    });
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const tryPlay = () => {
      if (!video.paused) return;
      video.muted = true;
      video.play().catch(() => {});
    };

    // Tentativa persistente: a cada 500 ms até 10 s, até estar a reproduzir
    let tries = 0;
    const interval = window.setInterval(() => {
      tries += 1;
      tryPlay();
      if (!video.paused || tries > 20) window.clearInterval(interval);
    }, 500);

    video.addEventListener("loadeddata", tryPlay);
    video.addEventListener("canplay", tryPlay);
    // Se o autoplay for bloqueado, desbloqueia na primeira interação
    const unlock = () => tryPlay();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("wheel", unlock, { once: true });

    return () => {
      window.clearInterval(interval);
      video.removeEventListener("loadeddata", tryPlay);
      video.removeEventListener("canplay", tryPlay);
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("wheel", unlock);
    };
  }, []);

  return (
    <div className={`relative isolate ${className ?? ""}`} aria-hidden="true">
      {/* Fallback ESTÁTICO — fora da camada de zoom, sempre por baixo (z-0).
          Cobre o tempo de carregamento do vídeo; nunca fica vazio. */}
      <div className="absolute inset-0 z-0 flex items-center justify-center bg-[radial-gradient(ellipse_at_center,#0a1428_0%,#030509_70%)]">
        <div className="h-[78vmin] w-[78vmin] rounded-full bg-[radial-gradient(circle_at_34%_30%,#2a4a7a_0%,#16294d_35%,#0a1428_60%,#03060d_100%)] shadow-[0_0_180px_rgba(79,139,255,0.4),inset_-40px_-40px_100px_rgba(0,0,0,0.9)]" />
      </div>

      {/* Camada de zoom — contém APENAS o vídeo (z-10). O GSAP anima esta
          div a partir do HomeHero (via [data-zoom-layer]); dentro dela não
          há conteúdo opaco que possa ser pintado por cima do vídeo. */}
      <div ref={zoomRef} data-zoom-layer className="absolute inset-0 z-10 will-change-transform">
        <video
          ref={attach}
          className="h-full w-full object-cover"
          style={{ opacity: 1 }}
          src="/videos/earth-spin.mp4"
          loop
          muted
          playsInline
          autoPlay
          preload="auto"
        />
      </div>

      <DevVideoBadge videoRef={videoRef} />
    </div>
  );
}

/** Badge de diagnóstico (só em desenvolvimento) — estado real do vídeo em tempo real. */
function DevVideoBadge({ videoRef }: { videoRef: React.RefObject<HTMLVideoElement | null> }) {
  const isDev = process.env.NODE_ENV !== "production";
  const [info, setInfo] = useState("…");

  useEffect(() => {
    if (!isDev) return;
    const tick = () => {
      const v = videoRef.current;
      if (!v) {
        setInfo("vídeo: NÃO MONTADO");
        return;
      }
      const opacity = getComputedStyle(v).opacity;
      const rect = v.getBoundingClientRect();
      setInfo(
        `vídeo: ready=${v.readyState} playing=${!v.paused} ` +
          `${v.videoWidth}x${v.videoHeight} opacity=${opacity} ` +
          `rect=${Math.round(rect.width)}x${Math.round(rect.height)} ` +
          `t=${v.currentTime.toFixed(1)}/${(v.duration || 0).toFixed(1)}s`,
      );
    };
    tick();
    const interval = window.setInterval(tick, 500);
    return () => window.clearInterval(interval);
  }, [isDev, videoRef]);

  if (!isDev) return null;

  return (
    <div
      className="fixed bottom-2 left-2 z-[100] max-w-[95vw] rounded bg-black/80 px-2 py-1 font-mono text-[10px] leading-tight text-lime-300"
      style={{ pointerEvents: "none" }}
    >
      {info}
    </div>
  );
}

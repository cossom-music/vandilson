"use client";

import { useEffect, useRef } from "react";

/**
 * Campo estelar global da homepage — um único canvas fixo atrás de todo o
 * conteúdo, com estrelas que cintilam individualmente e deriva muito lenta.
 *
 * - Subtil por omissão (as secções têm fundos próprios onde importa);
 * - Os "reforços" locais (herói e Sintonia) usam a camada CSS .star-layer;
 * - Sem SSR: as posições são geradas no cliente, por isso não há risco de
 *   desvio de hidratação;
 * - Pausa quando o separador está escondido (visibilitychange) e desativa-se
 *   com prefers-reduced-motion (renderiza um campo estático, sem ticker).
 */
export default function StarField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let stars: { x: number; y: number; r: number; base: number; phase: number; speed: number }[] = [];
    let w = 0;
    let h = 0;
    let raf = 0;
    let running = true;

    // Estrela cadente — ocasional e discreta: nasce no terço superior,
    // atravessa em diagonal com um rasto que desvanece, e volta a "agendar"
    // daqui a 9–22 s. Só desenha quando visível (o herói é o topo da página,
    // por isso a cadente aparece sobretudo quando o utilizador está no topo).
    type Meteor = { x: number; y: number; vx: number; vy: number; life: number; ttl: number };
    let meteor: Meteor | null = null;
    let nextMeteorAt = 4000 + Math.random() * 6000; // 1.ª entre 4–10 s
    let lastT = 0;

    const DPR = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      if (!canvas || !ctx) return;
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * DPR;
      canvas.height = h * DPR;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

      // Densidade moderada — o reforço local nas secções-chave é feito
      // pela camada CSS, não aqui (o canvas global fica discreto).
      const count = Math.round((w * h) / 9000);
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 0.4 + Math.random() * 0.9,
        base: 0.12 + Math.random() * 0.3,
        phase: Math.random() * Math.PI * 2,
        speed: 0.4 + Math.random() * 0.8,
      }));

      if (reduced) draw(0);
    }

    function draw(t: number) {
      if (!ctx) return;
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        // Cintilação individual (fase própria) + deriva vertical lenta
        const tw = reduced ? 1 : 0.75 + 0.25 * Math.sin(s.phase + t * 0.001 * s.speed);
        const drift = reduced ? 0 : ((t * 0.0022 * s.speed + s.phase * 40) % (h + 40)) - 20;
        const y = reduced ? s.y : (s.y + drift) % (h + 40) - 20;
        ctx.globalAlpha = s.base * tw;
        ctx.fillStyle = "#e8ecf2";
        ctx.beginPath();
        ctx.arc(s.x, y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Estrela cadente (só com movimento permitido)
      if (!reduced) {
        const dt = Math.min(t - lastT, 50);
        lastT = t;

        if (!meteor && t > nextMeteorAt && window.scrollY < window.innerHeight * 0.8) {
          // Só nasce com o herói visível — a cadente pertence ao campo do globo,
          // não atravessa as secções de conteúdo.
          const fromLeft = Math.random() > 0.35; // maioria da esquerda p/ direita
          const speed = 0.45 + Math.random() * 0.25; // px/ms
          const angle = (fromLeft ? 18 : 162) * (Math.PI / 180); // diagonal descendente
          meteor = {
            x: fromLeft ? -40 : w + 40,
            y: Math.random() * h * 0.35, // nasce no terço superior
            vx: Math.cos(angle) * speed * (fromLeft ? 1 : -1),
            vy: Math.sin(angle) * speed,
            life: 0,
            ttl: 1400 + Math.random() * 500,
          };
        }

        if (meteor) {
          meteor.life += dt;
          meteor.x += meteor.vx * dt;
          meteor.y += meteor.vy * dt;
          const p = meteor.life / meteor.ttl;
          // Envelope: fade-in rápido, fade-out longo — discreta de ponta a ponta
          const env = p < 0.15 ? p / 0.15 : 1 - (p - 0.15) / 0.85;
          if (p >= 1 || meteor.x < -80 || meteor.x > w + 80 || meteor.y > h) {
            meteor = null;
            nextMeteorAt = t + 9000 + Math.random() * 13000; // 9–22 s depois
          } else {
            const tail = 90;
            const grad = ctx.createLinearGradient(
              meteor.x,
              meteor.y,
              meteor.x - meteor.vx * tail,
              meteor.y - meteor.vy * tail,
            );
            grad.addColorStop(0, `rgba(232,236,242,${(0.75 * env).toFixed(3)})`);
            grad.addColorStop(1, "rgba(232,236,242,0)");
            ctx.globalAlpha = 1;
            ctx.strokeStyle = grad;
            ctx.lineWidth = 1.2;
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.moveTo(meteor.x, meteor.y);
            ctx.lineTo(meteor.x - meteor.vx * tail, meteor.y - meteor.vy * tail);
            ctx.stroke();
            // Cabeça — ponto brilhante com halo minúsculo
            ctx.globalAlpha = env;
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.arc(meteor.x, meteor.y, 1.4, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      ctx.globalAlpha = 1;
    }

    function tick(now: number) {
      if (!running) return;
      draw(now);
      raf = requestAnimationFrame(tick);
    }

    resize();
    window.addEventListener("resize", resize);

    if (!reduced) {
      raf = requestAnimationFrame(tick);
      const onVis = () => {
        running = !document.hidden;
        if (running) raf = requestAnimationFrame(tick);
        else cancelAnimationFrame(raf);
      };
      document.addEventListener("visibilitychange", onVis);
      return () => {
        running = false;
        cancelAnimationFrame(raf);
        window.removeEventListener("resize", resize);
        document.removeEventListener("visibilitychange", onVis);
      };
    }

    return () => {
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0"
    />
  );
}

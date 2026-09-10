/**
 * Camadas decorativas do herói por VARIANTE — as cores extra que cada modelo
 * de teste acrescenta por cima do campo estelar e à volta do globo:
 *
 *   galaxy (A) — nebulosa galáctica + sol quente + lua (ref1)
 *   atmo   (B) — arco atmosférico azul no horizonte + luzes de cidade (ref2)
 *   ember  (C) — sol de fogo + anéis de órbita + planeta anelado (ref3)
 *   dawn   (D) — sol estrelado com flare + limbo a arder (ref4)
 *
 * Tudo é pointer-events-none e vive DE TRÁS do globo (z-0, inserido antes
 * do [data-globe]) — exceto o flare do dawn, que tem de ficar POR CIMA do
 * globo (o sol nasce na frente do limbo) e por isso vive num segundo bloco
 * com z-[15] (entre o globo z-0 e a vinheta z-20).
 *
 * Todas as camadas levam [data-hero-fx]: a timeline do HomeIntro desvanece
 * este grupo JUNTO com o globo no Ato 2 — as cores saem antes da secção de
 * Música chegar, e a transição para o prateado fica garantida por construção.
 */
export default function HeroLayers({
  variant,
}: {
  variant: "galaxy" | "atmo" | "ember" | "dawn";
}) {
  if (variant === "galaxy") {
    return (
      <>
        {/* Nebulosa galáctica — três manchas azul-aço em diagonal (ref1) */}
        <div
          data-hero-fx
          aria-hidden="true"
          className="pointer-events-none absolute -inset-[20%] z-0"
          style={{
            background:
              "radial-gradient(42% 60% at 18% 30%, rgba(39,75,143,0.42), transparent 70%)," +
              "radial-gradient(50% 46% at 82% 62%, rgba(52,84,150,0.32), transparent 72%)," +
              "radial-gradient(38% 34% at 46% 88%, rgba(96,130,190,0.18), transparent 70%)",
            filter: "blur(2px)",
          }}
        />
        {/* Poeira da nebulosa — grãos azulados desfocados */}
        <div
          data-hero-fx
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            background:
              "radial-gradient(2px 2px at 26% 24%, rgba(160,190,240,0.4) 50%, transparent 51%)," +
              "radial-gradient(1.5px 1.5px at 70% 40%, rgba(160,190,240,0.32) 50%, transparent 51%)," +
              "radial-gradient(2px 2px at 40% 58%, rgba(140,175,235,0.26) 50%, transparent 51%)",
            filter: "blur(1px)",
          }}
        />
        {/* Sol quente no canto superior (ref1) */}
        <div
          data-hero-fx
          aria-hidden="true"
          className="pointer-events-none absolute left-[18%] top-[8%] z-0 h-7 w-7 animate-[heroSunPulse_5s_ease-in-out_infinite_alternate] rounded-full"
          style={{
            background:
              "radial-gradient(circle, #fff3d6 0%, #ffe9b8 40%, #ffb347 72%, rgba(255,179,71,0) 100%)",
            boxShadow:
              "0 0 18px 6px rgba(255,220,150,0.85), 0 0 52px 20px rgba(255,190,100,0.45), 0 0 120px 60px rgba(255,170,80,0.2)",
          }}
        />
        <style>{`@keyframes heroSunPulse { from { filter: brightness(0.92); } to { filter: brightness(1.12); } }`}</style>
        {/* Lua pequena (ref1) */}
        <div
          data-hero-fx
          aria-hidden="true"
          className="pointer-events-none absolute left-[60%] top-[36%] z-0 h-4 w-4 rounded-full"
          style={{
            background: "radial-gradient(circle at 38% 34%, #cfd6df 0%, #8a939f 55%, #3d444e 100%)",
            boxShadow: "inset -3px -3px 6px rgba(0,0,0,0.7), 0 0 10px rgba(200,215,235,0.25)",
          }}
        />
      </>
    );
  }

  if (variant === "atmo") {
    return (
      <>
        {/* Arco atmosférico — o limbo azul elétrico a subir do fundo (ref2).
            Vive atrás do globo; a sombra azul do CSS faz o horizonte. */}
        <div
          data-hero-fx
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-[58%] z-0 h-[130vmin] w-[130vmin] -translate-x-1/2 rounded-full"
          style={{
            background:
              "radial-gradient(circle at 50% 12%, rgba(18,35,61,0.85) 0%, rgba(10,21,38,0.9) 34%, rgba(5,11,22,0.95) 60%, #02050c 100%)",
            boxShadow:
              "0 -4px 22px 2px rgba(96,178,255,0.7), 0 -14px 56px 6px rgba(45,120,220,0.4), 0 -36px 140px 30px rgba(25,70,150,0.28)",
          }}
        />
        {/* Luzes de cidade douradas sobre o arco (ref2) — pontinhos quentes */}
        <div
          data-hero-fx
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-[58%] z-0 h-[130vmin] w-[130vmin] -translate-x-1/2 rounded-full"
          style={{
            backgroundImage:
              "radial-gradient(2px 1.5px at 40% 9%, rgba(217,164,65,0.9) 50%, transparent 51%)," +
              "radial-gradient(1.5px 1.5px at 47% 12%, rgba(217,164,65,0.75) 50%, transparent 51%)," +
              "radial-gradient(2.5px 1.5px at 55% 10%, rgba(240,190,90,0.85) 50%, transparent 51%)," +
              "radial-gradient(1.5px 1.5px at 62% 13%, rgba(217,164,65,0.6) 50%, transparent 51%)," +
              "radial-gradient(2px 1.5px at 34% 13%, rgba(217,164,65,0.55) 50%, transparent 51%)," +
              "radial-gradient(1.5px 1.5px at 50% 16%, rgba(240,190,90,0.5) 50%, transparent 51%)",
            filter: "blur(0.4px)",
          }}
        />
      </>
    );
  }

  if (variant === "ember") {
    return (
      <>
        {/* Anéis de órbita subtis à volta do sol (ref3) — eco da Sintonia */}
        <div
          data-hero-fx
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-[42%] z-0 h-[240px] w-[240px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed md:h-[340px] md:w-[340px]"
          style={{ borderColor: "rgba(255,190,120,0.14)" }}
        />
        <div
          data-hero-fx
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-[42%] z-0 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full border md:h-[560px] md:w-[560px]"
          style={{ borderColor: "rgba(255,190,120,0.06)" }}
        />
        {/* Sol de fogo — pequeno, acima do globo (ref3) */}
        <div
          data-hero-fx
          aria-hidden="true"
          className="pointer-events-none absolute left-[24%] top-[13%] z-0 h-9 w-9 animate-[heroSunPulse_4s_ease-in-out_infinite_alternate] rounded-full"
          style={{
            background:
              "radial-gradient(circle at 42% 40%, #fff8e0 0%, #ffd27a 30%, #ff9b30 62%, #c85a12 88%, #7a3408 100%)",
            boxShadow:
              "0 0 16px 5px rgba(255,180,90,0.8), 0 0 60px 22px rgba(255,140,50,0.35), 0 0 160px 80px rgba(220,110,30,0.14)",
          }}
        />
        <style>{`@keyframes heroSunPulse { from { filter: brightness(0.92); } to { filter: brightness(1.12); } }`}</style>
        {/* Planeta anelado em silhueta, canto oposto (ref3) */}
        <div
          data-hero-fx
          aria-hidden="true"
          className="pointer-events-none absolute right-[8%] top-[30%] z-0 h-8 w-8"
        >
          <div
            className="h-full w-full rounded-full"
            style={{
              background: "radial-gradient(circle at 38% 34%, #57493a 0%, #2e251c 60%, #120d09 100%)",
              boxShadow: "0 0 10px rgba(255,180,110,0.15)",
            }}
          />
          <div
            className="absolute left-1/2 top-1/2 h-[64%] w-[210%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border"
            style={{
              transform: "translate(-50%,-50%) rotate(-18deg)",
              borderColor: "rgba(255,195,130,0.35)",
              borderTopColor: "rgba(255,225,180,0.6)",
            }}
          />
        </div>
      </>
    );
  }

  // dawn — o sol estrelado vive POR CIMA do globo (bloco separado, z-[15])
  return (
    <>
      {/* Este bloco só desenha o limbo a arder ATRÁS do globo */}
      <div
        data-hero-fx
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[46%] z-0 h-24 w-[60vmin] -translate-x-1/2"
        style={{
          background: "radial-gradient(50% 100% at 50% 50%, rgba(255,190,110,0.28), transparent 75%)",
          filter: "blur(6px)",
        }}
      />
    </>
  );
}

/** Camada FRONT — só o dawn a usa: o sol + flare sobre o limbo (ref4). */
export function HeroLayersFront({ variant }: { variant: "galaxy" | "atmo" | "ember" | "dawn" }) {
  if (variant !== "dawn") return null;
  return (
    <div data-hero-fx aria-hidden="true" className="pointer-events-none absolute inset-0 z-[15]">
      {/* Sol nascendo sobre o limbo — centro superior do globo */}
      <div
        className="absolute left-1/2 top-[41%] h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background: "radial-gradient(circle, #fffdf4 0%, #ffeec2 45%, #ffc879 75%, rgba(255,180,90,0) 100%)",
          boxShadow:
            "0 0 14px 5px rgba(255,235,180,0.9), 0 0 44px 18px rgba(255,195,110,0.5), 0 0 110px 50px rgba(255,170,80,0.22)",
        }}
      />
      {/* Flare: agulha horizontal + vertical + 2 diagonais fracas */}
      <div
        className="absolute left-1/2 top-[41%] h-px w-[52vmin] -translate-x-1/2 -translate-y-1/2"
        style={{
          background: "linear-gradient(to right, transparent, rgba(255,230,175,0.85), transparent)",
          filter: "blur(0.6px)",
        }}
      />
      <div
        className="absolute left-1/2 top-[41%] h-[34vmin] w-px -translate-x-1/2 -translate-y-1/2"
        style={{
          background: "linear-gradient(to bottom, transparent, rgba(255,230,175,0.8), transparent)",
          filter: "blur(0.6px)",
        }}
      />
      <div
        className="absolute left-1/2 top-[41%] h-px w-[24vmin] -translate-x-1/2 -translate-y-1/2 rotate-45"
        style={{ background: "linear-gradient(to right, transparent, rgba(255,215,150,0.4), transparent)" }}
      />
      <div
        className="absolute left-1/2 top-[41%] h-px w-[24vmin] -translate-x-1/2 -translate-y-1/2 -rotate-45"
        style={{ background: "linear-gradient(to right, transparent, rgba(255,215,150,0.4), transparent)" }}
      />
    </div>
  );
}

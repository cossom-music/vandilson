/**
 * Camadas decorativas do herói por VARIANTE — só o que é FINO (névoa, haze
 * atmosférico, bloom de contacto). O que é corpo vive na cena Three.js
 * (ver EarthScene):
 *
 *   galaxy (A) — nebulosa galáctica + sol quente + lua (ref1)
 *   atmo   (B) — névoa fria + haze azul por cima do limbo elétrico (ref2);
 *                as LUZES DE CIDADE passaram a ser WebGL (CityLights)
 *   ember  (C) — sol de fogo + anéis de órbita + planeta anelado (ref3)
 *   dawn   (D) — bloom do incêndio no contacto (ref4); o SOL ESTRELADO com
 *                flare passou a ser WebGL (StarSun)
 *
 * Tudo é pointer-events-none e vive DE TRÁS do globo (z-0, inserido antes
 * do [data-globe]) — exceto o bloom do amanhecer, que tem de ficar POR CIMA
 * do globo (z-[15], entre o globo z-0 e a vinheta z-20).
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
        {/* HAZE DO CÉU — o tom azul elétrico que sobe do limbo para o espaço.
            O limbo em si é WebGL (AtmosphereLimb); isto é o que assenta por
            cima dele, largo e sem arestas. (ref2) */}
        <div
          data-hero-fx
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[78vmin]"
          style={{
            background:
              "radial-gradient(120% 100% at 50% 112%, rgba(45,120,220,0.24) 0%, rgba(20,60,140,0.11) 42%, transparent 74%)",
          }}
        />
        {/* NÉVOA FRIA — duas manchas sobre a curvatura, uma de cada lado:
            o ar que assenta no hemisfério e que um shader (sem
            post-processing) não desenha. (ref2) */}
        <div
          data-hero-fx
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-[14%] z-0 h-[48vmin]"
          style={{
            background:
              "radial-gradient(58% 100% at 22% 100%, rgba(70,110,180,0.22), transparent 72%)," +
              "radial-gradient(52% 96% at 78% 100%, rgba(126,98,196,0.15), transparent 74%)",
            filter: "blur(12px)",
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

  // dawn — sem véu CSS: a meia-lua de luz (radial 50% 100% at 50% 0%) é
  // ANCORADA à viewport — no zoom fica parada no ecrã, atrás da lua, e lia-se
  // como um brilho a sair do meio da lua até à Terra. Todo o calor do
  // amanhecer já vem do WebGL (AtmosphereGlow + StarSun), que acompanha a
  // câmara.
  return null;
}

/** Camada FRONT — só o dawn a usa: o bloom quente sobre o ponto de contacto.
 *  Os raios do sol são WebGL (StarSun); o que um shader sem post-processing
 *  não faz é esta difusão larga sobre a imagem — e é ela que dá o "véu" da
 *  lente quando o sol nasce no limbo (ref4).
 *  O centro do véu acompanha o disco do sol (logo abaixo da lua, ~58% da
 *  altura) e o gradiente é APERTADO: há muito que este véu descia do meio da
 *  lua até à Terra e lia-se como um feixe. */
export function HeroLayersFront({ variant }: { variant: "galaxy" | "atmo" | "ember" | "dawn" }) {
  if (variant !== "dawn") return null;
  return (
    <div data-hero-fx aria-hidden="true" className="pointer-events-none absolute inset-0 z-[15]">
      <div
        className="absolute left-1/2 top-[58%] h-[34vmin] w-[34vmin] -translate-x-1/2 -translate-y-1/2"
        style={{
          background:
            "radial-gradient(circle, rgba(255,228,186,0.18) 0%, rgba(255,182,94,0.06) 40%, transparent 62%)",
          filter: "blur(6px)",
        }}
      />
    </div>
  );
}

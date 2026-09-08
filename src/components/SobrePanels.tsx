"use client";

import Reveal from "@/components/Reveal";
import { useSiteContent } from "@/components/SiteContentProvider";

/**
 * Painéis "Eclipse" (bio) + "Trânsitos" (agenda) — detalhes de universo
 * na linguagem do site: prata sobre preto, Playfair, grão de pontos.
 * Partilhados entre a página /sobre e a secção final da homepage.
 */
export default function SobrePanels() {
  const { artist, shows } = useSiteContent();
  return (
    <>
      {/* ===== Vinheta — eclipse prateado + biografia ===== */}
      <Reveal>
        <section className="grid overflow-hidden rounded-3xl border border-white/[0.06] bg-[#05070b] md:grid-cols-[5fr_7fr]">
          {/* Painel do eclipse — o retrato real viverá dentro do disco escuro */}
          <div className="relative flex min-h-[320px] items-center justify-center border-b border-white/[0.06] bg-[#03050a] md:min-h-[520px] md:border-b-0 md:border-r">
            {/* Grão de pontos (eco do dot-matrix do globo) */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-35"
              style={{
                backgroundImage:
                  "radial-gradient(rgba(198,202,208,0.05) 1px, transparent 1px)",
                backgroundSize: "5px 5px",
              }}
            />

            {/* O eclipse — disco escuro com limbo prateado rotativo */}
            <div className="eclipse-disc relative aspect-square w-[58%] max-w-[240px]">
              {/* Limbo de luz — mesma luz do limbo do globo e do sol da Sintonia */}
              <div className="eclipse-rim absolute inset-0" />
              {/* Corpo escuro do disco */}
              <div className="absolute inset-[6%] rounded-full bg-[radial-gradient(circle_at_42%_38%,#1c2027_0%,#0a0d12_60%,#05070b_100%)]" />
            </div>

            <p className="absolute bottom-5 left-0 right-0 text-center text-[10px] uppercase tracking-[0.3em] text-silver-600">
              {artist.photoAlt}
            </p>
          </div>

          {/* Texto */}
          <div className="flex flex-col justify-center px-6 py-14 md:px-16">
            <p className="text-[11px] uppercase tracking-[0.45em] text-silver-600">
              Biografia
            </p>
            <h2 className="mt-5 font-display text-4xl leading-[1.15] text-white md:text-[44px]">
              Entre o íntimo{" "}
              <em className="italic text-silver-400">e o infinito</em>
            </h2>
            <div className="mt-6 max-w-[46ch] space-y-4">
              {artist.longBio.map((p, i) => (
                <p key={i} className="text-[15px] leading-[1.8] text-mist">
                  {p}
                </p>
              ))}
            </div>

            {/* Coordenadas — origem / base / órbita, como dados de carta celeste */}
            <div className="mt-10 flex flex-wrap gap-8 font-mono text-[11px] tracking-[0.14em] text-silver-600">
              <div>
                <b className="mb-1 block text-[10px] font-normal uppercase tracking-[0.2em] text-silver-400">
                  Origem
                </b>
                Moçambique
              </div>
              <div>
                <b className="mb-1 block text-[10px] font-normal uppercase tracking-[0.2em] text-silver-400">
                  Base
                </b>
                Lisboa
              </div>
              <div>
                <b className="mb-1 block text-[10px] font-normal uppercase tracking-[0.2em] text-silver-400">
                  Órbita
                </b>
                Mundo
              </div>
            </div>

            <p className="mt-8 font-display text-[15px] italic text-silver-500">
              — «cada disco é uma viagem, e o mundo é o mapa»
            </p>
          </div>
        </section>
      </Reveal>

      {/* ===== Agenda — tabela de trânsitos ===== */}
      <Reveal delay={0.1}>
        <section className="mt-14 rounded-3xl border border-white/[0.06] bg-gradient-to-b from-[#07090d] to-[#04060a] px-6 py-10 md:px-16 md:py-16">
          <div className="flex items-baseline justify-between">
            <h3 className="font-display text-3xl text-white md:text-4xl">Agenda</h3>
            <span className="text-[12px] uppercase tracking-[0.2em] text-silver-500">
              Próximos trânsitos
            </span>
          </div>

          <ul className="mt-8">
            {shows.map((s, i) => (
              <li
                key={`${s.date}-${s.city}`}
                className="grid grid-cols-[1fr_auto] items-center gap-4 border-t border-white/[0.07] py-6 transition-colors md:grid-cols-[170px_1fr_auto_auto] md:py-7"
              >
                {/* Data — monospace, coluna própria no desktop */}
                <span className="hidden font-mono text-[13px] tracking-[0.12em] text-silver-500 md:block">
                  {s.date}
                </span>

                {/* Cidade + local */}
                <div className="md:col-start-2">
                  <p className="font-display text-2xl text-white transition-colors hover:text-silver-400 md:text-3xl">
                    {s.city}
                  </p>
                  <p className="mt-1 text-[13px] text-mist">
                    <span className="font-mono text-[12px] tracking-[0.12em] text-silver-500 md:hidden">
                      {s.date} ·{" "}
                    </span>
                    {s.venue}
                  </p>
                </div>

                {/* Micro-órbita — um "planeta" no anel daquele trânsito */}
                <span
                  aria-hidden="true"
                  className="orbit-mini hidden md:block"
                  style={{ animationDelay: `${-i * 2.5}s` }}
                />

                {/* Estado — pill apenas onde importa */}
                <span
                  className={`rounded-full border px-4 py-2 text-[10px] uppercase tracking-[0.18em] md:px-5 ${
                    s.status === "À venda"
                      ? "border-silver-300/40 text-white"
                      : s.status === "Esgotado"
                        ? "border-red-400/30 text-red-300/80"
                        : "border-white/10 text-mist"
                  }`}
                >
                  {s.status}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </Reveal>
    </>
  );
}

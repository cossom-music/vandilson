import Link from "next/link";
import { getSiteContent } from "@/lib/content-server";

export const metadata = { title: "Painel" };

/**
 * DASHBOARD — «Órbita Editorial» (modelo C de _temp/design-demos/
 * admin-modelos.html): título editorial grande em Playfair, cartões de
 * secção com hover que levanta, glow âmbar no destaque e ponto de estado
 * no canto — a linguagem do site (prata sobre noite) dentro do admin.
 */

// Capacidade do grid — 6 posições para os 5 cartões (1.º pode destacar)
const cards = (data: {
  socials: unknown[];
  contact: { email: string };
  releases: { id?: string; hidden?: boolean }[];
  shows: unknown[];
  playerPlaylist: unknown[];
  milestones: unknown[];
  universoVisible: boolean;
}) => [
  {
    href: "/admin/lancamentos",
    n: "04",
    title: "Lançamentos",
    desc: "Capas, faixas com áudio e ficha técnica de cada disco.",
    meta: `${data.releases.filter((r) => !r.hidden).length} lançamentos`,
    featured: true,
  },
  {
    href: "/admin/universo",
    n: "06",
    title: "Universo",
    desc: "Playlist Em Órbita, Trajetória e Constelação.",
    meta: data.universoVisible
      ? `${data.playerPlaylist.length} faixas · visível`
      : `${data.playerPlaylist.length} faixas · oculta`,
    featured: false,
  },
  {
    href: "/admin/perfil",
    n: "02",
    title: "Perfil & Redes",
    desc: "Nome, biografia, fotografia e redes em órbita.",
    meta: `${data.socials.length} redes`,
    featured: false,
  },
  {
    href: "/admin/agenda",
    n: "05",
    title: "Agenda",
    desc: "Próximos shows e estados de bilheteira.",
    meta: `${data.shows.length} shows`,
    featured: false,
  },
  {
    href: "/admin/textos",
    n: "03",
    title: "Textos da home",
    desc: "Títulos e destaques das secções Ouvir / Sintonia.",
    meta: "Página inicial",
    featured: false,
  },
];

export default async function AdminDashboardPage() {
  const content = await getSiteContent();
  const items = cards({
    socials: content.socials,
    contact: content.contact,
    releases: content.releases,
    shows: content.shows,
    playerPlaylist: content.playerPlaylist,
    milestones: content.milestones,
    universoVisible: content.siteVisibility.universoVisible,
  });

  return (
    <>
      {/* ── HERO editorial (modelo C) ── */}
      <div className="pb-7 pt-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-silver-600">
          Painel · Vandilson Neto
        </p>
        <h1 className="mt-2 font-display text-4xl leading-[1.05] text-cream md:text-5xl">
          O que vamos <em className="italic text-silver-400">editar hoje?</em>
        </h1>
        <p className="mt-3 max-w-lg text-sm text-mist">
          O conteúdo vive no Supabase — cada gravação publica de imediato no
          site. Escolhe um cartão para começar.
        </p>
      </div>

      {/* ── CARTÕES de secção — hover levanta, borda acende ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className={`group relative overflow-hidden rounded-[18px] border bg-night-900/50 p-5 transition-all duration-300 ease-out hover:-translate-y-1 ${
              card.featured
                ? "border-amber-300/40 shadow-[0_0_0_1px_rgba(255,182,94,0.18),0_10px_40px_-14px_rgba(255,182,94,0.18)]"
                : "border-white/[0.09] hover:border-silver-400/30"
            }`}
          >
            {/* halo âmbar do cartão em destaque */}
            {card.featured ? (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[radial-gradient(circle,rgba(255,182,94,0.16),transparent_70%)]"
              />
            ) : null}

            {/* ponto de estado (modelo C) — acende no featured */}
            <span
              aria-hidden="true"
              className={`absolute right-4 top-4 h-[7px] w-[7px] rounded-full border transition-all ${
                card.featured
                  ? "border-amber-400 bg-amber-400 shadow-[0_0_10px_rgba(255,182,94,0.8)]"
                  : "border-white/15 bg-night-600 group-hover:border-silver-400/60"
              }`}
            />

            <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-silver-600">
              {card.n} · secção
            </span>
            <h2 className="mt-2 font-display text-xl text-cream">{card.title}</h2>
            <p className="mt-1.5 text-[13px] leading-relaxed text-mist">{card.desc}</p>
            <p className="mt-3.5 font-mono text-[10px] uppercase tracking-[0.12em] text-silver-600">
              {card.meta}
            </p>
          </Link>
        ))}

        {/* Segurança — mais discreto, fora do ritmo editorial (raro) */}
        <Link
          href="/admin/seguranca"
          className="group relative flex flex-col justify-end rounded-[18px] border border-dashed border-white/10 bg-transparent p-5 text-mist/70 transition-colors hover:border-white/25 hover:text-cream"
        >
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-silver-700">
            07 · sistema
          </span>
          <span className="mt-2 text-sm">Segurança & 2FA</span>
        </Link>
      </div>
    </>
  );
}

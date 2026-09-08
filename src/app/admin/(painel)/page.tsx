import Link from "next/link";
import { getSiteContent } from "@/lib/content-server";

export const metadata = { title: "Painel" };

export default async function AdminDashboardPage() {
  const content = await getSiteContent();

  const cards = [
    {
      href: "/admin/perfil",
      title: "Perfil & Redes",
      desc: "Nome, bio, redes sociais e e-mail de booking.",
      meta: `${content.socials.length} redes · ${content.contact.email}`,
    },
    {
      href: "/admin/lancamentos",
      title: "Lançamentos",
      desc: "Discografia — capa, faixas, curiosidades e ficha técnica.",
      meta: `${content.releases.length} lançamentos`,
    },
    {
      href: "/admin/agenda",
      title: "Agenda",
      desc: "Próximos shows e estados de bilheteira.",
      meta: `${content.shows.length} shows`,
    },
    {
      href: "/admin/textos",
      title: "Textos da home",
      desc: "Títulos e destaques das secções Ouvir / Sintonia.",
      meta: "Secções da página inicial",
    },
  ];

  return (
    <>
      <p className="text-sm text-mist">
        O conteúdo atual é carregado do Supabase (com a seed como base).
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group rounded-2xl border border-white/10 bg-night-900/40 p-6 transition-colors hover:border-silver-500/40"
          >
            <h2 className="font-display text-xl text-cream">{card.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-mist">{card.desc}</p>
            <p className="mt-4 text-[11px] uppercase tracking-[0.14em] text-silver-500">
              {card.meta}
            </p>
          </Link>
        ))}
      </div>
    </>
  );
}

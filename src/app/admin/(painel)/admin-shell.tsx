"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut } from "../actions";
import type { SectionStatus } from "@/lib/admin-status";

/**
 * SHELL DO PAINEL — modelo «Bancada» (aprovado em _temp/design-demos/
 * admin-modelos.html) com dois ajustes pedidos:
 *
 * 1. SIDEBAR COLADA À TELA — o rail é fixed à altura do viewport e o
 *    CONTEÚDO é que faz scroll ao lado. O logo e a navegação nunca saem
 *    do ecrã (antes, as pílulas de navegação rolavam com a página).
 *
 * 2. DRAWER NO MOBILE — < md: o rail esconde-se e um botão de menu
 *    (hamburger → ✕) abre um drawer de ecrã inteiro com ESC/overlay/tap
 *    fora para fechar, no mesmo padrão do menu "Órbita" do site.
 *
 * Estados visíveis por secção: a ativa acende com barra âmbar à esquerda
 * (assinatura «Bancada»), "Ver site ↗" e "Sair" vivem no fundo do rail.
 */

const NAV = [
  { href: "/admin", label: "Visão geral", n: "01" },
  { href: "/admin/perfil", label: "Perfil & Redes", n: "02" },
  { href: "/admin/textos", label: "Textos da home", n: "03" },
  { href: "/admin/lancamentos", label: "Lançamentos", n: "04" },
  { href: "/admin/agenda", label: "Agenda", n: "05" },
  { href: "/admin/universo", label: "Universo", n: "06" },
  { href: "/admin/seguranca", label: "Segurança", n: "07" },
];

export default function AdminShell({
  children,
  statuses,
}: {
  children: React.ReactNode;
  /** Estado por secção (contagens + última edição) — badges do rail. */
  statuses: Map<string, SectionStatus>;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  /* Relative time — «há 5 min» / «há 2 h» / «há 3 dias». Determinístico
     entre SSR e hidratação: arredonda a MINUTOS e só troca a unidade a
     partir de limites redondos, por isso o HTML do servidor e o primeiro
     render do cliente coincidem (evita mismatch de hidratação). */
  const rel = (d: Date | undefined | null) => {
    if (!d) return null;
    const mins = Math.max(1, Math.floor((Date.now() - d.getTime()) / 60_000));
    if (mins < 60) return `há ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 48) return `há ${hours} h`;
    const days = Math.floor(hours / 24);
    return `há ${days} dias`;
  };

  // ESC fecha o drawer e trava o scroll da página enquanto está aberto —
  // mesmo padrão do menu mobile do site (Header.tsx).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Rota mudou (link tocado no drawer) → fecha.
  useEffect(() => setOpen(false), [pathname]);

  // Secção ativa — alimenta o título da topbar.
  const current = NAV.find((item) =>
    item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href),
  );

  const rail = (
    <div className="flex h-full flex-col bg-night-900">
      {/* Marca */}
      <Link
        href="/admin"
        className="block border-b border-white/[0.06] px-6 py-6"
        onClick={() => setOpen(false)}
      >
        <span className="block font-mono text-[10px] uppercase tracking-[0.3em] text-silver-600">
          Painel
        </span>
        <span className="mt-1.5 block font-display text-xl leading-tight text-cream">
          Conteúdo do site
        </span>
      </Link>

      {/* Navegação numerada — a ativa acende com barra âmbar;
          cada secção leva um BADGE de estado: contagem do conteúdo +
          «editado» (âmbar) se houver edição recente, ou «seed» (cinza)
          se a secção nunca foi guardada no admin. */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
        {NAV.map((item) => {
          const active =
            item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
          const st = statuses.get(item.href);
          const edited = Boolean(st?.updatedAt);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                active
                  ? "bg-night-600 text-cream"
                  : "text-silver-600 hover:bg-white/[0.04] hover:text-cream"
              }`}
            >
              {/* barra âmbar da secção ativa (assinatura do modelo B) */}
              <span
                aria-hidden="true"
                className={`absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full transition-all ${
                  active ? "bg-amber-400 opacity-100" : "opacity-0"
                }`}
              />
              <span
                className={`font-mono text-[10px] tracking-widest ${
                  active ? "text-amber-400" : "text-silver-700 group-hover:text-silver-500"
                }`}
              >
                {item.n}
              </span>
              <span className="flex-1 truncate">{item.label}</span>
              {/* Badge de estado — só em secções com conteúdo gerível */}
              {item.href !== "/admin" && item.href !== "/admin/seguranca" ? (
                <span
                  title={
                    edited && st?.updatedAt
                      ? `Última edição ${rel(st.updatedAt)}`
                      : "Ainda guardado apenas na seed"
                  }
                  className={`shrink-0 rounded-full border px-2 py-0.5 font-mono text-[9px] tracking-[0.08em] transition-colors ${
                    edited
                      ? "border-amber-300/40 bg-amber-300/10 text-amber-300"
                      : "border-white/10 text-silver-700"
                  }`}
                >
                  {edited ? "editado" : st?.meta ? st.meta : "seed"}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      {/* Rodapé do rail — ações globais */}
      <div className="border-t border-white/[0.06] p-4">
        <Link
          href="/"
          target="_blank"
          className="mb-1 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-mist transition-colors hover:bg-white/[0.04] hover:text-cream"
          onClick={() => setOpen(false)}
        >
          Ver site ↗
        </Link>
        <form action={signOut}>
          <button
            type="submit"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-mist transition-colors hover:bg-white/[0.04] hover:text-cream"
          >
            Sair
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      {/* ══ TOPBAR — fixed, sempre visível, com o MESMO blur do header público
          (bg-night-950/70 + backdrop-blur-md + border-b). Dá o título da
          secção ativa, o acesso ao site e ao menu (mobile). O conteúdo
          começa ABAIXO dela (md:pt-20) — nada fica escondido por baixo. ══ */}
      <header className="fixed inset-x-0 top-0 z-40 border-b border-white/5 bg-night-950/70 backdrop-blur-md md:pl-64">
        <div className="flex h-16 items-center justify-between gap-4 px-5 md:px-10">
          <div className="flex items-center gap-3">
            {/* Hamburger — só mobile; abre o drawer */}
            <button
              type="button"
              aria-label={open ? "Fechar menu" : "Abrir menu"}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className="flex h-10 w-10 flex-col items-center justify-center gap-1.5 rounded-lg border border-white/10 md:hidden"
            >
              <span
                className={`h-px w-5 bg-cream transition-transform duration-300 ${
                  open ? "translate-y-[3.5px] rotate-45" : ""
                }`}
              />
              <span
                className={`h-px w-5 bg-cream transition-transform duration-300 ${
                  open ? "-translate-y-[3.5px] -rotate-45" : ""
                }`}
              />
            </button>
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-silver-600">
                Painel
              </p>
              <p className="font-display text-lg leading-tight text-cream">
                {current?.label ?? "Conteúdo do site"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              target="_blank"
              className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-mist transition-colors hover:border-white/30 hover:text-cream"
            >
              Ver site ↗
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-mist transition-colors hover:border-white/30 hover:text-cream"
              >
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* ══ MOBILE (< md): drawer alimentado pelo hamburger da topbar ══ */}
      {/* Overlay + drawer — sempre montado, animado por transform/opacity */}
      <div
        aria-hidden={!open}
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-50 bg-night-950/70 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-[55] w-72 max-w-[85vw] border-r border-white/[0.08] shadow-2xl transition-transform duration-300 ease-[cubic-bezier(.22,1,.36,1)] md:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {rail}
      </aside>

      {/* ══ CONTEÚDO — deslocado pelo rail no desktop; é ele que rola.
          pt de 24 (96px) > h-16 da topbar: nada começa por baixo dela. ══ */}
      <div className="md:pl-64">
        <main className="mx-auto w-full max-w-4xl px-5 pb-28 pt-24 md:px-10 md:pt-24">
          {children}
        </main>
      </div>
    </div>
  );
}

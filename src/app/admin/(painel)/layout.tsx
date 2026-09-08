import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/supabase-server";
import { signOut } from "../actions";

const NAV = [
  { href: "/admin", label: "Visão geral" },
  { href: "/admin/perfil", label: "Perfil & Redes" },
  { href: "/admin/textos", label: "Textos da home" },
  { href: "/admin/lancamentos", label: "Lançamentos" },
  { href: "/admin/agenda", label: "Agenda" },
];

export default async function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");

  return (
    <div className="mx-auto w-full max-w-5xl px-6 pb-28 pt-24 md:pt-28">
      {/* Cabeçalho do painel */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-silver-600">Painel</p>
          <h1 className="mt-1 font-display text-3xl text-cream">Conteúdo do site</h1>
          <p className="mt-1 text-sm text-mist">
            As alterações são publicadas de imediato no site.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/"
            target="_blank"
            className="text-sm text-mist transition-colors hover:text-cream"
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

      {/* Navegação */}
      <nav className="mt-6 flex flex-wrap gap-2">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-full border border-white/10 px-4 py-1.5 text-sm text-mist transition-colors hover:border-silver-500/40 hover:text-cream"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <main className="mt-10 space-y-8">{children}</main>
    </div>
  );
}

import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[80svh] flex-col items-center justify-center px-6 text-center">
      <p className="text-xs uppercase tracking-[0.5em] text-gold-400">Erro 404</p>
      <h1 className="mt-4 font-display text-5xl text-cream md:text-6xl">
        Perdeu-se no espaço
      </h1>
      <p className="mt-4 max-w-md text-mist">
        A página que procura saiu da órbita. Volte ao ponto de partida.
      </p>
      <Link
        href="/"
        className="mt-8 rounded-full bg-gold-500 px-8 py-3 text-sm font-medium text-night-950 transition-transform hover:scale-105"
      >
        Voltar ao início
      </Link>
    </div>
  );
}

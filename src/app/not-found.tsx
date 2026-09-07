import LiquidGlassLink from "@/components/ui/LiquidGlassLink";

export default function NotFound() {
  return (
    <div className="flex min-h-[80svh] flex-col items-center justify-center px-6 text-center">
      <p className="text-xs uppercase tracking-[0.5em] text-silver-500">Erro 404</p>
      <h1 className="mt-4 font-display text-5xl text-cream md:text-6xl">
        Perdeu-se no espaço
      </h1>
      <p className="mt-4 max-w-md text-mist">
        A página que procura saiu da órbita. Volte ao ponto de partida.
      </p>
      <LiquidGlassLink href="/" className="mt-8">
        Voltar ao início
      </LiquidGlassLink>
    </div>
  );
}

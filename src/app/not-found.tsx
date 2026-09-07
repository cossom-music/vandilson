import { LiquidGlassLink } from "@/components/ui/LiquidGlass";

/**
 * Entrada suave — a mesma curva fade-up do site (animate-fade-up), com
 * delays escalonados: kicker → título → descrição → botão.
 * O botão é envolvido num wrapper animado para a animação não bloquear
 * o transform do hover do liquid glass.
 * prefers-reduced-motion: a animação é desativada no globals.css.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-[80svh] flex-col items-center justify-center px-6 text-center">
      <p
        className="animate-fade-up text-xs uppercase tracking-[0.5em] text-silver-500"
        style={{ animationDelay: "0.1s" }}
      >
        Erro 404
      </p>
      <h1
        className="animate-fade-up mt-4 font-display text-5xl text-cream md:text-6xl"
        style={{ animationDelay: "0.25s" }}
      >
        Perdeu-se no espaço
      </h1>
      <p
        className="animate-fade-up mt-4 max-w-md text-mist"
        style={{ animationDelay: "0.45s" }}
      >
        A página que procura saiu da órbita. Volte ao ponto de partida.
      </p>
      <div className="animate-fade-up mt-8" style={{ animationDelay: "0.65s" }}>
        <LiquidGlassLink filterId="glass-404-home" href="/">Voltar ao início</LiquidGlassLink>
      </div>
    </div>
  );
}

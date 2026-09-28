"use client";

import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { useEffect, useRef, useState } from "react";

/* ── Inputs ───────────────────────────────────────────────── */

const inputCls =
  "w-full rounded-lg border border-white/10 bg-night-900/70 px-3 py-2 text-sm text-cream " +
  "placeholder:text-silver-700 focus:border-silver-500/50 focus:outline-none " +
  "focus:ring-1 focus:ring-silver-500/30";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.14em] text-silver-500">
        {label}
      </span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-mist/60">{hint}</span> : null}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputCls} ${props.className ?? ""}`} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputCls} ${props.className ?? ""}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`${inputCls} appearance-none ${props.className ?? ""}`}
    />
  );
}

const btnBase =
  "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium " +
  "transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-1 " +
  "focus-visible:ring-silver-400 disabled:opacity-50 disabled:pointer-events-none " +
  "active:translate-y-px active:scale-[0.98]"; // «afunda» ao pressionar — dinâmica modelo B

export function Button({
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger" | "amber";
}) {
  const variantCls =
    variant === "primary"
      ? "bg-silver-300 text-night-950 shadow-[0_3px_14px_-6px_rgba(216,219,224,0.45)] " +
        "hover:bg-white hover:-translate-y-0.5 hover:shadow-[0_8px_22px_-8px_rgba(216,219,224,0.55)]"
      : variant === "danger"
        ? "border border-red-400/30 text-red-300 hover:bg-red-400/10 hover:-translate-y-0.5"
        : variant === "amber"
          ? "border border-amber-300/40 text-amber-300 hover:bg-amber-300/10 " +
            "hover:border-amber-300 hover:-translate-y-0.5 hover:shadow-[0_6px_18px_-8px_rgba(255,182,94,0.35)]"
          : "border border-white/15 text-mist hover:border-white/30 hover:text-cream " +
            "hover:bg-white/[0.05] hover:-translate-y-0.5";
  return <button {...props} className={`${btnBase} ${variantCls} ${props.className ?? ""}`} />;
}

export function Alert({ kind = "ok", children }: { kind?: "ok" | "err"; children: ReactNode }) {
  return (
    <p
      role="status"
      className={`rounded-lg border px-3 py-2 text-sm ${
        kind === "ok"
          ? "border-emerald-400/30 bg-emerald-400/5 text-emerald-300"
          : "border-red-400/30 bg-red-400/5 text-red-300"
      }`}
    >
      {children}
    </p>
  );
}

export function Panel({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-night-900/40 p-6">
      {title ? (
        <h2 className="mb-5 font-display text-xl text-cream">{title}</h2>
      ) : null}
      {children}
    </section>
  );
}

/* ── SAVE BAR — modelo B («Bancada») ────────────────────────
   Barra de guardar FIXA no fundo do ecrã: nunca sai de vista em
   formulários compridos. Ao guardar com sucesso:
   · o botão vira «Guardado ✓» durante ~1.6s;
   · a barra dá um FLASH âmbar (a cor viva da marca) e desvanece.
   Erro: mantém o Alert convencional dentro da barra.
   Reposiciona-se sobre o player Em Órbita (pb-28 do main já dá o
   espaço; a barra vive acima com z-30 < topbar z-40). */
export function SaveBar({
  pending,
  notice,
  onSave,
}: {
  pending: boolean;
  notice: { kind: "ok" | "err"; text: string } | null;
  onSave: () => void;
}) {
  const [flash, setFlash] = useState(false);
  const okSeen = useRef(false);

  // notice passa a ok → um flash e desvanece (reinicia se voltar a guardar)
  useEffect(() => {
    if (notice?.kind === "ok") {
      setFlash(true);
      okSeen.current = true;
      const t = setTimeout(() => setFlash(false), 1600);
      return () => clearTimeout(t);
    }
    if (!notice) okSeen.current = false;
  }, [notice]);

  return (
    <div
      className={`sticky bottom-4 z-30 mt-2 flex flex-wrap items-center gap-3 rounded-2xl border px-4 py-3 backdrop-blur-md transition-all duration-300 ${
        flash
          ? "border-amber-300/50 bg-amber-300/[0.07] shadow-[0_0_0_1px_rgba(255,182,94,0.25),0_0_34px_rgba(255,182,94,0.2)]"
          : "border-white/10 bg-night-900/90 shadow-[0_18px_40px_-18px_rgba(0,0,0,0.9)]"
      }`}
    >
      <Button type="button" onClick={onSave} disabled={pending}>
        {pending ? "A guardar…" : flash ? "Guardado ✓" : "Guardar alterações"}
      </Button>
      {notice ? (
        notice.kind === "err" ? (
          <Alert kind="err">{notice.text}</Alert>
        ) : (
          <span className="text-sm text-emerald-300/90">{notice.text}</span>
        )
      ) : (
        <span className="hidden text-xs text-silver-700 sm:block">
          publica de imediato no site
        </span>
      )}
    </div>
  );
}

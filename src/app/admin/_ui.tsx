"use client";

import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

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
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium " +
  "transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-silver-400 disabled:opacity-50";

export function Button({
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger";
}) {
  const variantCls =
    variant === "primary"
      ? "bg-silver-300 text-night-950 hover:bg-white"
      : variant === "danger"
        ? "border border-red-400/30 text-red-300 hover:bg-red-400/10"
        : "border border-white/15 text-mist hover:border-white/30 hover:text-cream";
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

"use client";

import { useState } from "react";
import { verifyTotpLogin, type ActionResult } from "../actions";
import { Alert, Button, TextInput } from "../_ui";

/** Código TOTP de 6 dígitos — 2.ª etapa do login. */
export default function MfaChallenge() {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res: ActionResult = await verifyTotpLogin(code);
    if (!res.ok) {
      setError(res.error ?? "Código inválido.");
      setBusy(false);
    }
    // ok → a action faz redirect("/admin")
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      {error ? <Alert kind="err">{error}</Alert> : null}
      <TextInput
        value={code}
        onChange={(e) => setCode(e.target.value)}
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        placeholder="000000"
        className="text-center font-mono text-xl tracking-[0.5em]"
        autoFocus
      />
      <Button type="submit" disabled={busy || code.replace(/\D/g, "").length !== 6} className="w-full">
        {busy ? "A verificar…" : "Verificar"}
      </Button>
    </form>
  );
}

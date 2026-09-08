"use client";

import { useActionState } from "react";
import { signIn, type ActionResult } from "../actions";
import { Alert, Button, Field, TextInput } from "../_ui";

export default function LoginForm() {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    async (_prev, formData) => signIn(formData),
    { ok: false },
  );

  return (
    <form action={formAction} className="space-y-5">
      {state.error ? <Alert kind="err">{state.error}</Alert> : null}
      <div className="space-y-4">
        <Field label="E-mail">
          <TextInput
            type="email"
            name="email"
            autoComplete="email"
            required
            placeholder="gestor@vandilsonneto.com"
          />
        </Field>
        <Field label="Palavra-passe">
          <TextInput
            type="password"
            name="password"
            autoComplete="current-password"
            required
            placeholder="••••••••"
          />
        </Field>
      </div>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "A entrar…" : "Entrar"}
      </Button>
    </form>
  );
}

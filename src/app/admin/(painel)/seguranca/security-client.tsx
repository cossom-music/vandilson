"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  enrollTotp,
  confirmTotp,
  disableTotp,
  type ActionResult,
} from "../../actions";
import { Alert, Button, TextInput } from "../../_ui";

type Props = { hasVerified: boolean; aal: string };

export default function SecurityClient({ hasVerified, aal }: Props) {
  const router = useRouter();
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  // Enroll
  const [enroll, setEnroll] = useState<{ factorId: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");

  const startEnroll = async () => {
    setBusy(true);
    setNotice(null);
    const res = await enrollTotp();
    setBusy(false);
    if (!res.ok) {
      setNotice({ kind: "err", text: res.error ?? "Falha ao iniciar 2FA." });
      return;
    }
    setEnroll({ factorId: res.factorId, qr: res.qr, secret: res.secret });
  };

  const confirmEnroll = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!enroll) return;
    setBusy(true);
    setNotice(null);
    const res: ActionResult = await confirmTotp(enroll.factorId, code);
    setBusy(false);
    if (!res.ok) {
      setNotice({ kind: "err", text: res.error ?? "Código inválido." });
      return;
    }
    setNotice({ kind: "ok", text: "2FA ativada — a partir de agora o login pede o código." });
    setEnroll(null);
    setCode("");
    router.refresh();
  };

  const disable = async () => {
    if (!window.confirm("Desativar a 2FA? O login volta a pedir só a password.")) return;
    setBusy(true);
    setNotice(null);
    const res: ActionResult = await disableTotp();
    setBusy(false);
    if (!res.ok) {
      setNotice({ kind: "err", text: res.error ?? "Falha ao desativar." });
      return;
    }
    setNotice({ kind: "ok", text: "2FA desativada." });
    router.refresh();
  };

  return (
    <div className="mt-6 space-y-5">
      {notice ? <Alert kind={notice.kind}>{notice.text}</Alert> : null}

      {/* Estado atual */}
      <div className="rounded-xl border border-white/10 bg-night-950/40 p-4">
        <p className="text-sm">
          Estado:{" "}
          {hasVerified ? (
            <b className="text-emerald-400">Ativa</b>
          ) : (
            <b className="text-amber-300">Inativa</b>
          )}
          {hasVerified && aal === "aal1" ? (
            <span className="ml-2 text-xs text-mist">
              (sessão atual sem confirmação — confirma um código para gerir)
            </span>
          ) : null}
        </p>
      </div>

      {/* Ativação */}
      {!hasVerified ? (
        !enroll ? (
          <Button type="button" onClick={startEnroll} disabled={busy}>
            {busy ? "A preparar…" : "Ativar 2FA"}
          </Button>
        ) : (
          <div className="space-y-4 rounded-xl border border-white/10 bg-night-950/40 p-5">
            <p className="text-sm text-mist">
              1 · Abre a tua app autenticadora e lê este QR:
            </p>
            {/* Imagem QR (data URL do próprio Supabase) */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={enroll.qr}
              alt="QR code para configurar a app autenticadora"
              className="h-48 w-48 rounded-lg bg-white p-2"
            />
            <p className="text-sm text-mist">
              2 · Ou introduz a chave manualmente:{" "}
              <code className="rounded bg-night-800 px-2 py-1 font-mono text-xs text-cream select-all">
                {enroll.secret}
              </code>
            </p>
            <form onSubmit={confirmEnroll} className="space-y-3">
              <p className="text-sm text-mist">3 · Introduz o código de 6 dígitos da app:</p>
              <TextInput
                value={code}
                onChange={(e) => setCode(e.target.value)}
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                className="w-40 text-center font-mono text-lg tracking-[0.4em]"
                autoFocus
              />
              <div className="flex gap-2">
                <Button type="submit" disabled={busy || code.replace(/\D/g, "").length !== 6}>
                  {busy ? "A confirmar…" : "Confirmar e ativar"}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setEnroll(null)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </div>
        )
      ) : (
        <Button type="button" variant="ghost" onClick={disable} disabled={busy}>
          {busy ? "A processar…" : "Desativar 2FA"}
        </Button>
      )}
    </div>
  );
}

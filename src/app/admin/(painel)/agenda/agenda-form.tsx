"use client";

import { startTransition, useState } from "react";
import { updateSection } from "../../actions";
import type { Show } from "@/content";
import { Alert, Button, Field, Panel, Select, TextInput } from "../../_ui";

const STATUSES: Show["status"][] = ["À venda", "Esgotado", "Em breve"];

/** O momento do show já passou? (fim do dia do evento, hora local) */
function isPast(row: Show): boolean {
  if (!row.eventDate) return false;
  const end = new Date(`${row.eventDate}T23:59:59`).getTime();
  return !Number.isNaN(end) && end < Date.now();
}

export function ShowsForm({ initial }: { initial: Show[] }) {
  const [rows, setRows] = useState<Show[]>(initial);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const setRow = (i: number, patch: Partial<Show>) =>
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const addRow = () =>
    setRows((rs) => [
      ...rs,
      { date: "", city: "", venue: "", status: "Em breve", ticketsUrl: "", eventDate: "", eventTime: "" },
    ]);

  const removeRow = (i: number) => setRows((rs) => rs.filter((_, j) => j !== i));

  /** Arquivo/devolve: não apaga — só limpa a eventDate (o que manda o show
   * para dentro/fora da lista "passados"). */
  const toggleArchive = (i: number) => {
    const row = rows[i];
    if (!row) return;
    if (isPast(row)) {
      // Devolver à agenda: limpa a data (o admin re-preenche)
      setRow(i, { eventDate: "" });
    } else {
      // Arquivar já: marca com ontem (sai da agenda no próximo save/render)
      const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
      setRow(i, { eventDate: row.eventDate || yesterday });
    }
  };

  const save = () => {
    setPending(true);
    setNotice(null);
    startTransition(async () => {
      const res = await updateSection("shows", rows);
      setPending(false);
      setNotice(
        res.ok
          ? { kind: "ok", text: "Guardado — o site já está atualizado." }
          : { kind: "err", text: res.error ?? "Erro ao guardar." },
      );
    });
  };

  const past = rows.filter(isPast);
  const upcoming = rows.filter((r) => !isPast(r));

  return (
    <>
      <Panel title="Agenda — próximos shows">
        <p className="-mt-2 mb-5 text-xs leading-relaxed text-mist/70">
          Aparecem na secção final da homepage. Ordem = ordem apresentada. Shows com a
          data do evento no passado passam automaticamente para o Arquivo, abaixo.
        </p>
        <div className="space-y-4">
          {upcoming.length === 0 ? (
            <p className="rounded-xl border border-dashed border-white/15 p-6 text-center text-sm text-mist">
              Sem shows futuros. Adicione um abaixo.
            </p>
          ) : null}
          {rows.map((row, i) =>
            isPast(row) ? null : (
              <div
                key={i}
                className="grid items-end gap-3 rounded-xl border border-white/[0.07] bg-night-950/40 p-4 md:grid-cols-[150px_1fr_1.2fr_130px_auto]"
              >
                <Field label="Data">
                  <TextInput
                    value={row.date}
                    onChange={(e) => setRow(i, { date: e.target.value })}
                    placeholder="12 OUT 2026"
                  />
                </Field>
                <Field label="Cidade">
                  <TextInput value={row.city} onChange={(e) => setRow(i, { city: e.target.value })} />
                </Field>
                <Field label="Local">
                  <TextInput value={row.venue} onChange={(e) => setRow(i, { venue: e.target.value })} />
                </Field>
                <Field label="Estado">
                  <Select value={row.status} onChange={(e) => setRow(i, { status: e.target.value as Show["status"] })}>
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Button type="button" variant="ghost" onClick={() => removeRow(i)} aria-label="Remover show">
                  ×
                </Button>
                <div className="grid gap-3 md:col-span-2 md:grid-cols-[1fr_140px]">
                  <Field
                    label="Data do evento"
                    hint="Passado o momento, o show sai automaticamente da agenda pública. Deixe vazio para nunca sair."
                  >
                    <TextInput
                      type="date"
                      value={row.eventDate ?? ""}
                      onChange={(e) => setRow(i, { eventDate: e.target.value })}
                    />
                  </Field>
                  <Field label="Hora de início">
                    <TextInput
                      type="time"
                      value={row.eventTime ?? ""}
                      onChange={(e) => setRow(i, { eventTime: e.target.value })}
                    />
                  </Field>
                </div>
                <div className="md:col-span-2">
                  <Field
                    label="Link de bilhetes"
                    hint="Aparece no botão “À venda” da agenda. Só usado quando o estado é À venda — nos outros fica guardado mas inativo."
                  >
                    <TextInput
                      value={row.ticketsUrl ?? ""}
                      onChange={(e) => setRow(i, { ticketsUrl: e.target.value })}
                      placeholder="https://bilheteira…"
                      type="url"
                    />
                  </Field>
                </div>
              </div>
            ),
          )}
        </div>
        <Button type="button" variant="ghost" onClick={addRow} className="mt-4">
          + Adicionar show
        </Button>
        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-white/10 pt-5">
          <Button type="button" onClick={save} disabled={pending}>
            {pending ? "A guardar…" : "Guardar alterações"}
          </Button>
          {notice ? <Alert kind={notice.kind}>{notice.text}</Alert> : null}
        </div>
      </Panel>

      {/* ── Arquivo — só visível no admin ── */}
      <Panel title={`Arquivo — shows passados (${past.length})`}>
        <p className="-mt-2 mb-5 text-xs leading-relaxed text-mist/70">
          Histórico dos shows que já aconteceram (com data do evento no passado). Não
          aparecem no site. “Devolver à agenda” limpa a data do evento — o show volta a
          ficar visível para reeditar.
        </p>
        {past.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/15 p-6 text-center text-sm text-mist">
            Sem shows arquivados. Shows com a data do evento no passado aparecem aqui
            automaticamente depois de guardar.
          </p>
        ) : (
          <div className="space-y-3">
            {[...past]
              .sort((a, b) => (a.eventDate ?? "").localeCompare(b.eventDate ?? ""))
              .map((row) => {
                const i = rows.findIndex((r) => r === row);
                return (
                  <div
                    key={`${row.eventDate}-${row.city}-${i}`}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.05] bg-night-950/25 p-4"
                  >
                    <div className="min-w-0">
                      <p className="font-mono text-xs tracking-[0.12em] text-silver-500">
                        {row.eventDate}
                        {row.eventTime ? ` · ${row.eventTime}` : ""}
                      </p>
                      <p className="truncate font-display text-base text-cream">
                        {row.city}
                        {row.venue ? ` — ${row.venue}` : ""}
                      </p>
                      <p className="text-[11px] uppercase tracking-[0.14em] text-silver-700">
                        {row.status}
                        {row.ticketsUrl ? " · com link de bilhetes" : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Button type="button" variant="ghost" onClick={() => toggleArchive(i)}>
                        Devolver à agenda
                      </Button>
                      <Button type="button" variant="danger" onClick={() => removeRow(i)}>
                        Apagar
                      </Button>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-white/10 pt-5">
          <Button type="button" onClick={save} disabled={pending}>
            {pending ? "A guardar…" : "Guardar alterações"}
          </Button>
          <span className="text-xs text-mist/60">
            Aplicar as mudanças do arquivo exige guardar — como em qualquer secção.
          </span>
        </div>
      </Panel>
    </>
  );
}

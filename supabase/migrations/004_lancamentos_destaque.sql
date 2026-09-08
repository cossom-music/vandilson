-- ============================================================
-- 004 — Destaque de lançamentos na homepage ("Ouvir")
-- ============================================================
-- `featured` marca os lançamentos que aparecem na secção Ouvir
-- da homepage. Sem migração destrutiva: default false.
-- Se NENHUM lançamento estiver marcado, a homepage mostra todos
-- (comportamento atual) — nunca fica vazia.
-- ============================================================

alter table public.releases
  add column if not exists featured boolean not null default false;

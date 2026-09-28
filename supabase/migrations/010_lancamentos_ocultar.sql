-- ============================================================
-- 010 — Ocultar lançamento (soft-hide) sem apagar
-- ============================================================
-- `hidden = true` esconde o lançamento de TODO o site público:
--  · /discografia (lista global)
--  · secção Ouvir da homepage
--  · faixas disponíveis para o player Em Órbita
-- O registo e os ficheiros (capa/áudio) continuam na BD e no
-- Storage — o admin mantém-no visível na lista, marcado «Oculto»,
-- e pode mostrá-lo de novo a qualquer momento.
-- ============================================================

alter table public.releases
  add column if not exists hidden boolean not null default false;

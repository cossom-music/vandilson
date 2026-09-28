-- ============================================================
-- 009 — Ordem independente da secção "Ouvir" na homepage
-- ============================================================
-- `position` manda em /discografia (ordem global, drag-and-drop
-- existente). `home_position` dá uma 2.ª ordem só para a homepage:
-- o admin arrasta numa lista dedicada e a secção Ouvir segue-a.
--
-- Regras de leitura (mesma filosofia da 004):
--  · home_position IS NULL → o lançamento segue a ordem global
--    (position) no fim, PRESERVANDO a ordem relativa entre nulos —
--    nunca quebra a página enquanto o admin não curar a lista;
--  · se NENHUM tiver home_position (comportamento default), a
--    homepage mostra exatamente como hoje: ordem global.
-- ============================================================

alter table public.releases
  add column if not exists home_position integer;

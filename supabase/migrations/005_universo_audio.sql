-- ============================================================
-- 005 — /universo: bucket de áudio + acesso às novas secções
-- (milestones / collaborators / playerPlaylist vivem em
--  site_content como JSONB — não precisam de tabelas novas;
--  esta migration cria só o bucket de MP3 e as suas policies.)
-- ============================================================

-- Bucket de áudio do player "Em Órbita" (MP3 públicos)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'audio',
  'audio',
  true,
  52428800, -- 50 MB por faixa
  array['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/aac', 'audio/ogg', 'audio/wav']
)
on conflict (id) do nothing;

-- Leitura das faixas: o player do site lê os MP3 pelo URL PÚBLICO do
-- bucket (/storage/v1/object/public/audio/...) — um bucket público serve
-- ficheiros sem precisar de policies SELECT de anon. A policy SELECT fica
-- restrita a authenticated (gestor): evita o warning "broad SELECT policy"
-- do Supabase (anon a poder LISTAR todo o bucket), sem partir nada no site.
drop policy if exists "ler audio" on storage.objects;
create policy "ler audio"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'audio');

-- Upload/apagar: só o gestor autenticado
drop policy if exists "gestor gere audio" on storage.objects;
create policy "gestor gere audio"
  on storage.objects
  for all
  to authenticated
  using (bucket_id = 'audio')
  with check (bucket_id = 'audio');

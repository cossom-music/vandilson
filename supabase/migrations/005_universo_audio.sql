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

-- Leitura pública das faixas (o player do site lê com a anon key)
drop policy if exists "ler audio" on storage.objects;
create policy "ler audio"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'audio');

-- Upload/apagar: só o gestor autenticado
drop policy if exists "gestor gere audio" on storage.objects;
create policy "gestor gere audio"
  on storage.objects
  for all
  to authenticated
  using (bucket_id = 'audio')
  with check (bucket_id = 'audio');

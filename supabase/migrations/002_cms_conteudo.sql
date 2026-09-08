-- ============================================================
-- CMS — conteúdo editável sem tocar no código
-- (secções 3–6: correr DEPOIS das anteriores, numa 2.ª query)
-- ============================================================

-- 3) Conteúdo "pequeno", uma linha por secção (JSON) ----------
create table if not exists public.site_content (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.site_content enable row level security;

-- Leitura pública (o site lê com a anon key)
drop policy if exists "ler conteudo publico" on public.site_content;
create policy "ler conteudo publico"
  on public.site_content
  for select
  to anon, authenticated
  using (true);

-- Escrita só para utilizadores autenticados do projeto.
-- IMPORTANTE: desative "Allow new users to sign up" em
-- Authentication → Providers → Email, e crie UMA conta (a do gestor)
-- em Authentication → Users → Add user.
drop policy if exists "gestor edita conteudo" on public.site_content;
create policy "gestor edita conteudo"
  on public.site_content
  for all
  to authenticated
  using (true)
  with check (true);

-- 4) Lançamentos (discografia) ---------------------------------
create table if not exists public.releases (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  year text not null,
  type text not null check (type in ('Single', 'EP', 'Álbum')),
  description text,
  cover_path text,              -- nome do objeto em storage (bucket covers)
  tracklist jsonb not null default '[]'::jsonb,
  curiosities jsonb not null default '[]'::jsonb,
  facts jsonb not null default '[]'::jsonb,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_releases_position
  on public.releases (position asc);

-- Evita duplicar lançamentos na seed (idempotente)
create unique index if not exists uq_releases_title_year
  on public.releases (title, year);

alter table public.releases enable row level security;

drop policy if exists "ler lancamentos publicos" on public.releases;
create policy "ler lancamentos publicos"
  on public.releases
  for select
  to anon, authenticated
  using (true);

drop policy if exists "gestor edita lancamentos" on public.releases;
create policy "gestor edita lancamentos"
  on public.releases
  for all
  to authenticated
  using (true)
  with check (true);

-- 5) Bucket de capas (Supabase Storage) ------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'covers',
  'covers',
  true,
  15728640, -- 15 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do nothing;

-- Leitura pública das capas (URLs públicas)
drop policy if exists "ler capas" on storage.objects;
create policy "ler capas"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'covers');

-- Upload/apagar: só o gestor autenticado
drop policy if exists "gestor gere capas" on storage.objects;
create policy "gestor gere capas"
  on storage.objects
  for all
  to authenticated
  using (bucket_id = 'covers')
  with check (bucket_id = 'covers');

-- 6) Seed — conteúdo inicial (espelho de src/content.ts) --------
-- Idempotente: voltar a correr não duplica nada.
insert into public.site_content (key, value) values
('artist', '{
  "name": "Vandilson Neto",
  "firstName": "Vandilson",
  "lastName": "Neto",
  "tagline": "Músicas que atravessam o mundo.",
  "shortBio": "Vandilson Neto é um artista que transforma histórias em canções — entre o íntimo e o infinito, a sua música viaja do acústico ao eletrónico com uma honestidade rara.",
  "longBio": [
    "Vandilson Neto começou a escrever canções como quem escreve cartas — com urgência, verdade e a certeza de que alguém, algures, as precisa de ouvir. O seu som vive entre o popular e o experimental, com letras que falam de saudade, cidade, amor e partida.",
    "Dos palcos pequenos aos festivais, a sua carreira tem sido construída canção a canção, sempre com o pé na terra e os olhos no horizonte. Cada disco é uma viagem — e o mundo, como o globo que gira no site, é o mapa.",
    "Este é um texto de exemplo (placeholder). Substitua por uma biografia real no painel /admin."
  ],
  "photoAlt": "Fotografia de Vandilson Neto (placeholder)"
}'::jsonb),
('socials', '[
  { "label": "Instagram", "handle": "@vandilsonneto", "url": "https://instagram.com/vandilsonneto" },
  { "label": "YouTube", "handle": "@vandilsonneto", "url": "https://youtube.com/@vandilsonneto" },
  { "label": "Spotify", "handle": "Vandilson Neto", "url": "https://open.spotify.com/artist/vandilsonneto" },
  { "label": "Apple Music", "handle": "Vandilson Neto", "url": "https://music.apple.com/artist/vandilsonneto" }
]'::jsonb),
('contact', '{ "email": "booking@vandilsonneto.com" }'::jsonb),
('homeSections', '{
  "music": { "eyebrow": "Ouvir", "title": "Discografia", "cta": "Explorar toda a discografia" },
  "contact": { "eyebrow": "Sintonia", "title": "Onde a música vive" }
}'::jsonb),
('homeHighlights', '{
  "latest": {
    "label": "Último lançamento",
    "title": "Horizonte Infinito",
    "description": "O novo single já está disponível em todas as plataformas. Ouça, partilhe e deixe-se levar pelo horizonte."
  },
  "listenCta": "Ouvir agora",
  "bioTeaser": "Vandilson Neto é um artista que transforma histórias em canções — entre o íntimo e o infinito, a sua música viaja do acústico ao eletrónico com uma honestidade rara."
}'::jsonb),
('shows', '[
  { "date": "12 OUT 2026", "city": "Lisboa", "venue": "Grande Sala (placeholder)", "status": "À venda" },
  { "date": "25 OUT 2026", "city": "Porto", "venue": "Teatro (placeholder)", "status": "À venda" },
  { "date": "08 NOV 2026", "city": "São Paulo", "venue": "Casa de shows (placeholder)", "status": "Em breve" }
]'::jsonb)
on conflict (key) do nothing;

insert into public.releases (title, year, type, description, tracklist, curiosities, facts, position) values
('Horizonte Infinito', '2026', 'Single',
 'O novo single já está disponível em todas as plataformas. Ouça, partilhe e deixe-se levar pelo horizonte.',
 '[{ "title": "Horizonte Infinito", "duration": "3:42" },
  { "title": "Horizonte Infinito — versão acústica", "duration": "3:58" },
  { "title": "Horizonte Infinito — instrumental", "duration": "3:40" }]'::jsonb,
 '["Gravado numa só tarde, entre a maré baixa e o primeiro comboio.",
  "O título nasceu de um mapa antigo comprado num mercado de pulgas em Lisboa."]'::jsonb,
 '[{ "label": "Lançamento", "value": "2026 · Single" },
  { "label": "Faixas", "value": "3" },
  { "label": "Duração", "value": "11:40" },
  { "label": "Produção", "value": "A confirmar" }]'::jsonb,
 0),
('Cartas ao Mundo', '2025', 'EP',
 'Cinco canções-carta, escritas para sítios onde o artista nunca esteve — mas sentiu.',
 '[{ "title": "Primeira carta" },
  { "title": "Selo e endereço" },
  { "title": "Maré postal" },
  { "title": "Água-rasada" },
  { "title": "Última resposta", "duration": "4:05" }]'::jsonb,
 '["Cada faixa tem o nome de um porto imaginário."]'::jsonb,
 '[{ "label": "Lançamento", "value": "2025 · EP" },
  { "label": "Faixas", "value": "5" }]'::jsonb,
 1),
('Gravidade', '2024', 'Álbum',
 'O álbum que puxou tudo para junto — doze canções sobre o que nos prende e o que nos deixa partir.',
 '[]'::jsonb,
 '[]'::jsonb,
 '[{ "label": "Lançamento", "value": "2024 · Álbum" },
  { "label": "Faixas", "value": "12" }]'::jsonb,
 2),
('Primeiro Voo', '2022', 'Álbum',
 'O primeiro disco — gravado com o que havia, como pôde, e é por isso que soa tão verdadeiro.',
 '[]'::jsonb,
 '[]'::jsonb,
 '[{ "label": "Lançamento", "value": "2022 · Álbum" },
  { "label": "Faixas", "value": "10" }]'::jsonb,
 3)
on conflict (title, year) do nothing;

-- trigger simples: updated_at em releases
create or replace function public.touch_releases() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_releases_touch on public.releases;
create trigger trg_releases_touch
  before update on public.releases
  for each row execute function public.touch_releases();

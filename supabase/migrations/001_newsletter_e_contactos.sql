-- ============================================================
-- Vandilson Neto — schema Supabase
-- Executar em: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- 1) Subscritores da newsletter --------------------------------
create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  created_at timestamptz not null default now()
);

alter table public.newsletter_subscribers enable row level security;

drop policy if exists " anyone pode subscrever" on public.newsletter_subscribers;
create policy "qualquer pessoa pode subscrever"
  on public.newsletter_subscribers
  for insert
  to anon
  with check (true);

-- 2) Mensagens de contacto / booking ---------------------------
create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  category text not null default 'Geral',
  message text not null,
  created_at timestamptz not null default now()
);

alter table public.contact_messages enable row level security;

drop policy if exists "qualquer pessoa pode enviar mensagem" on public.contact_messages;
create policy "qualquer pessoa pode enviar mensagem"
  on public.contact_messages
  for insert
  to anon
  with check (true);

-- Índices úteis
create index if not exists idx_contact_messages_created_at
  on public.contact_messages (created_at desc);


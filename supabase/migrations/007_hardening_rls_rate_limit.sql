-- ============================================================
-- 007 — Hardening RLS + rate limiting do login
-- ============================================================
-- Fecha o ALTO 3 (qualquer utilizador `authenticated` podia escrever
-- tudo: qualquer conta criada por self-signup ficava "gestor") e cria
-- a infraestrutura de BD do ALTO 4 (rate limiting do login).
--
-- ⚠️ ANTES DE APLICAR:
--   1. Obter o UUID do admin real:
--        select id, email from auth.users where email = 'baptistalimab@gmail.com';
--   2. Substituir TODOS os '<UUID-DO-ADMIN>' abaixo pelo valor real.
--   3. No Dashboard: Authentication → Providers → Email →
--      DESLIGAR "Enable signups" (impede self-signup a partir da
--      anon key; as policies deixam de ser a última linha de defesa).
--
-- Idempotente: drop + create de policies e funções.
-- ============================================================

-- pgcrypto primeiro: hash_ip abaixo usa digest()
create extension if not exists pgcrypto;

-- ── Helper: o utilizador atual é O admin do site ──────────────
-- security definer: a função lê auth.users sem policy própria.
create or replace function public.is_site_admin()
returns boolean
language sql
stable
security definer
set search_path = auth, public
as $$
  select exists (
    select 1 from auth.users
    where id = auth.uid()
      and email = 'baptistalimab@gmail.com'
  );
$$;

-- ============================================================
-- 1) site_content — leitura pública; escrita SÓ do admin
-- ============================================================
drop policy if exists "gestor edita conteudo" on public.site_content;
create policy "gestor edita conteudo"
  on public.site_content
  for all
  to authenticated
  using (public.is_site_admin())
  with check (public.is_site_admin());

-- ============================================================
-- 2) releases — idem
-- ============================================================
drop policy if exists "gestor edita lancamentos" on public.releases;
create policy "gestor edita lancamentos"
  on public.releases
  for all
  to authenticated
  using (public.is_site_admin())
  with check (public.is_site_admin());

-- ============================================================
-- 3) Storage — covers e audio: escrita SÓ do admin
-- ============================================================
drop policy if exists "gestor gere capas" on storage.objects;
create policy "gestor gere capas"
  on storage.objects
  for all
  to authenticated
  using (bucket_id = 'covers' and public.is_site_admin())
  with check (bucket_id = 'covers' and public.is_site_admin());

drop policy if exists "gestor gere audio" on storage.objects;
create policy "gestor gere audio"
  on storage.objects
  for all
  to authenticated
  using (bucket_id = 'audio' and public.is_site_admin())
  with check (bucket_id = 'audio' and public.is_site_admin());

-- ============================================================
-- 4) Rate limiting do login — tabela de tentativas
-- ============================================================
-- Uma linha por tentativa (sucesso ou falha). A janela é avaliada
-- em SQL: COUNT das tentativas falhadas nos últimos 15 min por
-- email+IP. Registo consultável para detetar força bruta (secção F
-- do protocolo de segurança).
create table if not exists public.login_attempts (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  ip_hash text not null,          -- hash SHA-256 do IP (não guardar IP em claro)
  success boolean not null,
  created_at timestamptz not null default now()
);

-- Índice para a consulta de janela (email + janela temporal)
create index if not exists idx_login_attempts_window
  on public.login_attempts (email, created_at desc);

create index if not exists idx_login_attempts_created
  on public.login_attempts (created_at desc);

-- RLS: ninguém (nem anon, nem authenticated) lê/escreve diretamente —
-- só as SECURITY DEFINER functions abaixo tocam na tabela.
alter table public.login_attempts enable row level security;

-- Limpeza: tentativas com mais de 30 dias podem ser apagadas
-- (chamar de um pg_cron se disponível; sem cron, a função de registo
-- apaga registos antigos on-demand a cada chamada).
create or replace function public.cleanup_login_attempts()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.login_attempts where created_at < now() - interval '30 days';
$$;

-- ── Registar tentativa (chamada pela server action de login) ──
-- p_email: email tentado; p_ip_hash: sha256 do IP; p_success: resultado.
create or replace function public.record_login_attempt(
  p_email text,
  p_ip_hash text,
  p_success boolean
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.login_attempts (email, ip_hash, success)
  values (lower(p_email), p_ip_hash, p_success);
  select public.cleanup_login_attempts();
$$;

-- ── Consultar limite: true = bloqueado (excedeu) ──────────────
-- Janela: 15 minutos. Máximo: 5 falhas por email+IP.
create or replace function public.is_login_blocked(
  p_email text,
  p_ip_hash text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select count(*) >= 5
  from public.login_attempts
  where lower(p_email) = email
    and ip_hash = p_ip_hash
    and success = false
    and created_at > now() - interval '15 minutes';
$$;

-- ── Hash estável do IP (não guardar IP em claro — LGPD/GDPR) ──
create or replace function public.hash_ip(p_ip text)
returns text
language sql
immutable
as $$
  select encode(extensions.digest(p_ip, 'sha256'), 'hex');
$$;

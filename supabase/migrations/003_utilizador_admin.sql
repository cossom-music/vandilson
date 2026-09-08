-- ============================================================
-- 003 — Utilizador admin (acesso ao painel /admin)
-- ============================================================
-- Cria a conta do gestor em auth.users + auth.identities (login
-- e-mail/password). A password fica em claro NESTE ficheiro:
-- depois de aplicar, altere-a no Dashboard
-- (Authentication → Users → o utilizador → Reset password / Update).
-- Idempotente: se o e-mail já existir, não faz nada.
-- ============================================================

with new_user as (
  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  )
  select
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'baptistalimab@gmail.com',
    extensions.crypt('tDCTRn9k!u3Tmx5?F!Wku5', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now()
  where not exists (
    select 1 from auth.users where email = 'baptistalimab@gmail.com'
  )
  on conflict (email) do nothing
  returning id
)
insert into auth.identities (
  id,
  user_id,
  provider_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
select
  gen_random_uuid(),
  new_user.id,
  new_user.id,
  jsonb_build_object('sub', new_user.id::text, 'email', 'baptistalimab@gmail.com'),
  'email',
  now(),
  now(),
  now()
from new_user;

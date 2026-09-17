-- ============================================================
-- 008 — 2FA TOTP: exige AAL2 nas policies quando 2FA ativa
-- ============================================================
-- Reforça o is_site_admin() (migration 007): quando o admin tem um fator
-- TOTP VERIFICADO, as operações de escrita só passam com sessão AAL2
-- (password + código 2FA). Sem nenhum fator verificado → passa (fail-open
-- APENAS para permitir o 1.º enroll a partir de /admin/seguranca).
--
-- Complemento do gate no layout do painel: aqui é a camada final — mesmo
-- que o frontend falhe, a BD recusa escritas AAL1 de quem tem 2FA ativa.
--
-- Nota: 007 já referencia o gestor por E-MAIL (sem UUID a substituir).
-- ============================================================

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
  )
  and (
    -- Sem fator TOTP verificado: permite (cenário do 1.º enroll)
    not exists (
      select 1 from auth.mfa_factors
      where user_id = auth.uid()
        and status = 'verified'
    )
    -- Com 2FA ativa: exige sessão AAL2 (código TOTP confirmado)
    or coalesce(nullif(auth.jwt() ->> 'aal', ''), 'aal1') = 'aal2'
  );
$$;

comment on function public.is_site_admin() is
  'Admin do site OU admin com 2FA ativa exige sessao AAL2 (TOTP confirmado)';

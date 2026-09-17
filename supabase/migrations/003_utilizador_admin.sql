-- ============================================================
-- 003 — Utilizador admin (acesso ao painel /admin)
-- ============================================================
-- ⚠️  SEGURANÇA — LEIA ANTES DE APLICAR
-- NUNCA guardar passwords em texto plano em migrations versionadas:
-- ficam no histórico do git para sempre — qualquer leak do repo
-- expõe o painel /admin.
--
-- CRIAÇÃO CORRETA DO ADMIN: Supabase Dashboard →
--   Authentication → Users → "Add user" → "Create new user"
--   (cria a conta com password provisória; o utilizador muda depois
--   em Authentication → Users → … → "Send password recovery" ou
--   "Update password").
--
-- A versão ORIGINAL deste ficheiro criava o admin via SQL com a
-- password em claro. As credenciais foram REMOVIDAS e a password
-- desse admin TEM de ser rodada no Dashboard (ver relatório de
-- auditoria de segurança, CRÍTICO 1).
--
-- Este ficheiro mantém-se apenas como documentação do passo — não
-- executa qualquer INSERT (idempotente por construção).
-- ============================================================

DO $$
DECLARE
  admin_email constant text := 'baptistalimab@gmail.com'; -- referência do gestor
BEGIN
  RAISE NOTICE 'Criação/gestão do admin é feita no Dashboard (Auth → Users).';
  RAISE NOTICE 'E-mail de referência do gestor: %', admin_email;
END $$;

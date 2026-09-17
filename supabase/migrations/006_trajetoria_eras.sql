-- ============================================================
-- 006 — Trajetória: seed da secção "eras" (Diário de Bordo)
-- As eras vivem em site_content como JSONB (igual a milestones,
-- collaborators, playerPlaylist — não precisam de tabela nova).
-- Esta migration semeia as eras de exemplo para quem já tem a
-- tabela criada; instalações novas recebem a seed do código
-- (content.ts) quando a secção ainda não existe no Supabase.
-- Guardar no admin substitui o valor por completo (upsert).
-- ============================================================

insert into site_content (key, value, updated_at)
values (
  'eras',
  '[
    {
      "phase": "Decolagem",
      "from": "2019",
      "to": "2021",
      "title": "A origem",
      "note": "Onde a rota começou — casa, Maputo."
    },
    {
      "phase": "Trânsito",
      "from": "2022",
      "to": "2023",
      "title": "O voo",
      "note": "Entre mundos, com escala em estúdios alheios."
    },
    {
      "phase": "Órbita alta",
      "from": "2024",
      "title": "O presente",
      "note": "A trajetória continua a subir."
    }
  ]'::jsonb,
  now()
)
on conflict (key) do nothing;

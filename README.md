# Vandilson Neto — Site Oficial 🌍

Website oficial do artista **Vandilson Neto** — Next.js 15, React 19, Tailwind CSS 4,
Three.js (globo 3D da Terra), GSAP, Framer Motion e Supabase.

## Páginas

| Rota | Descrição |
| --- | --- |
| `/` | Hero com globo 3D + nome do artista, último lançamento, bio teaser |
| `/musica` | Discografia + links para plataformas |
| `/sobre` | Biografia, foto e próximos shows |
| `/contactos` | Formulário de booking/contactos → Supabase |

## Arrancar em desenvolvimento

```bash
npm install
npm run dev
```

Abre http://localhost:3000.

## Configurar o Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Abra o **SQL Editor** e cole o conteúdo de [`supabase/schema.sql`](supabase/schema.sql) → **Run**.
3. Copie **Project Settings → API → URL** e **anon public key**.
4. Crie `.env.local` (copie de `.env.example`) e preencha:

```
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=SEU_ANON_KEY
```

Sem estas variáveis o site funciona na mesma — os formulários mostram um aviso.

## Deploy na Vercel

1. Faça push deste repositório para o GitHub (`cossom-music/vandilson`).
2. Em [vercel.com](https://vercel.com) → **Add New → Project** → importe o repo.
3. Em **Environment Variables**, adicione as duas variáveis acima.
4. **Deploy** — feito. 🚀

## Trocar o conteúdo (placeholders → real)

Todo o texto, links e dados vivem num único ficheiro: **`src/content.ts`**.
Substitua bio, links do Spotify/YouTube/Instagram, datas de shows e lançamentos aí —
os componentes atualizam-se automaticamente.

As texturas do planeta estão em `public/textures/` (NASA Blue Marble, domínio público).

## Tecnologias

- Next.js 15 (App Router) + TypeScript + Tailwind CSS 4
- Three.js + @react-three/fiber + @react-three/drei — globo, nuvens, atmosfera, estrelas
- GSAP + ScrollTrigger — reveals e parallax do hero
- Framer Motion — micro-interações e transições
- Supabase — newsletter + mensagens de contacto

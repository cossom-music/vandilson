# Vandilson Neto — Site Oficial 🌍

Website oficial do artista **Vandilson Neto** — Next.js 15, React 19, Tailwind CSS 4,
vídeo do globo da Terra, GSAP, anime.js, Framer Motion e Supabase.

## Páginas

| Rota | Descrição |
| --- | --- |
| `/` | Herói imersivo com o globo em vídeo (zoom no scroll) → secções Música e Contacto |
| `/musica` | Discografia + links para plataformas |
| `/sobre` | Biografia, foto e próximos shows |
| `/contactos` | Formulário de booking/contactos → Supabase |
| `/teste-globo` | Página de diagnóstico do globo (pode ser removida) |

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

O vídeo do globo vive em `public/videos/earth-spin.mp4` (referência: `model-videos/Earth Spin.mp4`).
Para trocar, basta substituir o ficheiro — o componente `src/components/earth/EarthVideo.tsx` trata do resto.

## Tecnologias

- Next.js 15 (App Router) + TypeScript + Tailwind CSS 4
- Vídeo do globo da Terra (`EarthVideo.tsx`) — loop, autoplay, fallback estático embutido
- GSAP + ScrollTrigger — zoom do herói no scroll e fade para as secções
- anime.js v4 — reveals de texto palavra a palavra
- Framer Motion — micro-interações e transições (header, menu móvel)
- Supabase — newsletter + mensagens de contacto

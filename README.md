# Vandilson Neto — Site Oficial 🌍

Website oficial do artista **Vandilson Neto** — Next.js 15, React 19, Tailwind CSS 4,
vídeo do globo da Terra, GSAP, anime.js, Framer Motion e Supabase.

## Páginas

| Rota | Descrição |
| --- | --- |
| `/` | Herói imersivo com o globo em vídeo (zoom no scroll) → secções Música e Contacto |
| `/discografia` | Discografia + links para plataformas |
| `/admin` | Painel CMS (login) — editar conteúdo sem tocar no código |
| `/api/content` | Conteúdo em JSON (usado para refresh sem recarregar) |

## Arrancar em desenvolvimento

```bash
npm install
npm run dev
```

Abre http://localhost:3000.

## Configurar o Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Abra o **SQL Editor** e corra as migrações de
   [`supabase/migrations`](supabase/migrations) por ordem (`001_…`, `002_…`)
   → **Run**. São idempotentes (podem voltar a correr). A `002_…` cria o
   CMS: tabelas `site_content` e `releases`, o bucket de capas `covers` e a
   seed com o conteúdo inicial.
3. Copie **Project Settings → API → URL** e **anon public key**.
4. Crie `.env.local` (copie de `.env.example`) e preencha:

```
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=SEU_ANON_KEY
```

Sem estas variáveis o site funciona na mesma — com o conteúdo *seed* de
`src/content.ts` e os formulários mostram um aviso.

### Criar o utilizador do admin

1. No Dashboard: **Authentication → Providers → Email** — desative
   **Allow new users to sign up** (o acesso é só do gestor).
2. **Authentication → Users → Add user** — crie a conta (e-mail + senha) do gestor.
3. Entre em `/admin` no site com essa conta.

As políticas RLS permitem **leitura pública** (o site lê com a anon key) e
**escrita apenas para utilizadores autenticados** do projeto — por isso só a
conta criada acima consegue editar.

## Deploy na Vercel

1. Faça push deste repositório para o GitHub (`cossom-music/vandilson`).
2. Em [vercel.com](https://vercel.com) → **Add New → Project** → importe o repo.
3. Em **Environment Variables**, adicione as duas variáveis acima.
4. **Deploy** — feito. 🚀

## Editar o conteúdo (CMS)

O conteúdo do site vive agora no **Supabase** e edita-se em `/admin` (login
com a conta do gestor):

| Secção | O quê |
| --- | --- |
| Perfil & Redes | Nome, bio (curta + longa), redes sociais, e-mail de booking |
| Textos da home | Secções Ouvir/Discografia e Sintonia + destaques |
| Lançamentos | Discografia — capa (upload), faixas, curiosidades, ficha |
| Agenda | Próximos shows |

Ao guardar, o site público é revalidado (tag `site-content`) e mostra as
mudanças de imediato. **Capas**: o upload vai para o bucket `covers`; quando
um lançamento tem capa, ela vira a superfície do planeta (os continentes
dot-matrix ficam ocultos) — sem capa mantém o planeta procedural.

`src/content.ts` deixou de ser o ficheiro a editar: é a **seed** (conteúdo
inicial e fallback quando o Supabase não está ligado). Para alterar o
conteúdo *inicial* (por exemplo, novos campos), edite a seed **e** a seed da
migração `supabase/migrations/002_cms_conteudo.sql` para manterem-se em
sincronia.

O vídeo do globo vive em `public/videos/earth-spin.mp4` (referência: `model-videos/Earth Spin.mp4`).
Para trocar, basta substituir o ficheiro — o componente `src/components/earth/EarthVideo.tsx` trata do resto.

## Tecnologias

- Next.js 15 (App Router) + TypeScript + Tailwind CSS 4
- Vídeo do globo da Terra (`EarthVideo.tsx`) — loop, autoplay, fallback estático embutido
- GSAP + ScrollTrigger — zoom do herói no scroll e fade para as secções
- anime.js v4 — reveals de texto palavra a palavra
- Framer Motion — micro-interações e transições (header, menu móvel)
- Supabase — newsletter, mensagens de contacto e o **CMS** (conteúdo em `site_content`/`releases`, capas em Storage, auth do `/admin`)

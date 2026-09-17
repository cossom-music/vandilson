import type { NextConfig } from "next";
import path from "path";

// Host EXATO do projeto Supabase (derivado da env — nada de wildcard
// **.supabase.co, que abriria o otimizador a imagens de QUALQUER projeto
// alheio; auditoria BAIXO 9). Avaliado em build/server start, quando o
// .env.local está carregado.
const supabaseHost = (() => {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    return url ? new URL(url).hostname : null;
  } catch {
    return null;
  }
})();

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Fixa a raiz do workspace (evita aviso de lockfiles a montante)
  outputFileTracingRoot: path.join(process.cwd()),
  // Security headers (auditoria MÉDIO 5). Sem CSP de script-src rígida:
  // o embed oficial do Spotify (IFrame API) injeta scripts próprios no
  // runtime e quebraria com nonce — frame-ancestors + frame-src cobrem o
  // essencial sem partir o site.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://open.spotify.com https://embed-cdn.spotifycdn.com https://s.ytimg.com https://www.youtube.com https://www.youtube-nocookie.com https://www.googletagmanager.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "media-src 'self' https://*.supabase.co",
              "font-src 'self' data:",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://open.spotify.com",
              "frame-src https://open.spotify.com https://www.youtube.com https://www.youtube-nocookie.com",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
  // Rotas antigas — /musica passou a /discografia; /contactos e /sobre foram
  // absorvidas por secções na homepage.
  async redirects() {
    return [
      { source: "/musica", destination: "/discografia", permanent: true },
      { source: "/contactos", destination: "/", permanent: false },
      // /sobre agora vive na homepage — a página Sobre+Agenda sobe por cima
      // da Sintonia no fim do scroll.
      { source: "/sobre", destination: "/", permanent: false },
    ];
  },
  images: {
    // Só hosts de confiança: o Supabase exato deste projeto (sem wildcard)
    // e o CDN de capas do oEmbed do Spotify. Nota: o site hoje usa <img>
    // direto (não <Image>), por que estes patterns servem de guard para
    // o otimizador caso venha a ser usado.
    remotePatterns: [
      ...(supabaseHost ? [{ protocol: "https" as const, hostname: supabaseHost }] : []),
      {
        protocol: "https",
        hostname: "i.scdn.co",
      },
    ],
  },
};

export default nextConfig;

import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Fixa a raiz do workspace (evita aviso de lockfiles a montante)
  outputFileTracingRoot: path.join(process.cwd()),
  // Rotas antigas — /musica passou a /discografia; /contactos foi absorvido
  // pela secção de contacto na homepage.
  async redirects() {
    return [
      { source: "/musica", destination: "/discografia", permanent: true },
      { source: "/contactos", destination: "/", permanent: false },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },
};

export default nextConfig;

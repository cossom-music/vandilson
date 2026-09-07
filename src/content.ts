/**
 * Conteúdo centralizado do site — troque os placeholders por conteúdo real
 * sem tocar nos componentes.
 */

export const artist = {
  name: "Vandilson Neto",
  firstName: "Vandilson",
  lastName: "Neto",
  tagline: "Músicas que atravessam o mundo.",
  shortBio:
    "Vandilson Neto é um artista que transforma histórias em canções — entre o íntimo e o infinito, a sua música viaja do acústico ao eletrónico com uma honestidade rara.",
  longBio: [
    "Vandilson Neto começou a escrever canções como quem escreve cartas — com urgência, verdade e a certeza de que alguém, algures, as precisa de ouvir. O seu som vive entre o popular e o experimental, com letras que falam de saudade, cidade, amor e partida.",
    "Dos palcos pequenos aos festivais, a sua carreira tem sido construída canção a canção, sempre com o pé na terra e os olhos no horizonte. Cada disco é uma viagem — e o mundo, como o globo que gira no site, é o mapa.",
    "Este é um texto de exemplo (placeholder). Substitua por uma biografia real em src/content.ts.",
  ],
  photoAlt: "Fotografia de Vandilson Neto (placeholder)",
};

export const socials = [
  { label: "Instagram", handle: "@vandilsonneto", url: "https://instagram.com/vandilsonneto" },
  { label: "YouTube", handle: "@vandilsonneto", url: "https://youtube.com/@vandilsonneto" },
  { label: "Spotify", handle: "Vandilson Neto", url: "https://open.spotify.com/artist/vandilsonneto" },
  { label: "Apple Music", handle: "Vandilson Neto", url: "https://music.apple.com/artist/vandilsonneto" },
];

/**
 * Contacto — o site não tem página de contactos: o e-mail é o único ponto
 * de contacto, apresentado no fim da homepage e no rodapé.
 */
export const contact = {
  email: "booking@vandilsonneto.com",
};

export type Release = {
  title: string;
  year: string;
  type: "Single" | "EP" | "Álbum";
  cover: string; // cor de fundo placeholder até existirem capas reais
  gradient: string;
};

export const releases: Release[] = [
  {
    title: "Horizonte Infinito",
    year: "2026",
    type: "Single",
    cover: "Capa do single Horizonte Infinito (placeholder)",
    gradient: "from-[#0d0f13] via-[#26292f] to-[#4a4e56]",
  },
  {
    title: "Cartas ao Mundo",
    year: "2025",
    type: "EP",
    cover: "Capa do EP Cartas ao Mundo (placeholder)",
    gradient: "from-[#16181d] via-[#0d0f13] to-[#585c64]",
  },
  {
    title: "Gravidade",
    year: "2024",
    type: "Álbum",
    cover: "Capa do álbum Gravidade (placeholder)",
    gradient: "from-[#23262c] via-[#16181d] to-[#6b7078]",
  },
  {
    title: "Primeiro Voo",
    year: "2022",
    type: "Álbum",
    cover: "Capa do álbum Primeiro Voo (placeholder)",
    gradient: "from-[#0d0f13] via-[#202329] to-[#3f434b]",
  },
];

export type Show = {
  date: string;
  city: string;
  venue: string;
  status: "À venda" | "Esgotado" | "Em breve";
};

export const shows: Show[] = [
  { date: "12 OUT 2026", city: "Lisboa", venue: "Grande Sala (placeholder)", status: "À venda" },
  { date: "25 OUT 2026", city: "Porto", venue: "Teatro (placeholder)", status: "À venda" },
  { date: "08 NOV 2026", city: "São Paulo", venue: "Casa de shows (placeholder)", status: "Em breve" },
];

export const homeSections = {
  music: {
    eyebrow: "Ouvir",
    title: "Discografia",
    cta: "Explorar toda a discografia",
  },
  contact: {
    eyebrow: "Sintonia",
    title: "Onde a música vive",
  },
};

export const homeHighlights = {
  latest: {
    label: "Último lançamento",
    title: "Horizonte Infinito",
    description:
      "O novo single já está disponível em todas as plataformas. Ouça, partilhe e deixe-se levar pelo horizonte.",
  },
  listenCta: "Ouvir agora",
  bioTeaser: artist.shortBio,
};

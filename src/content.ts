/**
 * Conteúdo centralizado do site.
 *
 * Desde que o CMS entrou, este ficheiro é a SEED — o conteúdo de arranque e
 * o fallback quando o Supabase não está configurado ou as tabelas ainda
 * estão vazias. Em produção o conteúdo vem da base de dados (tabelas
 * `site_content` e `releases` — ver supabase/migrations), é feito merge
 * sobre esta seed e servido pelo `SiteContentProvider`.
 *
 * ⚠️ Editar conteúdo do site? Use o painel /admin (grava no Supabase) — não
 * edite este ficheiro, exceto para mudar o conteúdo *inicial*.
 */

export type TracklistItem = {
  title: string;
  duration?: string; // "3:42" — opcional
};

export type Release = {
  /** Apenas quando vem do CMS (chave primária no Supabase). */
  id?: string;
  title: string;
  year: string;
  type: "Single" | "EP" | "Álbum";
  description?: string;
  /** URL pública da capa real (Supabase Storage). Sem imagem → planeta procedural. */
  image?: string | null;
  /** Aparece na secção "Ouvir" da homepage (escolha no admin). */
  featured?: boolean;
  tracklist?: TracklistItem[];
  curiosities?: string[];
  facts?: { label: string; value: string }[];
};

export type Show = {
  date: string;
  city: string;
  venue: string;
  status: "À venda" | "Esgotado" | "Em breve";
};

export type Artist = {
  name: string;
  firstName: string;
  lastName: string;
  tagline: string;
  shortBio: string;
  longBio: string[];
  photoAlt: string;
  /** URL público da fotografia (Supabase Storage, bucket covers). Sem foto → eclipse. */
  photo?: string | null;
  /** Coordenadas mostradas na biografia (dados de carta celeste). */
  origin?: string;
  base?: string;
  orbit?: string;
};

export type Social = {
  label: string;
  handle: string;
  url: string;
  /** Aparece na Sintonia (órbita) e no footer. Ausente = visível (compatibilidade). */
  visible?: boolean;
};

export type Contact = {
  email: string;
};

export type HomeSections = {
  music: { eyebrow: string; title: string; cta: string };
  contact: { eyebrow: string; title: string };
};

export type HomeHighlights = {
  latest: { label: string; title: string; description: string };
  listenCta: string;
  bioTeaser: string;
};

export type SiteContent = {
  artist: Artist;
  socials: Social[];
  contact: Contact;
  releases: Release[];
  shows: Show[];
  homeSections: HomeSections;
  homeHighlights: HomeHighlights;
};

export const seedContent: SiteContent = {
  artist: {
    name: "Vandilson Neto",
    firstName: "Vandilson",
    lastName: "Neto",
    tagline: "Músicas que atravessam o mundo.",
    shortBio:
      "Vandilson Neto é um artista que transforma histórias em canções — entre o íntimo e o infinito, a sua música viaja do acústico ao eletrónico com uma honestidade rara.",
    longBio: [
      "Vandilson Neto começou a escrever canções como quem escreve cartas — com urgência, verdade e a certeza de que alguém, algures, as precisa de ouvir. O seu som vive entre o popular e o experimental, com letras que falam de saudade, cidade, amor e partida.",
      "Dos palcos pequenos aos festivais, a sua carreira tem sido construída canção a canção, sempre com o pé na terra e os olhos no horizonte. Cada disco é uma viagem — e o mundo, como o globo que gira no site, é o mapa.",
      "Este é um texto de exemplo (placeholder). Substitua por uma biografia real no painel /admin.",
    ],
    photoAlt: "Fotografia de Vandilson Neto (placeholder)",
    photo: null,
    origin: "Moçambique",
    base: "Lisboa",
    orbit: "Mundo",
  },

  socials: [
    // Ordem fixa = ordem das órbitas na Sintonia (de dentro para fora)
    { label: "Spotify", handle: "Vandilson Neto", url: "https://open.spotify.com/artist/vandilsonneto", visible: true },
    { label: "Apple Music", handle: "Vandilson Neto", url: "https://music.apple.com/artist/vandilsonneto", visible: true },
    { label: "Instagram", handle: "@vandilsonneto", url: "https://instagram.com/vandilsonneto", visible: true },
    { label: "YouTube", handle: "@vandilsonneto", url: "https://youtube.com/@vandilsonneto", visible: true },
    { label: "TikTok", handle: "", url: "", visible: false },
    { label: "Facebook", handle: "", url: "", visible: false },
    { label: "X", handle: "", url: "", visible: false },
    { label: "Threads", handle: "", url: "", visible: false },
    { label: "SoundCloud", handle: "", url: "", visible: false },
  ],

  contact: {
    email: "booking@vandilsonneto.com",
  },

  releases: [
    {
      title: "Horizonte Infinito",
      year: "2026",
      type: "Single",
      description:
        "O novo single já está disponível em todas as plataformas. Ouça, partilhe e deixe-se levar pelo horizonte.",
      tracklist: [
        { title: "Horizonte Infinito", duration: "3:42" },
        { title: "Horizonte Infinito — versão acústica", duration: "3:58" },
        { title: "Horizonte Infinito — instrumental", duration: "3:40" },
      ],
      curiosities: [
        "Gravado numa só tarde, entre a maré baixa e o primeiro comboio.",
        "O título nasceu de um mapa antigo comprado num mercado de pulgas em Lisboa.",
      ],
      facts: [
        { label: "Lançamento", value: "2026 · Single" },
        { label: "Faixas", value: "3" },
        { label: "Duração", value: "11:40" },
        { label: "Produção", value: "A confirmar" },
      ],
    },
    {
      title: "Cartas ao Mundo",
      year: "2025",
      type: "EP",
      description:
        "Cinco canções-carta, escritas para sítios onde o artista nunca esteve — mas sentiu.",
      tracklist: [
        { title: "Primeira carta" },
        { title: "Selo e endereço" },
        { title: "Maré postal" },
        { title: "Água-rasada" },
        { title: "Última resposta", duration: "4:05" },
      ],
      curiosities: ["Cada faixa tem o nome de um porto imaginário."],
      facts: [
        { label: "Lançamento", value: "2025 · EP" },
        { label: "Faixas", value: "5" },
      ],
    },
    {
      title: "Gravidade",
      year: "2024",
      type: "Álbum",
      description:
        "O álbum que puxou tudo para junto — doze canções sobre o que nos prende e o que nos deixa partir.",
      facts: [
        { label: "Lançamento", value: "2024 · Álbum" },
        { label: "Faixas", value: "12" },
      ],
    },
    {
      title: "Primeiro Voo",
      year: "2022",
      type: "Álbum",
      description:
        "O primeiro disco — gravado com o que havia, como pôde, e é por isso que soa tão verdadeiro.",
      facts: [
        { label: "Lançamento", value: "2022 · Álbum" },
        { label: "Faixas", value: "10" },
      ],
    },
  ],

  shows: [
    { date: "12 OUT 2026", city: "Lisboa", venue: "Grande Sala (placeholder)", status: "À venda" },
    { date: "25 OUT 2026", city: "Porto", venue: "Teatro (placeholder)", status: "À venda" },
    { date: "08 NOV 2026", city: "São Paulo", venue: "Casa de shows (placeholder)", status: "Em breve" },
  ],

  homeSections: {
    music: {
      eyebrow: "Ouvir",
      title: "Discografia",
      cta: "Explorar toda a discografia",
    },
    contact: {
      eyebrow: "Sintonia",
      title: "Onde a música vive",
    },
  },

  homeHighlights: {
    latest: {
      label: "Último lançamento",
      title: "Horizonte Infinito",
      description:
        "O novo single já está disponível em todas as plataformas. Ouça, partilhe e deixe-se levar pelo horizonte.",
    },
    listenCta: "Ouvir agora",
    bioTeaser:
      "Vandilson Neto é um artista que transforma histórias em canções — entre o íntimo e o infinito, a sua música viaja do acústico ao eletrónico com uma honestidade rara.",
  },
};

/* Re-exports das secções — conveniência para quem precisa de uma parte.
   A fonte de verdade para os componentes é o `SiteContentProvider`. */
export const artist = seedContent.artist;
export const socials = seedContent.socials;
export const contact = seedContent.contact;
export const releases = seedContent.releases;
export const shows = seedContent.shows;
export const homeSections = seedContent.homeSections;
export const homeHighlights = seedContent.homeHighlights;

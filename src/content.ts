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
  /** Caminho do MP3 no bucket "audio" do Storage — quando existe, a faixa
   *  pode entrar no player "Em Órbita" da página /universo. */
  audioPath?: string;
};

/** Marco da Trajetória (diário de bordo da carreira) — secção /universo. */
export type Milestone = {
  year: string;
  title: string;
  note?: string;
  /** Marcos "quentes" (âmbar) — os momentos-pivô. */
  major?: boolean;
};

/**
 * Era da Trajetória (/universo, modelo "Diário de Bordo") — uma COLUNA do
 * diário: nome de fase, intervalo de anos, título e nota de cabeçalho. Os
 * marcos da janela de anos da era são listados como eventos na coluna.
 */
export type Era = {
  /** Nome da fase — Decolagem, Trânsito, Órbita alta… (âmbar, mono). */
  phase: string;
  /** Primeiro ano da era (inclusive) — abre a janela de eventos. */
  from: string;
  /** Último ano da era (inclusive) — fecha a janela; omisso = última era. */
  to?: string;
  /** Título Playfair da coluna. */
  title: string;
  /** Linha de apoio por baixo do título. */
  note?: string;
};

/** Colaborador da Constelação (mapa de conexões) — secção /universo. */
export type Collaborator = {
  name: string;
  role: string;
  /** Projeto(s) em comum — mostrado no painel ao clicar na estrela. */
  project?: string;
  /** Parceria em destaque (estrela âmbar + linha acesa). */
  hot?: boolean;
};

/** Faixa curada para o player "Em Órbita" — referência a uma tracklist. */
export type PlayerTrack = {
  /** Título da faixa (cópia legível — a tracklist pode mudar sem quebrar o player). */
  title: string;
  /** Lançamento a que pertence (para a etiqueta do player). */
  releaseTitle: string;
  /** Caminho do MP3 no bucket "audio" do Storage. */
  audioPath?: string;
  /** Faixa do SPOTIFY — ID de open.spotify.com/track/{id} (reproduzida via embed). */
  spotifyId?: string;
  /** Capa externa (Spotify/oEmbed) — só faixas Spotify; MP3 usam a capa do lançamento. */
  coverUrl?: string;
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
  /** Link de venda de bilhetes — usado no botão "À venda" da agenda. */
  ticketsUrl?: string;
  /**
   * Data do evento (ISO yyyy-mm-dd, opcional). Quando o momento passa,
   * o show sai automaticamente da agenda pública — sem editar o CMS.
   */
  eventDate?: string;
  /** Hora de início (HH:mm, opcional) — usada nos countdowns. */
  eventTime?: string;
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
  /** Secções da página /universo (editáveis no admin, com seed de placeholder). */
  milestones: Milestone[];
  eras: Era[];
  collaborators: Collaborator[];
  playerPlaylist: PlayerTrack[];
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
    { date: "15 DEZ 2026", city: "Maputo", venue: "Casa de shows (placeholder)", status: "À venda", ticketsUrl: "" },
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

  /* ─── /universo — Trajetória (marcos placeholder; reais via admin) ─── */
  milestones: [
    { year: "2019", title: "Primeiro registo", note: "Gravação caseira — o ponto zero da carta.", major: true },
    { year: "2021", title: "Primeiro EP", note: "Cinco faixas independentes." },
    { year: "2023", title: "Maputo → Lisboa", note: "A órbita alargou-se.", major: true },
    { year: "2024", title: "Primeira tour", note: "Sete cidades, um mês." },
    { year: "2025", title: "«Sob os Astros»", note: "Álbum de estreia em longo formato.", major: true },
  ],

  /* ─── /universo — Trajetória: eras do "Diário de Bordo" (colunas).
        Anos inclusivos — a era apanha os marcos do seu intervalo; a última
        era sem "to" estende-se até hoje. Placeholder: substituir no admin. ─── */
  eras: [
    { phase: "Decolagem", from: "2019", to: "2021", title: "A origem", note: "Onde a rota começou — casa, Maputo." },
    { phase: "Trânsito", from: "2022", to: "2023", title: "O voo", note: "Entre mundos, com escala em estúdios alheios." },
    { phase: "Órbita alta", from: "2024", title: "O presente", note: "A trajetória continua a subir." },
  ],

  /* ─── /universo — Constelação (colaboradores placeholder) ─── */
  collaborators: [
    { name: "Mário Costa", role: "Produção", project: "Produção e co-autoria em 7 das 9 faixas do álbum." },
    { name: "Ana Duarte", role: "Voz", project: "Dueto na faixa-título e no fecho do álbum.", hot: true },
    { name: "Tomás R.", role: "Bateria", project: "Secção rítmica de todos os lançamentos desde o 1.º EP." },
    { name: "Rita Pinto", role: "Mistura", project: "Mistura e masterização de «Sob os Astros»." },
    { name: "Jonas M.", role: "Baixo", project: "Gravações e palcos desde 2021." },
  ],

  /* ─── /universo — Player Em Órbita (vazio por defeito: a playlist é
        curada no admin a partir das faixas COM audioPath carregado) ─── */
  playerPlaylist: [],
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
export const milestones = seedContent.milestones;
export const collaborators = seedContent.collaborators;
export const playerPlaylist = seedContent.playerPlaylist;

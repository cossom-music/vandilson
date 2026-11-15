/**
 * Snapshot do conteúdo real do Supabase → src/generated/content-snapshot.json
 *
 * Porquê: quando a base de dados está offline (ex.: projeto restringido por
 * excesso de egress), o site não pode cair para a seed de placeholder — tem
 * de mostrar o último conteúdo verdadeiro. Este ficheiro é esse "último
 * conteúdo bom", versionado e incluído no build.
 *
 * Corre automaticamente em CI (Vercel) antes do `next build` (prebuild) e à
 * mão com `npm run snapshot`. Se o Supabase estiver inacessível, mantém o
 * ficheiro existente e sai com 0 — o build nunca falha por causa disto.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

/** Tem de espelhar SECTION_KEYS de src/lib/content-server.ts. */
const SECTION_KEYS = [
  "artist",
  "socials",
  "contact",
  "homeSections",
  "homeHighlights",
  "shows",
  "milestones",
  "eras",
  "collaborators",
  "playerPlaylist",
  "siteVisibility",
];

const OUT = resolve(process.cwd(), "src/generated/content-snapshot.json");
const force = process.argv.includes("--force");

/** Carrega .env.local quando as variáveis ainda não estão no ambiente. */
function loadEnvLocal() {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (!m || process.env[m[1]]) continue;
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    /* sem .env.local — usa o ambiente tal como está */
  }
}

async function main() {
  // Em local, só corre a pedido (evita alterar o repo a cada `next build`).
  if (!force && !process.env.CI) {
    console.log("[content-snapshot] local — ignorado (npm run snapshot para atualizar).");
    return;
  }

  loadEnvLocal();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.warn("[content-snapshot] sem credenciais Supabase — snapshot existente mantém-se.");
    return;
  }

  // Teto de 10 s por pedido: com a BD offline/restringida, o build segue com o
  // snapshot versionado em vez de ficar pendurado à espera do Supabase.
  const supabase = createClient(url, key, {
    auth: { persistSession: false },
    global: {
      fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(10_000) }),
    },
  });

  const [sections, releases] = await Promise.all([
    supabase.from("site_content").select("key, value").in("key", SECTION_KEYS),
    supabase
      .from("releases")
      .select(
        "id, title, year, type, description, cover_path, featured, hidden, home_position, tracklist, curiosities, facts",
      )
      .order("position", { ascending: true }),
  ]);

  if (sections.error || releases.error) {
    console.warn(
      "[content-snapshot] leitura falhou — snapshot existente mantém-se.",
      sections.error?.message ?? releases.error?.message,
    );
    return;
  }

  if (!sections.data?.length && !releases.data?.length) {
    console.warn("[content-snapshot] base vazia — snapshot existente mantém-se.");
    return;
  }

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(
    OUT,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        sections: sections.data ?? [],
        releases: releases.data ?? [],
      },
      null,
      2,
    )}\n`,
  );

  console.log(
    `[content-snapshot] atualizado — ${sections.data?.length ?? 0} secções, ${releases.data?.length ?? 0} lançamentos.`,
  );
}

// Termina naturalmente (sem process.exit durante pedidos pendentes — no
// Windows/Node 24 isso rebenta com uma assertion do libuv).
main().catch((err) => {
  console.warn("[content-snapshot] inesperado — snapshot existente mantém-se.", err);
});

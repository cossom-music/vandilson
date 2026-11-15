import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Cliente Supabase partilhado. Pode ser null em desenvolvimento
 * (sem .env.local) — os formulários mostram um aviso em vez de falhar.
 */
export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false },
        // Teto por pedido: sem isto, uma BD restringida/offline deixa a
        // leitura pendurada e o site (ou o build) espera minutos em vez de
        // cair imediatamente no snapshot de conteúdo. 8 s dá folga a estas
        // consultas pequenas.
        global: {
          fetch: (input, init) =>
            fetch(input, { ...init, signal: AbortSignal.timeout(8_000) }),
        },
      })
    : null;

export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

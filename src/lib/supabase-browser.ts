"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Cliente Supabase para o browser (formulários do admin + upload de capas).
 * Usa cookies para a sessão — o servidor (createSupabaseServerClient) lê a
 * mesma sessão nas server actions.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseBrowser =
  supabaseUrl && supabaseAnonKey ? createBrowserClient(supabaseUrl, supabaseAnonKey) : null;

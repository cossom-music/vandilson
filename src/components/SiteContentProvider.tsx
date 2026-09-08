"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { seedContent, type SiteContent } from "@/content";

type SiteContextValue = {
  content: SiteContent;
  /** Recarrega do servidor (usado depois de guardar no admin, p.ex.). */
  refresh: () => Promise<void>;
};

const SiteContext = createContext<SiteContextValue | null>(null);

/**
 * Torna o conteúdo (seed + Supabase, montado no servidor) disponível a
 * qualquer componente do site via `useSiteContent()`. O `initial` vem do
 * SSR — o servidor já entrega o conteúdo real (SEO + sem flash).
 */
export function SiteContentProvider({
  initial,
  children,
}: {
  initial?: SiteContent;
  children: ReactNode;
}) {
  const [content, setContent] = useState<SiteContent>(() => initial ?? seedContent);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/content");
      if (!res.ok) return;
      const json = (await res.json()) as { content?: SiteContent };
      if (json.content) setContent(json.content);
    } catch {
      /* mantém o conteúdo atual */
    }
  }, []);

  const value = useMemo(() => ({ content, refresh }), [content, refresh]);
  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}

export function useSiteContent(): SiteContent {
  return useContext(SiteContext)?.content ?? seedContent;
}

export function useSiteContentRefresh() {
  const ctx = useContext(SiteContext);
  return ctx?.refresh ?? (async () => {});
}

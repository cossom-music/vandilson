import { supabase } from "./supabase";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type NewsletterResult =
  | { ok: true }
  | { ok: false; reason: "unconfigured" | "invalid" | "network" };

export async function subscribeToNewsletter(
  email: string,
): Promise<NewsletterResult> {
  const clean = email.trim().toLowerCase();
  if (!EMAIL_RE.test(clean)) return { ok: false, reason: "invalid" };

  if (!supabase) return { ok: false, reason: "unconfigured" };

  const { error } = await supabase
    .from("newsletter_subscribers")
    .insert({ email: clean });

  if (error) {
    // 23505 = duplicate key (e-mail já subscrito) — tratamos como sucesso
    if (error.code === "23505") return { ok: true };
    console.error("Newsletter insert failed:", error.message);
    return { ok: false, reason: "network" };
  }

  return { ok: true };
}

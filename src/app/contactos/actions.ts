"use server";

import { createClient } from "@supabase/supabase-js";

export type ContactState = {
  status: "idle" | "ok" | "error" | "unconfigured" | "invalid";
  message?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function submitContact(
  _prev: ContactState,
  formData: FormData,
): Promise<ContactState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const category = String(formData.get("category") ?? "Geral");
  const message = String(formData.get("message") ?? "").trim();
  const honeypot = String(formData.get("company") ?? "");

  if (honeypot) return { status: "ok" }; // bots: silêncio
  if (!name || !EMAIL_RE.test(email) || message.length < 10) {
    return { status: "invalid" };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return { status: "unconfigured" };

  const supabase = createClient(url, key, {
    auth: { persistSession: false },
  });

  const { error } = await supabase.from("contact_messages").insert({
    name,
    email,
    category,
    message,
  });

  if (error) {
    console.error("Contact insert failed:", error.message);
    return { status: "error" };
  }

  return { status: "ok" };
}

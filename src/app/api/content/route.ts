import { NextResponse } from "next/server";
import { getSiteContent } from "@/lib/content-server";

/** Conteúdo do site em JSON — usado para refrescar sem recarregar a página. */
export async function GET() {
  const content = await getSiteContent();
  return NextResponse.json({ content });
}

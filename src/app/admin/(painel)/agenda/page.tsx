import { getSiteContent } from "@/lib/content-server";
import { ShowsForm } from "./agenda-form";

export const metadata = { title: "Agenda" };

export default async function AgendaPage() {
  const content = await getSiteContent();
  return <ShowsForm initial={content.shows} />;
}

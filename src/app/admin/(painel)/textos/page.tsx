import { getSiteContent } from "@/lib/content-server";
import { HomeHighlightsForm, HomeSectionsForm } from "./textos-form";

export const metadata = { title: "Textos da home" };

export default async function TextosPage() {
  const content = await getSiteContent();
  return (
    <>
      <HomeSectionsForm initial={content.homeSections} />
      <HomeHighlightsForm initial={content.homeHighlights} />
    </>
  );
}

import { getSiteContent } from "@/lib/content-server";
import UniversoForms from "./universo-form";

export const metadata = { title: "Universo" };

export default async function AdminUniversoPage() {
  const content = await getSiteContent();
  return (
    <UniversoForms
      releases={content.releases}
      milestones={content.milestones}
      eras={content.eras}
      collaborators={content.collaborators}
      playerPlaylist={content.playerPlaylist}
    />
  );
}

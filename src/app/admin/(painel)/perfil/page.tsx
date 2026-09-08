import { getSiteContent } from "@/lib/content-server";
import { ArtistForm, ContactForm, SocialsForm } from "./perfil-form";

export const metadata = { title: "Perfil & Redes" };

export default async function PerfilPage() {
  const content = await getSiteContent();
  return (
    <>
      <ArtistForm initial={content.artist} />
      <SocialsForm initial={content.socials} />
      <ContactForm initial={content.contact} />
    </>
  );
}

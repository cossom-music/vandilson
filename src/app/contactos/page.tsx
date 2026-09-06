import type { Metadata } from "next";
import SectionHeading from "@/components/SectionHeading";
import Reveal from "@/components/Reveal";
import ContactForm from "./ContactForm";
import { contact, socials } from "@/content";

export const metadata: Metadata = {
  title: "Contactos",
  description: "Booking, imprensa e contactos de Vandilson Neto.",
};

export default function ContactosPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 pb-24 pt-32">
      <SectionHeading eyebrow="Fale connosco" title="Contactos" />

      <div className="mt-14 grid gap-14 md:grid-cols-[1.2fr_1fr]">
        <Reveal>
          <ContactForm />
        </Reveal>

        <div className="space-y-8">
          <Reveal delay={0.1}>
            <div className="rounded-2xl border border-white/10 bg-night-900/60 p-8">
              <h3 className="font-display text-xl text-cream">Booking & Imprensa</h3>
              <a
                href={`mailto:${contact.email}`}
                className="mt-3 block text-gold-400 underline-offset-4 hover:underline"
              >
                {contact.email}
              </a>
              <p className="mt-2 text-sm text-mist">{contact.phonePlaceholder}</p>
              <p className="mt-4 text-sm leading-relaxed text-mist">{contact.bookingNote}</p>
            </div>
          </Reveal>

          <Reveal delay={0.2}>
            <div className="rounded-2xl border border-white/10 bg-night-900/60 p-8">
              <h3 className="font-display text-xl text-cream">Redes sociais</h3>
              <ul className="mt-4 space-y-2">
                {socials.map((s) => (
                  <li key={s.label}>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-mist transition-colors hover:text-gold-400"
                    >
                      {s.label} <span className="text-mist/50">{s.handle}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  );
}

import Reveal from "./Reveal";

export default function SectionHeading({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <Reveal>
      <p className="text-xs uppercase tracking-[0.35em] text-silver-500">{eyebrow}</p>
      <h2 className="mt-3 font-display text-4xl text-cream md:text-5xl">{title}</h2>
    </Reveal>
  );
}

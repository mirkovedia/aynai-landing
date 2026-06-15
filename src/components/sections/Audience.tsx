import { AUDIENCES } from "@/constants/content";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { Reveal } from "@/components/shared/Reveal";

/**
 * Sección Para quién es — tarjetas con los cuatro públicos objetivo.
 */
export const Audience = () => (
  <section className="relative bg-cream-200 py-24 sm:py-32">
    <div className="mx-auto max-w-6xl px-5 sm:px-8">
      <SectionHeading
        eyebrow="Para quién es"
        title="Construido para quienes el sistema dejó fuera"
        description="Desde quien recién empieza hasta empresas que buscan talento real y comprobable."
      />

      <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {AUDIENCES.map((a, i) => (
          <Reveal key={a.title} delay={i * 0.08}>
            <article className="card-andino group flex h-full flex-col rounded-2xl p-7 transition-transform duration-300 hover:-translate-y-1">
              <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gold/15 text-gold-600 transition-colors group-hover:bg-gold group-hover:text-cocoa">
                <a.icon size={22} />
              </div>
              <h3 className="font-serif text-lg font-bold text-cocoa">{a.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-cocoa/70">{a.description}</p>
            </article>
          </Reveal>
        ))}
      </div>
    </div>
  </section>
);

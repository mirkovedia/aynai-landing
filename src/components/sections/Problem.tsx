import { PROBLEMS } from "@/constants/content";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { Reveal } from "@/components/shared/Reveal";

/**
 * Sección Problema — 3 tarjetas que exponen las fallas de los marketplaces
 * tradicionales. Fondo crema con textura aguayo muy sutil.
 */
export const Problem = () => (
  <section className="aguayo-texture relative bg-cream py-24 sm:py-32">
    <div className="mx-auto max-w-6xl px-5 sm:px-8">
      <SectionHeading
        eyebrow="El problema"
        title="El talento existe. La confianza, no."
        description="Las plataformas actuales tienen tres grietas que dejan fuera a quienes más tienen para ofrecer."
      />

      <div className="mt-16 grid gap-6 md:grid-cols-3">
        {PROBLEMS.map((problem, i) => (
          <Reveal key={problem.title} delay={i * 0.1}>
            <article className="card-andino group h-full rounded-2xl p-7 transition-transform duration-300 hover:-translate-y-1">
              <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-red/10 text-red transition-colors group-hover:bg-red group-hover:text-cream">
                <problem.icon size={22} />
              </div>
              <h3 className="font-serif text-xl font-bold text-cocoa">{problem.title}</h3>
              <p className="mt-3 text-[0.95rem] leading-relaxed text-cocoa/70">
                {problem.description}
              </p>
            </article>
          </Reveal>
        ))}
      </div>
    </div>
  </section>
);

import { STEPS } from "@/constants/content";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { Reveal } from "@/components/shared/Reveal";

/**
 * Sección Cómo funciona — 4 pasos numerados conectados por una línea.
 * Flujo: explorar → proponer → aceptar → pagar y conectar.
 */
export const HowItWorks = () => (
  <section id="como-funciona" className="relative bg-cream-200 py-24 sm:py-32">
    <div className="mx-auto max-w-6xl px-5 sm:px-8">
      <SectionHeading
        eyebrow="Cómo funciona"
        title="Explora. Propón. Conecta."
        description="Cuatro pasos simples. Explorar y proponer es gratis; solo pagas cuando concretas una conexión."
      />

      <div className="relative mt-20">
        {/* Línea conectora en escritorio */}
        <div
          aria-hidden="true"
          className="absolute left-0 right-0 top-7 hidden h-px bg-gradient-to-r from-transparent via-cocoa/20 to-transparent md:block"
        />

        <ol className="grid gap-12 md:grid-cols-4 md:gap-8">
          {STEPS.map((step, i) => (
            <Reveal key={step.number} delay={i * 0.12}>
              <li className="relative flex flex-col items-center text-center md:items-start md:text-left">
                <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-2xl bg-cocoa text-cream shadow-lg">
                  <step.icon size={24} aria-hidden="true" />
                  <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-gold font-sans text-[0.7rem] font-bold text-cocoa">
                    {step.number}
                  </span>
                </div>
                <h3 className="mt-6 font-serif text-xl font-bold text-cocoa">{step.title}</h3>
                <p className="mt-3 max-w-xs text-[0.95rem] leading-relaxed text-cocoa/70">
                  {step.description}
                </p>
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </div>
  </section>
);

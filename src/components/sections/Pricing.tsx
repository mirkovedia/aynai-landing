import { Check, Compass, HandCoins, ArrowRight } from "lucide-react";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { Reveal } from "@/components/shared/Reveal";
import { Button } from "@/components/ui/button";
import { COMMISSION_AMOUNT_BS } from "@/lib/payments/constants";

const freeFeatures = [
  "Crear tu perfil y publicar habilidades",
  "Explorar a todas las personas del marketplace",
  "Proponer todos los Ayni que quieras",
];

const paidFeatures = [
  `Bs ${COMMISSION_AMOUNT_BS} por persona, una sola vez por conexión`,
  "Se revela el contacto para coordinar",
  "Sin suscripción ni cargos ocultos",
];

/**
 * Sección Precio transparente — honestidad total del modelo de comisión.
 * Explorar y proponer es gratis; solo se paga al concretar una conexión.
 */
export const Pricing = () => (
  <section id="precio" className="aguayo-texture relative bg-cream py-24 sm:py-32">
    <div className="mx-auto max-w-5xl px-5 sm:px-8">
      <SectionHeading
        eyebrow="Precio transparente"
        title={`Gratis para explorar. Bs ${COMMISSION_AMOUNT_BS} solo al conectar.`}
        description="Sin suscripciones ni sorpresas. Pagas únicamente cuando ambas partes deciden concretar un Ayni."
      />

      <div className="mt-14 grid gap-6 md:grid-cols-2">
        {/* Gratis */}
        <Reveal>
          <article className="card-andino flex h-full flex-col rounded-3xl p-8">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-cocoa/5 text-cocoa">
              <Compass size={22} aria-hidden="true" />
            </div>
            <h3 className="mt-5 font-serif text-2xl font-bold text-cocoa">Explorar</h3>
            <p className="mt-1 font-serif text-3xl font-bold text-green">Gratis</p>
            <ul className="mt-6 space-y-3">
              {freeFeatures.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-cocoa/80">
                  <Check size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-green" />
                  <span className="leading-relaxed">{f}</span>
                </li>
              ))}
            </ul>
          </article>
        </Reveal>

        {/* Comisión */}
        <Reveal delay={0.1}>
          <article className="card-andino relative flex h-full flex-col rounded-3xl border-red/35 bg-red/[0.02] p-8">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-red/10 text-red">
              <HandCoins size={22} aria-hidden="true" />
            </div>
            <h3 className="mt-5 font-serif text-2xl font-bold text-cocoa">Conectar</h3>
            <p className="mt-1 font-serif text-3xl font-bold text-red">Bs {COMMISSION_AMOUNT_BS}</p>
            <ul className="mt-6 space-y-3">
              {paidFeatures.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-cocoa/80">
                  <Check size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-red" />
                  <span className="leading-relaxed">{f}</span>
                </li>
              ))}
            </ul>
          </article>
        </Reveal>
      </div>

      <Reveal delay={0.16}>
        <div className="mt-10 flex justify-center">
          <Button as="a" href="/registro" size="lg" className="group">
            Crear cuenta gratis
            <ArrowRight size={18} aria-hidden="true" className="transition-transform group-hover:translate-x-1" />
          </Button>
        </div>
      </Reveal>
    </div>
  </section>
);

import { BadgeCheck, TrendingUp, Lock, Briefcase } from "lucide-react";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { Reveal } from "@/components/shared/Reveal";
import { ChakanaPattern } from "@/components/shared/ChakanaPattern";

const BENEFITS = [
  { icon: Lock, text: "Imposible de falsificar: anclado en blockchain." },
  { icon: TrendingUp, text: "Crece con cada trabajo, intercambio y valoración." },
  { icon: Briefcase, text: "Vendible a empresas como referencia laboral real." },
];

/**
 * Sección destacada AYNAI Score — fondo cocoa con una tarjeta tipo
 * "credencial" que simula el score del usuario. Es el CV alternativo
 * verificable, el corazón de la propuesta.
 */
export const AynaiScore = () => (
  <section className="cocoa-glow grain relative overflow-hidden py-24 sm:py-32">
    <div className="absolute inset-0 text-gold/[0.05]">
      <ChakanaPattern className="h-full w-full" />
    </div>

    <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-5 sm:px-8 lg:grid-cols-2">
      {/* Texto */}
      <div>
        <SectionHeading
          tone="light"
          align="left"
          eyebrow="AYNAI Score"
          title={
            <>
              Tu reputación, convertida en <span className="text-gradient-gold">CV verificable</span>
            </>
          }
          description="El AYNAI Score es un currículum alternativo que vive en la blockchain. Es tuyo para siempre y puedes presentarlo —incluso venderlo— a empresas como prueba de tu trayectoria."
        />

        <ul className="mt-8 space-y-4">
          {BENEFITS.map((b, i) => (
            <Reveal key={b.text} delay={i * 0.1} direction="right">
              <li className="flex items-start gap-3 text-cream/85">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gold/15 text-gold">
                  <b.icon size={16} />
                </span>
                <span className="text-[0.95rem] leading-relaxed">{b.text}</span>
              </li>
            </Reveal>
          ))}
        </ul>
      </div>

      {/* Tarjeta de score */}
      <Reveal direction="left" delay={0.1}>
        <div className="relative">
          {/* Resplandor detrás de la tarjeta */}
          <div className="absolute inset-0 -z-10 rounded-3xl bg-gold/20 blur-3xl" />

          <div className="relative overflow-hidden rounded-3xl border border-gold/25 bg-gradient-to-br from-cocoa-700 to-cocoa p-7 shadow-2xl">
            {/* Franja superior */}
            <div className="tricolor-bar absolute inset-x-0 top-0 h-1" />

            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-cream/50">AYNAI Score</p>
                <p className="mt-1 font-serif text-lg font-bold text-cream">Mara Quispe</p>
              </div>
              <BadgeCheck className="text-green" size={32} />
            </div>

            {/* Score grande */}
            <div className="mt-8 flex items-end gap-3">
              <span className="font-serif text-7xl font-bold leading-none text-gradient-gold">
                847
              </span>
              <span className="mb-2 text-sm text-cream/50">/ 1000</span>
            </div>

            {/* Barra de progreso */}
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-cream/10">
              <div className="tricolor-bar h-full rounded-full" style={{ width: "84.7%" }} />
            </div>

            {/* Métricas */}
            <div className="mt-7 grid grid-cols-3 gap-3 border-t border-cream/10 pt-6">
              {[
                { label: "Trabajos", value: "128" },
                { label: "Valoración", value: "4.9" },
                { label: "Verificado", value: "Sí" },
              ].map((m) => (
                <div key={m.label}>
                  <p className="font-serif text-xl font-bold text-cream">{m.value}</p>
                  <p className="text-[0.7rem] uppercase tracking-wide text-cream/45">{m.label}</p>
                </div>
              ))}
            </div>

            {/* Hash simulado */}
            <p className="mt-6 truncate font-mono text-[0.7rem] text-cream/35">
              0x7a3f…e91c · verificado on-chain
            </p>
          </div>
        </div>
      </Reveal>
    </div>
  </section>
);

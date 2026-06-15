import { Check, X, Sparkles, ShieldCheck, Coins } from "lucide-react";
import { COMPARISON } from "@/constants/content";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { Reveal } from "@/components/shared/Reveal";

const HIGHLIGHTS = [
  {
    icon: Sparkles,
    title: "Matching con IA",
    description: "La inteligencia artificial conecta tu habilidad con la demanda real, sin intermediarios.",
  },
  {
    icon: ShieldCheck,
    title: "AynAI Score verificable",
    description: "Usamos blockchain solo donde importa: para que tu reputación sea imposible de falsificar.",
  },
  {
    icon: Coins,
    title: "Comisión justa 10–15%",
    description: "Frente al 20–32% de la competencia. Tu trabajo rinde más en tu bolsillo.",
  },
];

/**
 * Sección Propuesta de valor — destaca los diferenciadores y muestra una
 * comparativa lado a lado entre AynAI y plataformas tradicionales.
 */
export const ValueProp = () => (
  <section className="relative bg-cream py-24 sm:py-32">
    <div className="mx-auto max-w-6xl px-5 sm:px-8">
      <SectionHeading
        eyebrow="Diferenciador"
        title="Una reputación que es tuya de verdad"
        description="No reinventamos el trabajo freelance: lo hacemos justo, verificable y accesible para todos."
      />

      {/* Tres realces */}
      <div className="mt-16 grid gap-6 md:grid-cols-3">
        {HIGHLIGHTS.map((h, i) => (
          <Reveal key={h.title} delay={i * 0.1}>
            <div className="flex h-full flex-col rounded-2xl border border-cream-300 bg-white/60 p-7">
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-green/10 text-green">
                <h.icon size={20} />
              </div>
              <h3 className="font-serif text-lg font-bold text-cocoa">{h.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-cocoa/70">{h.description}</p>
            </div>
          </Reveal>
        ))}
      </div>

      {/* Comparativa visual */}
      <Reveal delay={0.15}>
        <div className="mt-14 overflow-hidden rounded-3xl border border-cream-300 shadow-[0_24px_60px_-40px_rgba(26,10,0,0.5)]">
          <div className="grid grid-cols-1 sm:grid-cols-2">
            {/* AynAI */}
            <div className="relative border-b border-cream-300 bg-cocoa p-8 sm:border-b-0 sm:border-r">
              <div className="flex items-baseline justify-between">
                <span className="font-serif text-2xl font-bold text-cream">
                  {COMPARISON.aynai.name}
                </span>
                <span className="rounded-full bg-gold px-3 py-1 text-sm font-bold text-cocoa">
                  {COMPARISON.aynai.fee}
                </span>
              </div>
              <ul className="mt-6 space-y-3">
                {COMPARISON.aynai.points.map((p) => (
                  <li key={p.label} className="flex items-center gap-3 text-sm text-cream/85">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green text-cream">
                      <Check size={13} strokeWidth={3} />
                    </span>
                    {p.label}
                  </li>
                ))}
              </ul>
            </div>

            {/* Competencia */}
            <div className="bg-cream-200 p-8">
              <div className="flex items-baseline justify-between">
                <span className="font-serif text-2xl font-bold text-cocoa/70">
                  {COMPARISON.others.name}
                </span>
                <span className="rounded-full bg-red/10 px-3 py-1 text-sm font-bold text-red">
                  {COMPARISON.others.fee}
                </span>
              </div>
              <ul className="mt-6 space-y-3">
                {COMPARISON.others.points.map((p) => (
                  <li key={p.label} className="flex items-center gap-3 text-sm text-cocoa/55">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cocoa/10 text-cocoa/50">
                      <X size={13} strokeWidth={3} />
                    </span>
                    {p.label}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </Reveal>
    </div>
  </section>
);

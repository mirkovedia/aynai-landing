import { BMC_DATA } from "@/constants/content";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { Reveal } from "@/components/shared/Reveal";

/**
 * Acentos de color por bloque clave del canvas. Los tres bloques que cuentan
 * la historia económica usan los colores de la bandera (dorado, verde, rojo);
 * el resto mantiene el estilo neutro de tarjeta andina.
 */
const ACCENTS: Record<string, { card: string; chip: string; marker: string }> = {
  propuesta: {
    card: "border-gold/40 bg-gold/[0.04]",
    chip: "bg-gold/15 text-gold-600",
    marker: "bg-gold",
  },
  ingresos: {
    card: "border-green/35 bg-green/[0.03]",
    chip: "bg-green/15 text-green",
    marker: "bg-green",
  },
  costos: {
    card: "border-red/30 bg-red/[0.02]",
    chip: "bg-red/10 text-red",
    marker: "bg-red",
  },
};

const DEFAULT_ACCENT = {
  card: "",
  chip: "bg-cocoa/5 text-cocoa",
  marker: "bg-cocoa/40",
};

/**
 * Sección Modelo de Negocio — Business Model Canvas de AYNAI en grid 3×3.
 * Es el ancla #modelo-de-negocio de la navegación. Resalta los bloques
 * Propuesta de Valor, Ingresos y Costos con los colores andinos.
 */
export const BusinessModel = () => (
  <section
    id="modelo-de-negocio"
    className="aguayo-texture relative bg-cream py-24 sm:py-32"
  >
    <div className="mx-auto max-w-6xl px-5 sm:px-8">
      <SectionHeading
        eyebrow="Modelo de Negocio"
        title={
          <>
            El <span className="text-gradient-gold">Business Model Canvas</span> de AYNAI
          </>
        }
        description="Cómo creamos, entregamos y capturamos valor: nueve bloques que sostienen un marketplace inclusivo y rentable."
      />

      <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {BMC_DATA.map((block, i) => {
          const accent = ACCENTS[block.id] ?? DEFAULT_ACCENT;
          return (
            <Reveal key={block.id} delay={(i % 3) * 0.08}>
              <article
                className={`card-andino flex h-full flex-col rounded-2xl p-6 ${accent.card}`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${accent.chip}`}
                  >
                    <block.icon size={20} aria-hidden="true" />
                  </span>
                  <h3 className="font-serif text-lg font-bold leading-tight text-cocoa">
                    {block.title}
                  </h3>
                </div>

                <p className="mt-4 text-sm leading-relaxed text-cocoa/65">
                  {block.description}
                </p>

                <ul className="mt-4 space-y-2.5 border-t border-cream-300 pt-4">
                  {block.items.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2.5 text-[0.82rem] leading-relaxed text-cocoa/80"
                    >
                      <span
                        aria-hidden="true"
                        className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${accent.marker}`}
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </article>
            </Reveal>
          );
        })}
      </div>
    </div>
  </section>
);

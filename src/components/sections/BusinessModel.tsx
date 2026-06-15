import { LayoutGrid, Clock } from "lucide-react";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { Reveal } from "@/components/shared/Reveal";

// Etiquetas de los 9 bloques del Business Model Canvas (placeholder visual)
const BMC_BLOCKS = [
  "Socios Clave",
  "Actividades Clave",
  "Propuesta de Valor",
  "Relación con Clientes",
  "Segmentos de Clientes",
  "Recursos Clave",
  "Canales",
  "Estructura de Costos",
  "Fuentes de Ingreso",
];

/**
 * Sección Modelo de Negocio (BMC) — espacio reservado que pide la consigna.
 * Muestra un recuadro estilizado vacío listo para incrustar el Business
 * Model Canvas completo más adelante.
 */
export const BusinessModel = () => (
  <section id="modelo-de-negocio" className="aguayo-texture relative bg-cream py-24 sm:py-32">
    <div className="mx-auto max-w-6xl px-5 sm:px-8">
      <SectionHeading
        eyebrow="Modelo de Negocio"
        title="Business Model Canvas — Próximamente"
        description="Aquí se mostrará el Business Model Canvas completo de AynAI. Este es el espacio reservado para incrustarlo."
      />

      <Reveal delay={0.1}>
        <div className="mt-14 rounded-3xl border-2 border-dashed border-cocoa/20 bg-white/50 p-6 sm:p-10">
          {/* Cabecera del recuadro */}
          <div className="mb-6 flex items-center justify-center gap-2 text-cocoa/50">
            <LayoutGrid size={18} />
            <span className="text-sm font-semibold uppercase tracking-[0.18em]">
              Lienzo del modelo
            </span>
          </div>

          {/* Grilla placeholder de los 9 bloques */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {BMC_BLOCKS.map((block) => (
              <div
                key={block}
                className="flex min-h-[88px] flex-col items-center justify-center rounded-xl border border-cream-300 bg-cream/70 p-4 text-center transition-colors hover:border-gold/50"
              >
                <span className="text-xs font-medium uppercase tracking-wide text-cocoa/55">
                  {block}
                </span>
              </div>
            ))}
          </div>

          {/* Aviso de próximamente */}
          <div className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-gold/10 py-3 text-sm font-medium text-gold-600">
            <Clock size={16} />
            Contenido en preparación
          </div>
        </div>
      </Reveal>
    </div>
  </section>
);

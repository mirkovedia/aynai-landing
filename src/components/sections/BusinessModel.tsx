"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutGrid, X, ArrowRight, HelpCircle } from "lucide-react";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { Reveal } from "@/components/shared/Reveal";
import { BMC_DATA, type BmcBlock } from "@/constants/content";
import { cn } from "@/lib/utils";

// Clases de distribución responsiva basadas en la grilla del Canvas clásico de Osterwalder
const gridClasses: Record<string, string> = {
  socios: "md:col-span-2 md:row-span-2 min-h-[180px] md:min-h-[340px]",
  actividades: "md:col-span-2 md:row-span-1 min-h-[140px] md:min-h-[162px]",
  recursos: "md:col-span-2 md:row-span-1 min-h-[140px] md:min-h-[162px]",
  propuesta: "md:col-span-2 md:row-span-2 min-h-[180px] md:min-h-[340px] border-red/20 bg-red/[0.01]",
  relaciones: "md:col-span-2 md:row-span-1 min-h-[140px] md:min-h-[162px]",
  canales: "md:col-span-2 md:row-span-1 min-h-[140px] md:min-h-[162px]",
  segmentos: "md:col-span-2 md:row-span-2 min-h-[180px] md:min-h-[340px]",
  costos: "md:col-span-5 md:row-span-1 min-h-[140px] md:min-h-[162px]",
  ingresos: "md:col-span-5 md:row-span-1 min-h-[140px] md:min-h-[162px]",
};

/**
 * Sección Modelo de Negocio (BMC) Interactivo.
 * Renderiza el lienzo del Business Model Canvas estructurado.
 * Al hacer clic en un bloque se abre un modal animado detallado.
 */
export const BusinessModel = () => {
  const [activeBlock, setActiveBlock] = useState<BmcBlock | null>(null);

  // Cerrar el modal al presionar la tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActiveBlock(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Bloquear scroll de la página cuando el modal está abierto
  useEffect(() => {
    if (activeBlock) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [activeBlock]);

  return (
    <section id="modelo-de-negocio" className="aguayo-texture relative bg-cream py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <SectionHeading
          eyebrow="Modelo de Negocio"
          title="Lienzo de Negocio Interactivo (BMC)"
          description="Explora la estrategia comercial y de sostenibilidad de AynAI. Haz clic en cualquiera de los 9 bloques del Canvas para ver los detalles clave."
        />

        <Reveal delay={0.1}>
          <div className="mt-14 rounded-3xl border border-cream-300 bg-white/40 p-5 shadow-[0_24px_70px_-40px_rgba(26,10,0,0.35)] backdrop-blur-sm sm:p-7">
            {/* Cabecera del Lienzo */}
            <div className="mb-6 flex items-center justify-between border-b border-cream-300 pb-4 text-cocoa/60">
              <div className="flex items-center gap-2">
                <LayoutGrid size={18} className="text-red" />
                <span className="font-serif text-sm font-bold uppercase tracking-wider text-cocoa">
                  AynAI Business Model Canvas
                </span>
              </div>
              <span className="hidden text-xs font-semibold text-cocoa/40 sm:inline-flex items-center gap-1">
                <HelpCircle size={13} />
                Haz clic en un bloque para expandir
              </span>
            </div>

            {/* Lienzo del Canvas (5 columnas en desktop, responsive en móvil) */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-10">
              {BMC_DATA.map((block) => {
                const IconComponent = block.icon;
                const isPropuesta = block.id === "propuesta";

                return (
                  <button
                    key={block.id}
                    onClick={() => setActiveBlock(block)}
                    className={cn(
                      "group relative flex flex-col justify-between rounded-2xl border text-left p-5 transition-all duration-300",
                      "bg-white hover:bg-cream/40 border-cream-300 hover:border-gold hover:shadow-[0_12px_24px_-10px_rgba(26,10,0,0.1)]",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2",
                      isPropuesta && "border-red/35 bg-red/[0.02] hover:border-red",
                      gridClasses[block.id]
                    )}
                  >
                    <div>
                      {/* Icono + Título */}
                      <div className="flex items-center justify-between">
                        <span className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                          isPropuesta ? "bg-red/10 text-red" : "bg-cocoa/5 text-cocoa/75 group-hover:bg-gold group-hover:text-cocoa"
                        )}>
                          <IconComponent size={16} />
                        </span>
                        <span className="text-[0.65rem] font-bold uppercase tracking-widest text-cocoa/30 group-hover:text-cocoa/50">
                          {block.id}
                        </span>
                      </div>

                      <h3 className="mt-4 font-serif text-base font-bold leading-tight text-cocoa">
                        {block.title}
                      </h3>
                      <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-cocoa/60">
                        {block.description}
                      </p>
                    </div>

                    <span className="mt-4 inline-flex items-center gap-1 text-[0.7rem] font-semibold uppercase tracking-wider text-red opacity-0 transition-all duration-300 translate-x-[-4px] group-hover:opacity-100 group-hover:translate-x-0">
                      Ver detalles
                      <ArrowRight size={10} />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </Reveal>
      </div>

      {/* Modal Interactivo de Detalle (Overlay) */}
      <AnimatePresence>
        {activeBlock && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Fondo oscurecido con desenfoque */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveBlock(null)}
              className="absolute inset-0 bg-cocoa/50 backdrop-blur-sm"
            />

            {/* Tarjeta Modal Popover */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="card-andino relative z-10 w-full max-w-lg overflow-hidden rounded-3xl p-6 sm:p-8"
            >
              {/* Barra tricolor superior */}
              <div className="tricolor-bar absolute inset-x-0 top-0 h-1.5" />

              {/* Botón Cerrar */}
              <button
                type="button"
                onClick={() => setActiveBlock(null)}
                aria-label="Cerrar modal"
                className="absolute right-4 top-4 rounded-full p-2 text-cocoa/40 transition-colors hover:bg-cocoa/5 hover:text-cocoa focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              >
                <X size={18} />
              </button>

              {/* Contenido del Bloque */}
              <div className="mt-2 flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-red/10 text-red">
                  {(() => {
                    const BlockIcon = activeBlock.icon;
                    return <BlockIcon size={22} />;
                  })()}
                </span>
                <div>
                  <p className="text-[0.65rem] font-bold uppercase tracking-widest text-red">
                    Bloque del Canvas
                  </p>
                  <h3 className="font-serif text-xl font-bold text-cocoa">
                    {activeBlock.title}
                  </h3>
                </div>
              </div>

              <p className="mt-5 text-sm leading-relaxed text-cocoa/80">
                {activeBlock.description}
              </p>

              {/* Puntos clave */}
              <div className="mt-6">
                <h4 className="font-serif text-xs font-bold uppercase tracking-wider text-cocoa/50 border-b border-cream-300 pb-2">
                  Elementos Estratégicos
                </h4>
                <ul className="mt-3 space-y-2.5">
                  {activeBlock.items.map((item, idx) => (
                    <motion.li
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 + 0.1 }}
                      key={idx}
                      className="flex items-start gap-2.5 text-xs text-cocoa/75"
                    >
                      <span className="mt-1 flex h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                      <span className="leading-relaxed">{item}</span>
                    </motion.li>
                  ))}
                </ul>
              </div>

              {/* Footer del Modal */}
              <div className="mt-8 flex justify-end">
                <button
                  type="button"
                  onClick={() => setActiveBlock(null)}
                  className="rounded-full bg-cocoa px-5 py-2 text-[0.8rem] font-semibold text-cream hover:bg-cocoa-800 transition-colors"
                >
                  Entendido
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

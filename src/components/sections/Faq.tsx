"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { Reveal } from "@/components/shared/Reveal";
import { COMMISSION_AMOUNT_BS } from "@/lib/payments/constants";

const FAQS = [
  {
    q: "¿Es gratis unirse a AynAI?",
    a: "Sí. Crear tu perfil, explorar el marketplace y proponer todos los Aynis que quieras es completamente gratis. Solo pagas cuando ambas partes deciden concretar una conexión.",
  },
  {
    q: `¿Cuánto cuesta conectar? ¿Hay costos ocultos?`,
    a: `La única comisión es Bs ${COMMISSION_AMOUNT_BS} por conexión concretada. Se paga una sola vez, solo cuando los dos aceptan el Ayni. Sin suscripción, sin porcentaje del valor del intercambio, sin sorpresas.`,
  },
  {
    q: "¿Qué es un Ayni?",
    a: "Un Ayni es un intercambio de habilidades: tú ofreces algo que sabes hacer y recibes a cambio algo que necesitas. Por ejemplo, diseño gráfico a cambio de clases de inglés. El nombre viene de la tradición andina de reciprocidad.",
  },
  {
    q: "¿Cómo sé que la otra persona cumplirá?",
    a: "El AynAI Score es el mecanismo de confianza: cada vez que alguien no cumple o recibe malas valoraciones, su score baja. Eso desincentiva el incumplimiento. Además, solo se revela el contacto después del pago, por lo que ambas partes tienen piel en el juego.",
  },
  {
    q: "¿Cuándo me dan el contacto de la otra persona?",
    a: `Inmediatamente después de que ambas partes aceptan el Ayni y se procesa el pago de Bs ${COMMISSION_AMOUNT_BS}. En ese momento se revela el número de WhatsApp para que coordinen directamente.`,
  },
  {
    q: "¿Qué es el AynAI Score y para qué sirve?",
    a: "El AynAI Score es tu reputación verificable: una puntuación de 0 a 1000 que crece con cada intercambio completado y valoración recibida. Está anclada on-chain, por lo que nadie puede falsificarla ni quitártela. Puedes presentarla a empresas como prueba real de tu trayectoria.",
  },
  {
    q: "¿AynAI solo funciona en Bolivia?",
    a: "Estamos enfocados inicialmente en Bolivia, pero cualquier persona de habla hispana puede crear su cuenta y participar. El pago actualmente es en bolivianos (Bs); estamos explorando opciones de pago regionales.",
  },
  {
    q: "¿Mis datos personales están seguros?",
    a: "Sí. Tu número de WhatsApp solo se comparte con la persona específica con quien concretaste un Ayni, después del pago. No vendemos ni compartimos tu información con terceros.",
  },
] as const;

type FaqItem = (typeof FAQS)[number];

const FaqRow = ({ item, isOpen, onToggle }: { item: FaqItem; isOpen: boolean; onToggle: () => void }) => (
  <div className={cn("border-b border-cocoa/10 last:border-0")}>
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={isOpen}
      className="flex w-full items-center justify-between gap-4 py-5 text-left transition-colors hover:text-red"
    >
      <span className="text-[0.95rem] font-semibold leading-snug text-cocoa">{item.q}</span>
      <span
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cocoa/5 transition-transform duration-300",
          isOpen && "rotate-45 bg-red/10 text-red"
        )}
      >
        <Plus size={16} className={cn("text-cocoa/60", isOpen && "text-red")} aria-hidden="true" />
      </span>
    </button>

    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-hidden"
        >
          <p className="pb-5 text-sm leading-relaxed text-cocoa/70">{item.a}</p>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

/**
 * Sección FAQ — acordeón animado con las preguntas más frecuentes.
 * Aclara el modelo de comisión, la seguridad y el AynAI Score.
 */
export const Faq = () => {
  const [open, setOpen] = useState<number | null>(0);

  const toggle = (i: number) => setOpen((prev) => (prev === i ? null : i));

  return (
    <section className="relative bg-cream py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <SectionHeading
          eyebrow="Preguntas frecuentes"
          title={
            <>
              Todo lo que quieres{" "}
              <span className="text-gradient-gold">saber antes de entrar</span>
            </>
          }
          description="Respondemos las dudas más comunes sobre cómo funciona AynAI, la comisión y tu privacidad."
        />

        <div className="mt-14 grid gap-6 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
          {/* Columna izquierda: primera mitad */}
          <Reveal>
            <div className="divide-y-0 rounded-2xl border border-cocoa/10 bg-white px-6 shadow-sm">
              {FAQS.slice(0, Math.ceil(FAQS.length / 2)).map((item, i) => (
                <FaqRow
                  key={item.q}
                  item={item}
                  isOpen={open === i}
                  onToggle={() => toggle(i)}
                />
              ))}
            </div>
          </Reveal>

          {/* Columna derecha: segunda mitad */}
          <Reveal delay={0.08}>
            <div className="divide-y-0 rounded-2xl border border-cocoa/10 bg-white px-6 shadow-sm">
              {FAQS.slice(Math.ceil(FAQS.length / 2)).map((item, i) => {
                const idx = i + Math.ceil(FAQS.length / 2);
                return (
                  <FaqRow
                    key={item.q}
                    item={item}
                    isOpen={open === idx}
                    onToggle={() => toggle(idx)}
                  />
                );
              })}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
};

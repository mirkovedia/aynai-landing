"use client";

import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChakanaPattern } from "@/components/shared/ChakanaPattern";
import { TricolorStripe } from "@/components/shared/TricolorStripe";
import { COMMISSION_AMOUNT_BS } from "@/lib/payments/constants";

// Variantes de stagger para la entrada secuencial del hero
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
};

// Métricas honestas alineadas al modelo de comisión transparente.
const STATS = [
  { value: "Gratis", label: "Explorar y proponer" },
  { value: `Bs ${COMMISSION_AMOUNT_BS}`, label: "Solo al conectar" },
  { value: "100%", label: "Reputación tuya" },
];

/**
 * Sección Hero — fondo cocoa con textura chakana, resplandor cálido y grano.
 * Producto vivo: CTA primario al registro, secundario a "cómo funciona".
 */
export const Hero = () => (
  <section id="inicio" className="cocoa-glow grain relative overflow-hidden">
    {/* Patrón geométrico andino sutil */}
    <div aria-hidden="true" className="absolute inset-0 text-gold/[0.07]">
      <ChakanaPattern className="h-full w-full" />
    </div>

    {/* Halos de color difusos */}
    <div aria-hidden="true" className="pointer-events-none absolute -left-32 top-20 h-72 w-72 rounded-full bg-red/20 blur-[120px]" />
    <div aria-hidden="true" className="pointer-events-none absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-green/20 blur-[120px]" />

    <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-5 pb-20 pt-28 text-center sm:px-8">
      <motion.div variants={container} initial="hidden" animate="show">
        <motion.div variants={item}>
          <span className="mb-7 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-gold">
            <Sparkles size={14} aria-hidden="true" />
            Marketplace de habilidades · ya disponible
          </span>
        </motion.div>

        <motion.h1
          variants={item}
          className="font-serif text-[2.6rem] font-bold leading-[1.04] tracking-tight text-cream sm:text-6xl md:text-7xl"
        >
          Tu talento vale.
          <br />
          <span className="text-gradient-gold">Conéctalo.</span>
        </motion.h1>

        <motion.p
          variants={item}
          className="mx-auto mt-7 max-w-2xl text-lg leading-relaxed text-cream/75 sm:text-xl"
        >
          AynAI es el marketplace donde intercambias habilidades y construyes una
          reputación verificable. Explora gratis y conecta con quien necesitas.
        </motion.p>

        <motion.div
          variants={item}
          className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <Button as="a" href="/registro" size="lg" className="group w-full sm:w-auto">
            Crear cuenta gratis
            <ArrowRight size={18} aria-hidden="true" className="transition-transform group-hover:translate-x-1" />
          </Button>
          <Button as="a" href="#como-funciona" variant="outline" size="lg" className="w-full sm:w-auto">
            Ver cómo funciona
          </Button>
        </motion.div>
      </motion.div>

      {/* Métricas de confianza */}
      <motion.dl
        variants={item}
        initial="hidden"
        animate="show"
        transition={{ delay: 0.7 }}
        className="mt-16 grid w-full max-w-lg grid-cols-3 gap-4 border-t border-cream/10 pt-8"
      >
        {STATS.map((stat) => (
          <div key={stat.label} className="text-center">
            <dt className="font-serif text-2xl font-bold text-gold sm:text-3xl">{stat.value}</dt>
            <dd className="mt-1 text-xs text-cream/60">{stat.label}</dd>
          </div>
        ))}
      </motion.dl>
    </div>

    <TricolorStripe />
  </section>
);

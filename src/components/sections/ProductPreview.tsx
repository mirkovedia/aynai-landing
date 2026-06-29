"use client";

import { useEffect, useState } from "react";
import {
  motion,
  AnimatePresence,
  animate,
  useMotionValue,
  useTransform,
} from "framer-motion";
import {
  Search,
  Star,
  BadgeCheck,
  Check,
  ArrowRight,
  HandCoins,
  MessageCircle,
  Sparkles,
  Repeat,
} from "lucide-react";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { COMMISSION_AMOUNT_BS } from "@/lib/payments/constants";

/**
 * Sección "AynAI en acción" — un frame de navegador que reproduce solo el
 * flujo real del producto: explorar → proponer → conectar (pagar Bs X) →
 * subir el AynAI Score. Demuestra que la app existe de verdad, con animaciones
 * profesionales. Es el ancla #producto.
 */

const PEOPLE = [
  { name: "Mara Quispe", role: "Diseño UX", skill: "Diseño UX", score: 892, rating: "4.9", featured: true },
  { name: "Tomás Rojas", role: "Desarrollo web", skill: "Next.js", score: 815, rating: "4.8" },
  { name: "Lucía Mamani", role: "Marketing digital", skill: "Ads", score: 770, rating: "4.7" },
  { name: "Iván Flores", role: "Fotografía", skill: "Producto", score: 845, rating: "5.0" },
];

const STEPS = [
  { id: "explorar", label: "Explora" },
  { id: "proponer", label: "Propón un Ayni" },
  { id: "conectar", label: "Paga y conecta" },
  { id: "score", label: "Tu Score sube" },
] as const;

const ROTATE_MS = 3400;

/** Iniciales para avatares ficticios. */
const initials = (name: string) =>
  name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");

/** Contador animado del score con framer-motion (sin re-renders por frame). */
const ScoreCounter = ({ target }: { target: number }) => {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v));
  useEffect(() => {
    const controls = animate(count, target, { duration: 1.4, ease: [0.22, 1, 0.36, 1] });
    return controls.stop;
  }, [count, target]);
  return <motion.span>{rounded}</motion.span>;
};

const screenVariants = {
  enter: { opacity: 0, y: 16, scale: 0.985 },
  center: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -16, scale: 0.985 },
};

/* ── Pantallas ──────────────────────────────────────────────────────── */

const ExploreScreen = () => (
  <div className="flex h-full flex-col">
    <div className="flex items-center gap-2 rounded-xl border border-cream-300 bg-white px-3 py-2 text-sm text-cocoa/50">
      <Search size={16} aria-hidden="true" />
      <span>Buscar habilidad o persona…</span>
    </div>
    <div className="mt-3 flex flex-wrap gap-2">
      {["Diseño", "Desarrollo", "Marketing", "Fotografía"].map((c, i) => (
        <span
          key={c}
          className={`rounded-full px-3 py-1 text-[0.7rem] font-medium ${
            i === 0 ? "bg-cocoa text-cream" : "bg-cocoa/5 text-cocoa/70"
          }`}
        >
          {c}
        </span>
      ))}
    </div>
    <div className="mt-4 grid flex-1 grid-cols-2 gap-3">
      {PEOPLE.map((p, i) => (
        <motion.div
          key={p.name}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 + i * 0.08, duration: 0.4 }}
          className={`flex flex-col rounded-2xl border p-3 ${
            p.featured ? "border-gold/50 bg-gold/[0.04]" : "border-cream-300 bg-white"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-cocoa font-serif text-xs font-bold text-cream">
              {initials(p.name)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[0.8rem] font-bold text-cocoa">{p.name}</p>
              <p className="truncate text-[0.68rem] text-cocoa/55">{p.role}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="inline-flex items-center gap-1 rounded-md bg-cream-200 px-1.5 py-0.5 text-[0.62rem] font-semibold text-cocoa/70">
              <Sparkles size={10} aria-hidden="true" className="text-gold-600" />
              {p.skill}
            </span>
            <span className="inline-flex items-center gap-1 text-[0.68rem] font-bold text-cocoa">
              <Star size={11} aria-hidden="true" className="fill-gold text-gold" />
              {p.rating}
            </span>
          </div>
        </motion.div>
      ))}
    </div>
  </div>
);

const ProposeScreen = () => (
  <div className="flex h-full flex-col items-center justify-center">
    <div className="w-full max-w-sm rounded-2xl border border-cream-300 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-cocoa font-serif text-sm font-bold text-cream">
          MQ
        </span>
        <div>
          <p className="text-sm font-bold text-cocoa">Propones un Ayni a Mara</p>
          <p className="text-[0.72rem] text-cocoa/55">Diseño UX · Score 892</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="rounded-xl bg-green/10 p-3 text-center">
          <p className="text-[0.6rem] font-semibold uppercase tracking-wide text-green">Tú ofreces</p>
          <p className="mt-1 text-[0.78rem] font-bold text-cocoa">Desarrollo web</p>
        </div>
        <Repeat size={18} aria-hidden="true" className="text-gold-600" />
        <div className="rounded-xl bg-red/10 p-3 text-center">
          <p className="text-[0.6rem] font-semibold uppercase tracking-wide text-red">Tú pides</p>
          <p className="mt-1 text-[0.78rem] font-bold text-cocoa">Diseño UX</p>
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-cream-200 px-3 py-2 text-[0.72rem] italic text-cocoa/60">
        “Hola Mara, te armo tu portfolio web a cambio de un rediseño de mi logo.”
      </div>

      <motion.div
        initial={{ scale: 1 }}
        animate={{ scale: [1, 1.04, 1] }}
        transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 0.6 }}
        className="mt-4"
      >
        <div className="flex items-center justify-center gap-2 rounded-xl bg-cocoa py-2.5 text-sm font-semibold text-cream">
          Enviar propuesta
          <ArrowRight size={15} aria-hidden="true" />
        </div>
      </motion.div>
    </div>
  </div>
);

const ConnectScreen = () => (
  <div className="flex h-full flex-col items-center justify-center text-center">
    <motion.span
      initial={{ scale: 0, rotate: -20 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 14 }}
      className="flex h-16 w-16 items-center justify-center rounded-full bg-green text-cream shadow-lg"
    >
      <Check size={32} aria-hidden="true" strokeWidth={3} />
    </motion.span>
    <p className="mt-5 font-serif text-xl font-bold text-cocoa">¡Conexión concretada!</p>
    <p className="mt-1 text-sm text-cocoa/60">Ambos aceptaron el Ayni.</p>

    <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-cocoa px-4 py-2 text-sm font-semibold text-cream">
      <HandCoins size={16} aria-hidden="true" className="text-gold" />
      Bs {COMMISSION_AMOUNT_BS} pagados · contacto revelado
    </div>

    <div className="mt-4 flex items-center gap-2 rounded-xl border border-green/30 bg-green/5 px-4 py-2.5 text-sm font-medium text-cocoa">
      <MessageCircle size={16} aria-hidden="true" className="text-green" />
      +591 7•• ••• ••• · coordina por WhatsApp
    </div>
  </div>
);

const ScoreScreen = () => (
  <div className="flex h-full flex-col items-center justify-center">
    <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-gold/30 bg-gradient-to-br from-cocoa-700 to-cocoa p-5 text-cream shadow-xl">
      <div className="tricolor-bar h-1 w-full rounded-full" />
      <div className="mt-4 flex items-center justify-between">
        <div>
          <p className="text-[0.62rem] uppercase tracking-[0.2em] text-cream/50">AynAI Score</p>
          <p className="mt-0.5 font-serif text-sm font-bold">Tú · Desarrollo web</p>
        </div>
        <BadgeCheck size={26} aria-hidden="true" className="text-green" />
      </div>

      <div className="mt-4 flex items-end gap-2">
        <span className="font-serif text-6xl font-bold leading-none text-gradient-gold">
          <ScoreCounter target={892} />
        </span>
        <span className="mb-1.5 text-xs text-cream/50">/ 1000</span>
      </div>

      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-cream/10">
        <motion.div
          className="tricolor-bar h-full rounded-full"
          initial={{ width: "0%" }}
          animate={{ width: "89.2%" }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="mt-4 flex items-center justify-between border-t border-cream/10 pt-4"
      >
        <span className="inline-flex items-center gap-1.5 text-sm">
          <Star size={14} aria-hidden="true" className="fill-gold text-gold" />
          5.0 de Mara Quispe
        </span>
        <span className="rounded-full bg-green/15 px-2.5 py-1 text-[0.7rem] font-bold text-green">
          +12 pts
        </span>
      </motion.div>
    </div>
  </div>
);

const SCREENS = [ExploreScreen, ProposeScreen, ConnectScreen, ScoreScreen];

/* ── Sección ────────────────────────────────────────────────────────── */

export const ProductPreview = () => {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = window.setTimeout(
      () => setActive((s) => (s + 1) % STEPS.length),
      ROTATE_MS
    );
    return () => window.clearTimeout(id);
  }, [active, paused]);

  const Screen = SCREENS[active];
  const showToast = active === 2; // notificación al concretar la conexión

  return (
    <section id="producto" className="relative bg-cream-200 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <SectionHeading
          eyebrow="El producto, en vivo"
          title={
            <>
              Mira AynAI <span className="text-gradient-gold">en acción</span>
            </>
          }
          description="No es una promesa: es el producto real funcionando. Mira el flujo completo de un Ayni, de explorar a construir reputación."
        />

        <div className="mt-14 grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          {/* Frame de navegador */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            className="relative"
          >
            {/* Resplandor */}
            <div aria-hidden="true" className="absolute -inset-4 -z-10 rounded-[2rem] bg-gold/10 blur-3xl" />

            <div className="overflow-hidden rounded-2xl border border-cream-300 bg-white shadow-2xl">
              {/* Barra del navegador */}
              <div className="flex items-center gap-2 border-b border-cream-300 bg-cream px-4 py-3">
                <span className="h-3 w-3 rounded-full bg-red/70" />
                <span className="h-3 w-3 rounded-full bg-gold/80" />
                <span className="h-3 w-3 rounded-full bg-green/70" />
                <div className="ml-3 flex flex-1 items-center justify-center">
                  <span className="rounded-md bg-white px-3 py-1 text-[0.7rem] text-cocoa/50">
                    app.aynai.com/{STEPS[active].id}
                  </span>
                </div>
              </div>

              {/* Viewport con las pantallas */}
              <div className="relative h-[360px] bg-cream-200 p-5 sm:h-[400px]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={active}
                    variants={screenVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                    className="h-full"
                  >
                    <Screen />
                  </motion.div>
                </AnimatePresence>

                {/* Notificación flotante */}
                <AnimatePresence>
                  {showToast && (
                    <motion.div
                      initial={{ opacity: 0, x: 40, y: -10 }}
                      animate={{ opacity: 1, x: 0, y: 0 }}
                      exit={{ opacity: 0, x: 40 }}
                      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                      className="absolute right-4 top-4 flex items-center gap-2.5 rounded-xl border border-cream-300 bg-white px-3.5 py-2.5 shadow-lg"
                    >
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-green/15 text-green">
                        <Check size={14} aria-hidden="true" strokeWidth={3} />
                      </span>
                      <span className="text-[0.75rem] font-medium text-cocoa">
                        Mara aceptó tu Ayni
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>

          {/* Timeline de pasos */}
          <ol className="space-y-2">
            {STEPS.map((step, i) => {
              const isActive = i === active;
              return (
                <li key={step.id}>
                  <button
                    type="button"
                    onClick={() => setActive(i)}
                    aria-current={isActive ? "step" : undefined}
                    className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-colors ${
                      isActive
                        ? "border-gold/40 bg-white shadow-sm"
                        : "border-transparent bg-transparent hover:bg-white/60"
                    }`}
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-sans text-sm font-bold transition-colors ${
                        isActive ? "bg-cocoa text-cream" : "bg-cocoa/10 text-cocoa/60"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span
                      className={`text-sm font-semibold transition-colors ${
                        isActive ? "text-cocoa" : "text-cocoa/55"
                      }`}
                    >
                      {step.label}
                    </span>
                    {isActive && (
                      <motion.span
                        layoutId="step-dot"
                        className="ml-auto h-2 w-2 rounded-full bg-gold"
                      />
                    )}
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
};

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { completeOnboarding } from "./actions";

interface Step {
  icon: string;
  title: string;
  description: string;
  cta: string;
  href?: string;
}

const STEPS: Step[] = [
  {
    icon: "🧑‍💼",
    title: "Completa tu perfil",
    description:
      "Agrega tu foto, bio, ubicación y disponibilidad. Un perfil completo aparece más veces en el marketplace y sube tu AYNAI Score.",
    cta: "Ir a mi perfil",
    href: "/perfil/editar",
  },
  {
    icon: "🛠️",
    title: "Agrega tus habilidades",
    description:
      'En tu perfil define qué ofreces (ej. "Diseño web") y qué buscas (ej. "Clases de inglés"). Así el algoritmo te hace matches perfectos.',
    cta: "Agregar habilidades",
    href: "/perfil/editar",
  },
  {
    icon: "🤝",
    title: "Haz tu primer Ayni",
    description:
      "Explora el marketplace, encuentra a alguien que tenga lo que buscas, y propón tu primer intercambio. ¡Es gratis hacerlo!",
    cta: "Explorar marketplace",
    href: "/marketplace",
  },
];

interface Props {
  name: string;
}

/** Wizard de bienvenida de 3 pasos para nuevos usuarios. */
export const OnboardingWizard = ({ name }: Props) => {
  const [step, setStep] = useState(0);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const currentStep = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      startTransition(async () => {
        await completeOnboarding();
        router.push(currentStep.href ?? "/marketplace");
      });
    } else {
      setStep((s) => s + 1);
    }
  };

  const handleSkip = () => {
    startTransition(async () => {
      await completeOnboarding();
      router.push("/dashboard");
    });
  };

  return (
    <div className="w-full max-w-md">
      {/* Cabecera */}
      <div className="mb-8 text-center">
        <p className="font-serif text-4xl font-bold text-cocoa">
          ¡Bienvenido, {name}!
        </p>
        <p className="mt-2 text-sm text-cocoa/60">
          3 pasos para empezar a hacer Ayni
        </p>
      </div>

      {/* Indicador de pasos */}
      <div className="mb-6 flex justify-center gap-2">
        {STEPS.map((_, i) => (
          <span
            key={i}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === step ? "w-8 bg-cocoa" : i < step ? "w-2 bg-cocoa/40" : "w-2 bg-cream-300"
            }`}
          />
        ))}
      </div>

      {/* Tarjeta del paso */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25 }}
          className="rounded-3xl border border-cream-300 bg-white p-8 shadow-sm text-center"
        >
          <span className="text-5xl" aria-hidden="true">{currentStep.icon}</span>
          <h2 className="mt-4 font-serif text-2xl font-bold text-cocoa">
            {currentStep.title}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-cocoa/70">
            {currentStep.description}
          </p>

          <button
            type="button"
            disabled={pending}
            onClick={handleNext}
            className="mt-6 w-full rounded-full bg-cocoa py-3 text-sm font-semibold text-cream transition-colors hover:bg-cocoa/90 disabled:opacity-60"
          >
            {pending ? "Cargando…" : isLast ? currentStep.cta : `${currentStep.cta} →`}
          </button>

          {!isLast && (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              className="mt-3 w-full rounded-full py-2 text-sm text-cocoa/50 hover:text-cocoa transition-colors"
            >
              Ver siguiente paso
            </button>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Saltar */}
      <div className="mt-5 text-center">
        <button
          type="button"
          disabled={pending}
          onClick={handleSkip}
          className="text-sm text-cocoa/40 hover:text-cocoa/70 transition-colors"
        >
          Saltar por ahora →
        </button>
      </div>
    </div>
  );
};

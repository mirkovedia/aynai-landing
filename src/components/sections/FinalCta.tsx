"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChakanaPattern } from "@/components/shared/ChakanaPattern";
import { Reveal } from "@/components/shared/Reveal";

/**
 * CTA final — fondo cocoa con franja tricolor superior y un formulario de
 * email (validación visual). Es el ancla #contacto de la navegación.
 */
export const FinalCta = () => {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  // Por ahora el envío es solo visual: confirma localmente sin backend.
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email.includes("@")) return;
    setSent(true);
  };

  return (
    <section id="contacto" className="relative overflow-hidden">
      <div className="tricolor-bar h-1.5 w-full" />

      <div className="cocoa-glow grain relative overflow-hidden py-24 sm:py-32">
        <div className="absolute inset-0 text-gold/[0.06]">
          <ChakanaPattern className="h-full w-full" />
        </div>

        <div className="relative mx-auto max-w-3xl px-5 text-center sm:px-8">
          <Reveal>
            <h2 className="font-serif text-4xl font-bold leading-[1.08] tracking-tight text-cream sm:text-5xl">
              Sé parte de la economía del{" "}
              <span className="text-gradient-gold">talento justo</span>
            </h2>
          </Reveal>

          <Reveal delay={0.08}>
            <p className="mx-auto mt-6 max-w-xl text-lg text-cream/75">
              Únete a la lista y sé de los primeros en construir una reputación que
              nadie podrá quitarte.
            </p>
          </Reveal>

          <Reveal delay={0.16}>
            {sent ? (
              <div className="mx-auto mt-10 max-w-md rounded-3xl border border-green/30 bg-green/[0.03] p-6 text-cream shadow-xl backdrop-blur-sm">
                <div className="flex items-center justify-center gap-2.5">
                  <CheckCircle2 className="text-green" size={24} />
                  <span className="font-serif text-lg font-bold text-cream">¡Registro Exitoso!</span>
                </div>
                <p className="mt-3 text-sm text-cream/70 leading-relaxed">
                  Hemos guardado tu correo. Para asegurar tu acceso a la beta y recibir tu AynAI Score inicial, por favor responde nuestra encuesta de validación rápida.
                </p>
                <div className="mt-5">
                  <Button
                    as="a"
                    href="https://forms.gle/RmAjLuPnACvt5rzj7"
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="gold"
                    className="w-full group"
                  >
                    Responder Encuesta en Google Forms
                    <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                  </Button>
                </div>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="mx-auto mt-10 flex max-w-md flex-col gap-3 sm:flex-row"
              >
                <label htmlFor="cta-email" className="sr-only">
                  Correo electrónico
                </label>
                <input
                  id="cta-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@correo.com"
                  className="w-full flex-1 rounded-full border border-cream/20 bg-cream/5 px-5 py-3.5 text-cream placeholder:text-cream/40 focus:border-gold/60 focus:outline-none focus:ring-2 focus:ring-gold/30"
                />
                <Button type="submit" size="lg" className="group shrink-0">
                  Únete ahora
                  <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                </Button>
              </form>
            )}
          </Reveal>

          <Reveal delay={0.24}>
            <p className="mt-5 text-xs text-cream/40">
              Sin spam. Solo novedades sobre el lanzamiento de AynAI.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
};

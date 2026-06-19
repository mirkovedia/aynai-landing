import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChakanaPattern } from "@/components/shared/ChakanaPattern";
import { Reveal } from "@/components/shared/Reveal";

/**
 * CTA final — fondo cocoa con franja tricolor superior. Convierte al registro.
 * Es el ancla #contacto de la navegación.
 */
export const FinalCta = () => (
  <section id="contacto" className="relative overflow-hidden">
    <div aria-hidden="true" className="tricolor-bar h-1.5 w-full" />

    <div className="cocoa-glow grain relative overflow-hidden py-24 sm:py-32">
      <div aria-hidden="true" className="absolute inset-0 text-gold/[0.06]">
        <ChakanaPattern className="h-full w-full" />
      </div>

      <div className="relative mx-auto max-w-3xl px-5 text-center sm:px-8">
        <Reveal>
          <h2 className="font-serif text-4xl font-bold leading-[1.08] tracking-tight text-cream sm:text-5xl">
            Empieza a conectar tu{" "}
            <span className="text-gradient-gold">talento</span>
          </h2>
        </Reveal>

        <Reveal delay={0.08}>
          <p className="mx-auto mt-6 max-w-xl text-lg text-cream/75">
            Crea tu cuenta gratis, explora el marketplace y construye una reputación
            que nadie podrá quitarte.
          </p>
        </Reveal>

        <Reveal delay={0.16}>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button as="a" href="/registro" size="lg" className="group w-full sm:w-auto">
              Crear cuenta gratis
              <ArrowRight size={18} aria-hidden="true" className="transition-transform group-hover:translate-x-1" />
            </Button>
            <Button as="a" href="/login" variant="outline" size="lg" className="w-full sm:w-auto">
              Ya tengo cuenta
            </Button>
          </div>
        </Reveal>

        <Reveal delay={0.24}>
          <p className="mt-5 text-xs text-cream/40">
            Explorar y proponer es gratis. Solo pagas al concretar una conexión.
          </p>
        </Reveal>
      </div>
    </div>
  </section>
);

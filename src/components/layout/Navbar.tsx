"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { NAV_LINKS } from "@/constants/content";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Logo tipográfico: "Ayn" oscuro/claro + "AI" en rojo. */
const Logo = ({ light = false }: { light?: boolean }) => (
  <a
    href="#inicio"
    aria-label="AYNAI — Inicio"
    className="font-serif text-2xl font-bold tracking-tight"
  >
    <span className={light ? "text-cream" : "text-cocoa"}>AYN</span>
    <span className="text-red">AI</span>
  </a>
);

/** Barra de anuncios para captar encuesta */
const AnnouncementBar = ({ visible }: { visible: boolean }) => (
  <a
    href="https://forms.gle/RmAjLuPnACvt5rzj7"
    target="_blank"
    rel="noopener noreferrer"
    className={cn(
      "block bg-cocoa border-b border-gold/10 hover:border-gold/35 text-cream text-center transition-all duration-300 overflow-hidden",
      visible ? "max-h-12 py-2 px-4 opacity-100" : "max-h-0 py-0 opacity-0 border-b-0"
    )}
  >
    <p className="font-sans text-[0.7rem] font-medium tracking-wide sm:text-xs text-cream/90 hover:text-cream">
      📢 <span className="text-gold font-bold">¡Valida tu talento!</span> Responde nuestra encuesta de 3 minutos en Google Forms para asegurar tu acceso beta prioritario. <span className="underline decoration-gold text-gold font-semibold inline-block ml-1">Participar aquí →</span>
    </p>
  </a>
);

/**
 * Barra de navegación sticky. Cambia a fondo crema con sombra al hacer scroll.
 * Incluye menú hamburguesa accesible en móvil.
 */
export const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled
          ? "border-b border-cream-300 bg-cream/90 backdrop-blur-md"
          : "border-b border-transparent bg-transparent"
      )}
    >
      <AnnouncementBar visible={!scrolled} />
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <Logo light={!scrolled} />

        {/* Links de escritorio */}
        <ul className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className={cn(
                  "text-sm font-medium transition-colors",
                  scrolled ? "text-cocoa/75 hover:text-red" : "text-cream/80 hover:text-gold"
                )}
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-3 md:flex">
          <a
            href="/login"
            className={cn(
              "text-sm font-medium transition-colors",
              scrolled ? "text-cocoa/75 hover:text-red" : "text-cream/80 hover:text-gold"
            )}
          >
            Iniciar sesión
          </a>
          <Button as="a" href="/registro" size="sm">
            Crear cuenta
          </Button>
        </div>

        {/* Botón móvil */}
        <button
          type="button"
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "rounded-lg p-2 transition-colors md:hidden",
            scrolled ? "text-cocoa hover:bg-cocoa/5" : "text-cream hover:bg-white/10"
          )}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {/* Panel móvil desplegable */}
      <div
        className={cn(
          "overflow-hidden border-cream-300 bg-cream/95 backdrop-blur-md transition-all duration-300 md:hidden",
          open ? "max-h-96 border-b" : "max-h-0"
        )}
      >
        <ul className="flex flex-col gap-1 px-5 py-4">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-3 text-base font-medium text-cocoa/80 transition-colors hover:bg-cocoa/5 hover:text-red"
              >
                {link.label}
              </a>
            </li>
          ))}
          <li>
            <a
              href="/login"
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-3 text-base font-medium text-cocoa/80 transition-colors hover:bg-cocoa/5 hover:text-red"
            >
              Iniciar sesión
            </a>
          </li>
          <li className="mt-2 px-1">
            <Button as="a" href="/registro" size="md" className="w-full" onClick={() => setOpen(false)}>
              Crear cuenta
            </Button>
          </li>
        </ul>
      </div>
    </header>
  );
};

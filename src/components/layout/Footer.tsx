import { Github, Twitter, Instagram, Linkedin } from "lucide-react";
import { NAV_LINKS } from "@/constants/content";
import { TricolorStripe } from "@/components/shared/TricolorStripe";

const SOCIALS = [
  { icon: Twitter, label: "Twitter", href: "#" },
  { icon: Instagram, label: "Instagram", href: "#" },
  { icon: Linkedin, label: "LinkedIn", href: "#" },
  { icon: Github, label: "GitHub", href: "#" },
];

/**
 * Pie de página — logo, tagline cultural, navegación, redes (placeholder)
 * y créditos del proyecto universitario. Cierra con "Hecho en Bolivia".
 */
export const Footer = () => (
  <footer className="relative bg-cocoa text-cream">
    <TricolorStripe className="h-1" />

    <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
      <div className="grid gap-12 md:grid-cols-[1.5fr_1fr_1fr]">
        {/* Marca */}
        <div>
          <span className="font-serif text-2xl font-bold">
            <span className="text-cream">AYN</span>
            <span className="text-red">AI</span>
          </span>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-cream/60">
            El marketplace de habilidades con reputación verificable. Tu talento, tu
            historial, tu futuro.
          </p>
          <p className="mt-5 text-sm font-semibold tracking-wide text-gold">
            Reciprocidad · Confianza · Talento
          </p>
        </div>

        {/* Navegación */}
        <nav aria-label="Enlaces del pie">
          <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-cream/40">
            Navegación
          </h3>
          <ul className="mt-4 space-y-3">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="text-sm text-cream/70 transition-colors hover:text-gold"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Redes */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-cream/40">
            Síguenos
          </h3>
          <div className="mt-4 flex gap-3">
            {SOCIALS.map((s) => (
              <a
                key={s.label}
                href={s.href}
                aria-label={s.label}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-cream/15 text-cream/70 transition-colors hover:border-gold/50 hover:text-gold"
              >
                <s.icon size={18} />
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Línea inferior */}
      <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-cream/10 pt-8 text-sm text-cream/50 sm:flex-row">
        <p>© {new Date().getFullYear()} AYNAI. Proyecto universitario.</p>
        <p className="flex items-center gap-1.5">
          Hecho con orgullo en Bolivia
          <span aria-hidden="true">🇧🇴</span>
        </p>
      </div>
    </div>
  </footer>
);

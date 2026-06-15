import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Reveal } from "./Reveal";

interface Props {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  /** Color de texto: oscuro (sobre crema) o claro (sobre cocoa). */
  tone?: "dark" | "light";
  align?: "center" | "left";
  className?: string;
}

/**
 * Encabezado de sección reutilizable: eyebrow + título serif + descripción.
 * Anima su entrada con un stagger sutil.
 */
export const SectionHeading = ({
  eyebrow,
  title,
  description,
  tone = "dark",
  align = "center",
  className,
}: Props) => {
  const isLight = tone === "light";
  return (
    <div
      className={cn(
        "max-w-2xl",
        align === "center" ? "mx-auto text-center" : "text-left",
        className
      )}
    >
      {eyebrow && (
        <Reveal>
          <span
            className={cn(
              "mb-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em]",
              isLight ? "text-gold" : "text-red"
            )}
          >
            <span className={cn("h-px w-6", isLight ? "bg-gold" : "bg-red")} />
            {eyebrow}
          </span>
        </Reveal>
      )}
      <Reveal delay={0.05}>
        <h2
          className={cn(
            "font-serif text-3xl leading-[1.1] tracking-tight sm:text-4xl md:text-[2.85rem]",
            isLight ? "text-cream" : "text-cocoa"
          )}
        >
          {title}
        </h2>
      </Reveal>
      {description && (
        <Reveal delay={0.12}>
          <p
            className={cn(
              "mt-5 text-base leading-relaxed sm:text-lg",
              isLight ? "text-cream/70" : "text-cocoa/70"
            )}
          >
            {description}
          </p>
        </Reveal>
      )}
    </div>
  );
};

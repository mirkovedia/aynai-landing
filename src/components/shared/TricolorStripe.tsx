import { cn } from "@/lib/utils";

interface Props {
  /** Grosor de la franja. Por defecto fina (separador sutil). */
  className?: string;
}

/**
 * Franja tricolor boliviana (rojo · amarillo · verde).
 * Separador cultural sutil reutilizable entre secciones.
 */
export const TricolorStripe = ({ className }: Props) => (
  <div
    role="presentation"
    aria-hidden="true"
    className={cn("tricolor-bar h-1 w-full", className)}
  />
);

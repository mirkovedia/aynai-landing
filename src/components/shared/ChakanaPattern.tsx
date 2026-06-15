import { cn } from "@/lib/utils";

interface Props {
  className?: string;
}

/**
 * Patrón geométrico inspirado en la chakana (cruz andina) y los tejidos
 * de aguayo. Se renderiza como SVG con <pattern> repetido, pensado para
 * usarse como textura de fondo sutil y decorativa (aria-hidden).
 */
export const ChakanaPattern = ({ className }: Props) => (
  <svg
    aria-hidden="true"
    className={cn("pointer-events-none select-none", className)}
    width="100%"
    height="100%"
  >
    <defs>
      <pattern
        id="chakana"
        x="0"
        y="0"
        width="80"
        height="80"
        patternUnits="userSpaceOnUse"
        patternTransform="rotate(0)"
      >
        {/* Cruz escalonada andina simplificada */}
        <path
          d="M34 12h12v10h10v12H46v10H34V34H24V22h10z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
        />
        <circle cx="40" cy="40" r="2" fill="currentColor" />
        {/* Esquinas en zig-zag tipo telar */}
        <path
          d="M4 4l6 6-6 6M76 4l-6 6 6 6M4 76l6-6-6-6M76 76l-6-6 6-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.6"
        />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#chakana)" />
  </svg>
);

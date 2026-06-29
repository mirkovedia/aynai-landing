import { cn } from "@/lib/utils";

interface SpinnerProps {
  className?: string;
  /** Texto para lectores de pantalla (el spinner es decorativo si se omite). */
  label?: string;
}

/** Indicador de carga circular. Hereda el color del texto vía `currentColor`. */
export const Spinner = ({ className, label }: SpinnerProps) => (
  <span role={label ? "status" : undefined} className="inline-flex items-center">
    <svg
      className={cn("animate-spin", className ?? "h-4 w-4")}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 0 1 8-8V0C5.37 0 0 5.37 0 12h4z"
      />
    </svg>
    {label && <span className="sr-only">{label}</span>}
  </span>
);

import { forwardRef } from "react";
import type { ButtonHTMLAttributes, AnchorHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "./spinner";

type Variant = "primary" | "outline" | "gold" | "ghost";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-sans font-semibold tracking-tight " +
  "transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 " +
  "focus-visible:ring-gold focus-visible:ring-offset-cream disabled:opacity-50 disabled:pointer-events-none " +
  "active:scale-[0.98] cursor-pointer";

const variants: Record<Variant, string> = {
  primary:
    "bg-red text-cream shadow-[0_10px_30px_-12px_rgba(213,43,30,0.7)] hover:bg-red-600 hover:shadow-[0_14px_34px_-12px_rgba(213,43,30,0.8)]",
  gold: "bg-gold text-cocoa shadow-[0_10px_30px_-12px_rgba(244,196,48,0.8)] hover:bg-gold-600",
  outline:
    "border border-cream/40 text-cream hover:bg-cream/10 hover:border-cream/70",
  ghost: "text-cocoa hover:bg-cocoa/5",
};

const sizes: Record<Size, string> = {
  sm: "text-sm px-4 py-2",
  md: "text-[0.95rem] px-6 py-3",
  lg: "text-base px-8 py-4",
};

interface CommonProps {
  variant?: Variant;
  size?: Size;
  className?: string;
  /** Muestra un spinner inline y deshabilita el botón mientras dura la acción. */
  loading?: boolean;
}

type ButtonProps = CommonProps & ButtonHTMLAttributes<HTMLButtonElement> & { as?: "button" };
type LinkProps = CommonProps & AnchorHTMLAttributes<HTMLAnchorElement> & { as: "a" };

type Props = ButtonProps | LinkProps;

/**
 * Botón polimórfico (botón o enlace) en estilo shadcn/ui con
 * variantes de la marca AynAI. `as="a"` lo convierte en ancla.
 */
export const Button = forwardRef<HTMLButtonElement & HTMLAnchorElement, Props>(
  ({ variant = "primary", size = "md", className, as = "button", loading = false, children, ...rest }, ref) => {
    const classes = cn(base, variants[variant], sizes[size], className);
    const content = (
      <>
        {loading && <Spinner className="h-4 w-4" />}
        {children}
      </>
    );

    // Desestructuramos `as` para no propagarlo al DOM; el resto de props
    // se castea al tipo del elemento concreto que renderizamos.
    if (as === "a") {
      return (
        <a ref={ref} className={classes} {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)}>
          {content}
        </a>
      );
    }

    const buttonRest = rest as ButtonHTMLAttributes<HTMLButtonElement>;
    return (
      <button
        ref={ref}
        className={classes}
        {...buttonRest}
        disabled={loading || buttonRest.disabled}
      >
        {content}
      </button>
    );
  }
);

Button.displayName = "Button";

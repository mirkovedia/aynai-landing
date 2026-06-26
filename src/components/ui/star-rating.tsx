"use client";

import { useState } from "react";
import { Star } from "lucide-react";

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  readOnly?: boolean;
  size?: "sm" | "md";
}

/** Estrellas 1–5. Sin onChange (o readOnly) se muestra de solo lectura. */
export const StarRating = ({ value, onChange, readOnly, size = "md" }: StarRatingProps) => {
  const [hover, setHover] = useState(0);
  const interactive = !readOnly && Boolean(onChange);
  const px = size === "sm" ? 16 : 24;
  const shown = hover || value;

  return (
    <div className="flex items-center gap-1" role={interactive ? "radiogroup" : undefined} aria-label="Calificación">
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= shown;
        const star = (
          <Star
            size={px}
            className={filled ? "fill-gold text-gold" : "fill-transparent text-cocoa/30"}
            aria-hidden="true"
          />
        );
        if (!interactive) return <span key={n}>{star}</span>;
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} estrella${n > 1 ? "s" : ""}`}
            className="transition-transform hover:scale-110"
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => onChange?.(n)}
          >
            {star}
          </button>
        );
      })}
    </div>
  );
};

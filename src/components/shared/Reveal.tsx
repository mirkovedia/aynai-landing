"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Retraso en segundos para escalonar (stagger) reveals. */
  delay?: number;
  /** Dirección de entrada. */
  direction?: "up" | "down" | "left" | "right" | "none";
  className?: string;
}

const offsets: Record<NonNullable<Props["direction"]>, { x: number; y: number }> = {
  up: { x: 0, y: 28 },
  down: { x: 0, y: -28 },
  left: { x: 28, y: 0 },
  right: { x: -28, y: 0 },
  none: { x: 0, y: 0 },
};

/**
 * Envoltorio de animación al hacer scroll: fade-in + slide sutil.
 * Usa `whileInView` con `once` para animar una sola vez al entrar en viewport.
 * Respeta prefers-reduced-motion vía la regla global en globals.css.
 */
export const Reveal = ({ children, delay = 0, direction = "up", className }: Props) => {
  const offset = offsets[direction];

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, x: offset.x, y: offset.y }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
};

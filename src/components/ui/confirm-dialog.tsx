"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Button } from "./button";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Variante del botón de confirmación (p. ej. acciones destructivas). */
  confirmVariant?: "primary" | "gold";
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Modal de confirmación para acciones difíciles de revertir. */
export const ConfirmDialog = ({
  open,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  confirmVariant = "primary",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) => (
  <AnimatePresence>
    {open && (
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-cocoa/40 px-4 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={onCancel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <motion.div
          className="w-full max-w-sm rounded-3xl border border-cream-300 bg-cream p-6 shadow-xl"
          initial={{ opacity: 0, scale: 0.95, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 8 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="font-serif text-xl font-semibold text-cocoa">{title}</h2>
          {description && <p className="mt-2 text-sm text-cocoa/70">{description}</p>}
          <div className="mt-6 flex justify-end gap-3">
            <Button as="button" type="button" variant="ghost" size="sm" onClick={onCancel} disabled={loading}>
              {cancelLabel}
            </Button>
            <Button as="button" type="button" variant={confirmVariant} size="sm" loading={loading} onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

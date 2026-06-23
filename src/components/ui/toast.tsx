"use client";

import { createContext, useCallback, useContext, useReducer } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { toastReducer, nextToastId, type ToastVariant } from "./toast-reducer";

interface ToastContextValue {
  /** Encola un toast. Se auto-descarta a los 4s. */
  toast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const AUTO_DISMISS_MS = 4000;

const variantStyles: Record<ToastVariant, string> = {
  success: "border-green/30 bg-green/10 text-green",
  error: "border-red/30 bg-red/10 text-red",
  info: "border-cocoa/20 bg-white text-cocoa",
};

const variantIcon: Record<ToastVariant, string> = {
  success: "✓",
  error: "✕",
  info: "•",
};

/** Provider del sistema de notificaciones. Montar una vez por área (p. ej. dashboard). */
export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, dispatch] = useReducer(toastReducer, []);

  const toast = useCallback((message: string, variant: ToastVariant = "info") => {
    const id = nextToastId();
    dispatch({ type: "ADD_TOAST", toast: { id, message, variant } });
    setTimeout(() => dispatch({ type: "REMOVE_TOAST", id }), AUTO_DISMISS_MS);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4"
      >
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className={cn(
                "pointer-events-auto flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium shadow-lg",
                variantStyles[t.variant]
              )}
              role="status"
            >
              <span aria-hidden="true" className="font-bold">{variantIcon[t.variant]}</span>
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

/** Hook para encolar toasts. Lanza si se usa fuera del provider. */
export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast debe usarse dentro de <ToastProvider>.");
  return ctx;
};

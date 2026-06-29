import type { ReactNode } from "react";

interface EmptyStateProps {
  /** Emoji o nodo decorativo grande. */
  icon?: ReactNode;
  title: string;
  description?: string;
  /** CTA opcional (botón o enlace). */
  action?: ReactNode;
}

/** Estado vacío reutilizable: ícono + título + descripción + CTA. */
export const EmptyState = ({ icon = "🌱", title, description, action }: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-cream-300 bg-white/50 px-6 py-16 text-center">
    <div aria-hidden="true" className="text-4xl">{icon}</div>
    <h3 className="mt-4 font-serif text-xl font-semibold text-cocoa">{title}</h3>
    {description && <p className="mt-2 max-w-sm text-sm text-cocoa/60">{description}</p>}
    {action && <div className="mt-6">{action}</div>}
  </div>
);

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { addPortfolioItem, deletePortfolioItem } from "@/app/(dashboard)/perfil/editar/actions";
import type { PortfolioItem } from "@/types/database";

interface Props {
  items: PortfolioItem[];
}

/** Editor de portafolio: lista, agrega y elimina proyectos. */
export const PortfolioEditor = ({ items: initialItems }: Props) => {
  const router = useRouter();
  const { toast } = useToast();
  const [items, setItems] = useState(initialItems);
  const [adding, setAdding] = useState(false);
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({ title: "", description: "", url: "" });

  const handleAdd = () => {
    if (!form.title.trim()) return;
    startTransition(async () => {
      const result = await addPortfolioItem(form);
      if (result.error) {
        toast(result.error, "error");
      } else {
        toast("Proyecto agregado", "success");
        setForm({ title: "", description: "", url: "" });
        setAdding(false);
        router.refresh();
      }
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const result = await deletePortfolioItem(id);
      if (result.error) {
        toast(result.error, "error");
      } else {
        setItems((prev) => prev.filter((i) => i.id !== id));
        router.refresh();
      }
    });
  };

  return (
    <section className="mt-8 border-t border-cream-300 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-cocoa">Portafolio</h2>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="text-sm font-medium text-red hover:underline"
          >
            + Agregar proyecto
          </button>
        )}
      </div>

      {adding && (
        <div className="mt-4 space-y-3 rounded-2xl border border-cream-300 bg-cream p-4">
          <input
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Título del proyecto *"
            maxLength={120}
            className="w-full rounded-xl border border-cream-300 bg-white px-3 py-2 text-sm text-cocoa placeholder:text-cocoa/40 focus:outline-none focus:ring-2 focus:ring-cocoa/20"
          />
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Descripción breve (opcional)"
            maxLength={500}
            rows={2}
            className="w-full resize-none rounded-xl border border-cream-300 bg-white px-3 py-2 text-sm text-cocoa placeholder:text-cocoa/40 focus:outline-none focus:ring-2 focus:ring-cocoa/20"
          />
          <input
            value={form.url}
            onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
            placeholder="Link del proyecto (opcional)"
            type="url"
            className="w-full rounded-xl border border-cream-300 bg-white px-3 py-2 text-sm text-cocoa placeholder:text-cocoa/40 focus:outline-none focus:ring-2 focus:ring-cocoa/20"
          />
          <div className="flex gap-2">
            <Button as="button" type="button" size="sm" loading={pending} onClick={handleAdd}>
              Guardar
            </Button>
            <Button as="button" type="button" size="sm" variant="ghost" disabled={pending} onClick={() => setAdding(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {items.length === 0 && !adding && (
        <p className="mt-3 text-sm text-cocoa/40">Aún no tienes proyectos en tu portafolio.</p>
      )}

      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li key={item.id} className="flex items-start justify-between gap-3 rounded-2xl border border-cream-200 bg-cream/50 px-4 py-3">
            <div className="min-w-0">
              <p className="font-medium text-cocoa truncate">{item.title}</p>
              {item.description && <p className="mt-0.5 text-sm text-cocoa/60 line-clamp-2">{item.description}</p>}
              {item.url && (
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="mt-1 block text-xs text-red hover:underline truncate">
                  {item.url}
                </a>
              )}
            </div>
            <button
              type="button"
              disabled={pending}
              onClick={() => handleDelete(item.id)}
              className="shrink-0 text-xs text-cocoa/40 hover:text-red transition-colors"
            >
              Eliminar
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
};

"use client";

import { useState, useTransition } from "react";
import { useToast } from "@/components/ui/toast";
import { addMilestone, toggleMilestone, deleteMilestone } from "@/app/(dashboard)/intercambios/[id]/actions";
import type { Milestone } from "@/types/database";

interface Props {
  exchangeId: string;
  currentUserId: string;
  milestones: Milestone[];
  onOptimisticUpdate: (milestones: Milestone[]) => void;
}

/** Lista de hitos del workspace con barra de progreso, toggle y formulario de añadir. */
export const MilestoneList = ({ exchangeId, currentUserId, milestones, onOptimisticUpdate }: Props) => {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);

  const completed = milestones.filter((m) => m.completed).length;
  const total = milestones.length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  const handleToggle = (milestone: Milestone) => {
    // Capturar snapshot antes de la actualización optimista
    const snapshot = milestones;
    onOptimisticUpdate(
      milestones.map((m) =>
        m.id === milestone.id
          ? { ...m, completed: !m.completed, completed_by: !m.completed ? currentUserId : null, completed_at: !m.completed ? new Date().toISOString() : null }
          : m
      )
    );
    startTransition(async () => {
      const result = await toggleMilestone({ milestoneId: milestone.id, exchangeId });
      if (result.error) {
        // Revertir al snapshot capturado antes de la actualización optimista
        onOptimisticUpdate(snapshot);
        toast(result.error, "error");
      }
    });
  };

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    // Capturar snapshot antes de la actualización optimista
    const snapshot = milestones;
    const tempId = `opt-${Date.now()}`;
    const optimistic: Milestone = {
      id: tempId,
      exchange_request_id: exchangeId,
      created_by: currentUserId,
      title: newTitle.trim(),
      completed: false,
      completed_by: null,
      completed_at: null,
      position: milestones.length,
      created_at: new Date().toISOString(),
    };
    onOptimisticUpdate([...milestones, optimistic]);
    const titleToSend = newTitle.trim();
    setNewTitle("");
    setAdding(false);
    startTransition(async () => {
      const result = await addMilestone({ exchangeId, title: titleToSend });
      if (result.error) {
        // Revertir al snapshot capturado antes de la actualización optimista
        onOptimisticUpdate(snapshot);
        toast(result.error, "error");
      }
    });
  };

  const handleDelete = (milestone: Milestone) => {
    // Capturar snapshot antes de la actualización optimista
    const snapshot = milestones;
    onOptimisticUpdate(milestones.filter((m) => m.id !== milestone.id));
    startTransition(async () => {
      const result = await deleteMilestone({ milestoneId: milestone.id, exchangeId });
      if (result.error) {
        // Revertir al snapshot capturado antes de la actualización optimista
        onOptimisticUpdate(snapshot);
        toast(result.error, "error");
      }
    });
  };

  return (
    <div>
      {/* Barra de progreso */}
      {total > 0 && (
        <div className="mb-3">
          <div className="flex justify-between text-xs text-cocoa/50 mb-1">
            <span>Progreso</span>
            <span>{completed}/{total} hitos</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-cream-200">
            <div
              className="h-1.5 rounded-full bg-green transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Lista de hitos */}
      <ul className="space-y-2">
        {milestones.map((m) => (
          <li key={m.id} className="flex items-center gap-2 group">
            <button
              type="button"
              disabled={pending || m.id.startsWith("opt-")}
              onClick={() => handleToggle(m)}
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                m.completed
                  ? "border-green bg-green text-white"
                  : "border-cream-300 bg-white hover:border-green"
              }`}
              aria-label={m.completed ? "Marcar como pendiente" : "Marcar como completado"}
            >
              {m.completed && (
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                  <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
            <span className={`flex-1 text-sm ${m.completed ? "line-through text-cocoa/40" : "text-cocoa"} ${m.id.startsWith("opt-") ? "opacity-50" : ""}`}>
              {m.title}
            </span>
            {m.created_by === currentUserId && !m.id.startsWith("opt-") && (
              <button
                type="button"
                disabled={pending}
                onClick={() => handleDelete(m)}
                className="invisible text-xs text-cocoa/30 hover:text-red transition-colors group-hover:visible"
                aria-label="Eliminar hito"
              >
                ✕
              </button>
            )}
          </li>
        ))}
      </ul>

      {/* Formulario para añadir */}
      {adding ? (
        <div className="mt-3 flex gap-2">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdd(); } if (e.key === "Escape") setAdding(false); }}
            placeholder="Nombre del hito…"
            maxLength={200}
            autoFocus
            className="flex-1 rounded-lg border border-cream-300 bg-white px-3 py-1.5 text-sm text-cocoa placeholder:text-cocoa/40 focus:outline-none focus:ring-2 focus:ring-cocoa/20"
          />
          <button type="button" onClick={handleAdd} disabled={!newTitle.trim() || pending} className="rounded-lg bg-cocoa px-3 py-1.5 text-xs font-semibold text-cream disabled:opacity-50">
            Añadir
          </button>
          <button type="button" onClick={() => setAdding(false)} className="rounded-lg px-2 py-1.5 text-xs text-cocoa/50 hover:text-cocoa">
            ✕
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="mt-3 flex items-center gap-1 text-xs font-medium text-cocoa/50 hover:text-cocoa transition-colors"
        >
          <span aria-hidden="true">+</span> Añadir hito
        </button>
      )}
    </div>
  );
};

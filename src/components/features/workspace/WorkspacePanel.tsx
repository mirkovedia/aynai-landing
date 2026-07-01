"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MilestoneList } from "./MilestoneList";
import { Notepad } from "./Notepad";
import type { Milestone, ExchangeNote } from "@/types/database";

interface Props {
  exchangeId: string;
  currentUserId: string;
  initialMilestones: Milestone[];
  initialNote: ExchangeNote | null;
}

/** Panel de workspace colaborativo: hitos + notas con Realtime. */
export const WorkspacePanel = ({
  exchangeId,
  currentUserId,
  initialMilestones,
  initialNote,
}: Props) => {
  const [milestones, setMilestones] = useState<Milestone[]>(initialMilestones);
  const [noteContent, setNoteContent] = useState(initialNote?.content ?? "");
  const supabaseRef = useRef(createClient());

  // Realtime: escuchar cambios en hitos
  useEffect(() => {
    const supabase = supabaseRef.current;

    const milestonesChannel = supabase
      .channel(`workspace-milestones-${exchangeId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "exchange_milestones",
          filter: `exchange_request_id=eq.${exchangeId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const incoming = payload.new as Milestone;
            setMilestones((prev) =>
              prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]
            );
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as Milestone;
            setMilestones((prev) =>
              prev.map((m) => (m.id === updated.id ? updated : m))
            );
          } else if (payload.eventType === "DELETE") {
            const deleted = payload.old as { id: string };
            setMilestones((prev) => prev.filter((m) => m.id !== deleted.id));
          }
        }
      )
      .subscribe();

    const notesChannel = supabase
      .channel(`workspace-notes-${exchangeId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "exchange_notes",
          filter: `exchange_request_id=eq.${exchangeId}`,
        },
        (payload) => {
          const updated = payload.new as ExchangeNote;
          // Solo actualizar si el cambio vino de la contraparte
          if (updated.updated_by !== currentUserId) {
            setNoteContent(updated.content);
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(milestonesChannel);
      void supabase.removeChannel(notesChannel);
    };
  }, [exchangeId, currentUserId]);

  return (
    <div className="flex h-full flex-col gap-6 rounded-2xl border border-cream-300 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="text-base" aria-hidden="true">📋</span>
        <h2 className="text-sm font-semibold text-cocoa">Workspace</h2>
      </div>

      {/* Hitos */}
      <section>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-cocoa/40">
          Hitos
        </h3>
        <MilestoneList
          exchangeId={exchangeId}
          currentUserId={currentUserId}
          milestones={milestones}
          onOptimisticUpdate={setMilestones}
        />
      </section>

      {/* Notas */}
      <section className="flex-1">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-cocoa/40">
          Notas
        </h3>
        <Notepad
          exchangeId={exchangeId}
          initialContent={initialNote?.content ?? ""}
          externalContent={noteContent}
          onExternalUpdate={setNoteContent}
        />
      </section>
    </div>
  );
};

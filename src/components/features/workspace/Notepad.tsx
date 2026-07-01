"use client";

import { useEffect, useRef, useState } from "react";
import { saveNote } from "@/app/(dashboard)/intercambios/[id]/actions";

interface Props {
  exchangeId: string;
  initialContent: string;
  onExternalUpdate: (content: string) => void;
  externalContent: string;
}

/** Textarea colaborativa con auto-save debounced de 1.5 s y sincronización Realtime. */
export const Notepad = ({ exchangeId, initialContent, onExternalUpdate: _, externalContent }: Props) => {
  const [content, setContent] = useState(initialContent);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef(initialContent);

  // Sincronizar cambios externos (Realtime de la contraparte)
  useEffect(() => {
    if (externalContent !== lastSavedRef.current) {
      setContent(externalContent);
      lastSavedRef.current = externalContent;
    }
  }, [externalContent]);

  const handleChange = (value: string) => {
    setContent(value);
    setStatus("idle");

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setStatus("saving");
      const result = await saveNote({ exchangeId, content: value });
      if (result.error) {
        setStatus("error");
      } else {
        lastSavedRef.current = value;
        setStatus("saved");
        setTimeout(() => setStatus("idle"), 2000);
      }
    }, 1500);
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-cocoa/50">Notas compartidas</span>
        <span className={`text-xs transition-opacity ${status === "idle" ? "opacity-0" : "opacity-100"} ${status === "saving" ? "text-cocoa/50" : status === "saved" ? "text-green" : "text-red"}`}>
          {status === "saving" && "Guardando…"}
          {status === "saved" && "✓ Guardado"}
          {status === "error" && "Error al guardar"}
        </span>
      </div>
      <textarea
        value={content}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Anoten aquí los acuerdos, entregables, fechas… ambos pueden editar."
        maxLength={5000}
        rows={6}
        className="w-full resize-none rounded-xl border border-cream-300 bg-cream-50 px-3 py-2.5 text-sm text-cocoa placeholder:text-cocoa/30 focus:outline-none focus:ring-2 focus:ring-cocoa/20 leading-relaxed"
      />
      <p className="mt-1 text-right text-xs text-cocoa/30">{content.length}/5000</p>
    </div>
  );
};

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const fieldClass =
  "w-full rounded-xl border border-cream-300 bg-white px-4 py-2.5 text-sm text-cocoa focus:border-gold focus:outline-none";
const labelClass = "block text-sm font-medium text-cocoa/70";

/** Isla cliente: escribe los filtros de búsqueda en la URL (debounce 300ms en el texto). */
export const SearchFilters = () => {
  const router = useRouter();
  const params = useSearchParams();

  const [q, setQ] = useState(params.get("q") ?? "");
  const [kind, setKind] = useState(params.get("kind") ?? "");
  const [loc, setLoc] = useState(params.get("loc") ?? "");
  const [avail, setAvail] = useState(params.get("avail") ?? "");
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sincroniza la URL cuando cambian los filtros (debounce para no spamear la navegación).
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      const next = new URLSearchParams();
      if (q.trim()) next.set("q", q.trim());
      if (kind) next.set("kind", kind);
      if (loc.trim()) next.set("loc", loc.trim());
      if (avail) next.set("avail", avail);
      router.replace(`/explorar?${next.toString()}`);
    }, 300);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [q, kind, loc, avail, router]);

  return (
    <div className="grid gap-4 rounded-3xl border border-cream-300 bg-white p-6 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
      <div>
        <label htmlFor="q" className={labelClass}>Habilidad</label>
        <input
          id="q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className={fieldClass}
          placeholder="Ej: Diseño UI"
        />
      </div>
      <div>
        <label htmlFor="kind" className={labelClass}>Tipo</label>
        <select id="kind" value={kind} onChange={(e) => setKind(e.target.value)} className={fieldClass}>
          <option value="">Ofrece o busca</option>
          <option value="offer">La ofrece</option>
          <option value="seek">La busca</option>
        </select>
      </div>
      <div>
        <label htmlFor="loc" className={labelClass}>Ubicación</label>
        <input
          id="loc"
          value={loc}
          onChange={(e) => setLoc(e.target.value)}
          className={fieldClass}
          placeholder="La Paz"
        />
      </div>
      <div>
        <label htmlFor="avail" className={labelClass}>Disponibilidad</label>
        <select id="avail" value={avail} onChange={(e) => setAvail(e.target.value)} className={fieldClass}>
          <option value="">Cualquiera</option>
          <option value="available">Disponible</option>
          <option value="busy">Ocupado</option>
          <option value="unavailable">No disponible</option>
        </select>
      </div>
    </div>
  );
};

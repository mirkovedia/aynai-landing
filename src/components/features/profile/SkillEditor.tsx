"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import type { SkillInput } from "@/lib/profile/schema";

export interface SkillEditorProps {
  value: SkillInput[];
  onChange: (skills: SkillInput[]) => void;
}

const inputClass =
  "rounded-xl border border-cream-300 bg-white px-3 py-2 text-sm text-cocoa focus:border-gold focus:outline-none";

/** Editor de habilidades: añade/quita skills con tipo (ofrezco/busco) y nivel. */
export const SkillEditor = ({ value, onChange }: SkillEditorProps) => {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<SkillInput["kind"]>("offer");
  const [level, setLevel] = useState<NonNullable<SkillInput["level"]>>("intermedio");

  const add = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (value.some((s) => s.name === trimmed && s.kind === kind)) {
      setName("");
      return;
    }
    onChange([...value, { name: trimmed, kind, level }]);
    setName("");
  };

  const remove = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Ej. Diseño UI"
          className={`${inputClass} flex-1`}
          maxLength={40}
        />
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as SkillInput["kind"])}
          className={inputClass}
        >
          <option value="offer">Ofrezco</option>
          <option value="seek">Busco</option>
        </select>
        <select
          value={level}
          onChange={(e) => setLevel(e.target.value as NonNullable<SkillInput["level"]>)}
          className={inputClass}
        >
          <option value="basico">Básico</option>
          <option value="intermedio">Intermedio</option>
          <option value="experto">Experto</option>
        </select>
        <button
          type="button"
          onClick={add}
          className="inline-flex items-center gap-1 rounded-xl bg-cocoa px-3 py-2 text-sm font-medium text-cream hover:bg-cocoa/90"
        >
          <Plus size={16} /> Añadir
        </button>
      </div>

      <ul className="mt-3 flex flex-wrap gap-2">
        {value.map((skill, index) => (
          <li
            key={`${skill.kind}-${skill.name}`}
            className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs ${
              skill.kind === "offer"
                ? "border-green/30 bg-green/5 text-green"
                : "border-red/30 bg-red/5 text-red"
            }`}
          >
            <span className="font-medium">{skill.kind === "offer" ? "Ofrezco" : "Busco"}:</span>
            {skill.name}
            {skill.level && <span className="opacity-60">· {skill.level}</span>}
            <button type="button" onClick={() => remove(index)} aria-label={`Quitar ${skill.name}`}>
              <X size={13} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

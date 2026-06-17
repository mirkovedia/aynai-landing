"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AvatarUpload } from "./AvatarUpload";
import { SkillEditor } from "./SkillEditor";
import { updateProfile } from "@/app/(dashboard)/perfil/editar/actions";
import type { Profile, UserSkill } from "@/types/database";
import type { ProfileInput, SkillInput } from "@/lib/profile/schema";

interface ProfileFormProps {
  profile: Profile;
  skills: UserSkill[];
}

const fieldClass =
  "w-full rounded-xl border border-cream-300 bg-white px-4 py-2.5 text-sm text-cocoa focus:border-gold focus:outline-none";
const labelClass = "block text-sm font-medium text-cocoa/70";

/** Formulario controlado de edición de perfil. */
export const ProfileForm = ({ profile, skills }: ProfileFormProps) => {
  const router = useRouter();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatar_url);
  const [username, setUsername] = useState(profile.username ?? "");
  const [fullName, setFullName] = useState(profile.full_name ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [location, setLocation] = useState(profile.location ?? "");
  const [availability, setAvailability] = useState<ProfileInput["availability"]>(
    profile.availability
  );
  const [modality, setModality] = useState<string>(profile.modality ?? "");
  const [links, setLinks] = useState({
    web: profile.links.web ?? "",
    linkedin: profile.links.linkedin ?? "",
    github: profile.links.github ?? "",
    x: profile.links.x ?? "",
  });
  const [skillList, setSkillList] = useState<SkillInput[]>(
    skills.map((s) => ({ name: s.name, kind: s.kind, level: s.level ?? undefined }))
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const input: ProfileInput = {
      username,
      avatar_url: avatarUrl ?? "",
      full_name: fullName,
      bio,
      location,
      availability,
      modality: (modality || undefined) as ProfileInput["modality"],
      links,
      skills: skillList,
    };

    try {
      const result = await updateProfile(input);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.push("/perfil");
      router.refresh();
    } catch {
      setError("Ocurrió un error inesperado. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <AvatarUpload userId={profile.id} value={avatarUrl} onChange={setAvatarUrl} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="username" className={labelClass}>Nombre de usuario</label>
          <input id="username" value={username} onChange={(e) => setUsername(e.target.value)} className={fieldClass} placeholder="mirko_01" />
        </div>
        <div>
          <label htmlFor="fullName" className={labelClass}>Nombre completo</label>
          <input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} className={fieldClass} />
        </div>
      </div>

      <div>
        <label htmlFor="bio" className={labelClass}>Bio</label>
        <textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} rows={3} maxLength={500} className={fieldClass} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="location" className={labelClass}>Ubicación</label>
          <input id="location" value={location} onChange={(e) => setLocation(e.target.value)} className={fieldClass} placeholder="La Paz, Bolivia" />
        </div>
        <div>
          <label htmlFor="availability" className={labelClass}>Disponibilidad</label>
          <select id="availability" value={availability} onChange={(e) => setAvailability(e.target.value as ProfileInput["availability"])} className={fieldClass}>
            <option value="available">Disponible</option>
            <option value="busy">Ocupado</option>
            <option value="unavailable">No disponible</option>
          </select>
        </div>
        <div>
          <label htmlFor="modality" className={labelClass}>Modalidad</label>
          <select id="modality" value={modality} onChange={(e) => setModality(e.target.value)} className={fieldClass}>
            <option value="">—</option>
            <option value="remoto">Remoto</option>
            <option value="presencial">Presencial</option>
            <option value="hibrido">Híbrido</option>
          </select>
        </div>
      </div>

      <div>
        <p className={labelClass}>Habilidades</p>
        <div className="mt-2">
          <SkillEditor value={skillList} onChange={setSkillList} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="web" className={labelClass}>Sitio web</label>
          <input id="web" value={links.web} onChange={(e) => setLinks({ ...links, web: e.target.value })} className={fieldClass} placeholder="https://" />
        </div>
        <div>
          <label htmlFor="linkedin" className={labelClass}>LinkedIn</label>
          <input id="linkedin" value={links.linkedin} onChange={(e) => setLinks({ ...links, linkedin: e.target.value })} className={fieldClass} placeholder="https://" />
        </div>
        <div>
          <label htmlFor="github" className={labelClass}>GitHub</label>
          <input id="github" value={links.github} onChange={(e) => setLinks({ ...links, github: e.target.value })} className={fieldClass} placeholder="https://" />
        </div>
        <div>
          <label htmlFor="x" className={labelClass}>X / Twitter</label>
          <input id="x" value={links.x} onChange={(e) => setLinks({ ...links, x: e.target.value })} className={fieldClass} placeholder="https://" />
        </div>
      </div>

      {error && <p className="text-sm text-red">{error}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar perfil"}</Button>
        <Button as="button" type="button" variant="ghost" onClick={() => router.push("/perfil")}>Cancelar</Button>
      </div>
    </form>
  );
};

export type SkillKind = "offer" | "seek";
export type SkillLevel = "basico" | "intermedio" | "experto";
export type Availability = "available" | "busy" | "unavailable";

/** Links sociales/portfolio del perfil (guardados como jsonb). */
export interface ProfileLinks {
  web?: string;
  linkedin?: string;
  github?: string;
  x?: string;
}

/** Fila de la tabla profiles. */
export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  ayni_score: number;
  bio: string | null;
  /** Campo legado (text[]); la UI usa user_skills. */
  skills: string[];
  location: string | null;
  username: string | null;
  avatar_url: string | null;
  availability: Availability;
  modality: string | null;
  links: ProfileLinks;
  created_at: string;
}

/** Fila de la tabla user_skills (ofrezco/busco). */
export interface UserSkill {
  id: string;
  user_id: string;
  name: string;
  kind: SkillKind;
  category: string | null;
  level: SkillLevel | null;
  created_at: string;
}

/** Fila de la tabla waitlist. */
export interface WaitlistEntry {
  id: string;
  email: string;
  created_at: string;
}

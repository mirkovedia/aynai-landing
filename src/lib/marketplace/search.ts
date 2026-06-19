import { createClient } from "@/lib/supabase/server";
import type { PublicProfile } from "@/components/features/profile/ProfileCard";
import type { UserSkill } from "@/types/database";

/** Columnas públicas del perfil — nunca incluye email (idéntico a /u/[username]). */
const PUBLIC_COLUMNS =
  "id, full_name, ayni_score, bio, skills, location, username, avatar_url, availability, modality, links, created_at";

export interface SearchFiltersInput {
  q: string;
  kind?: "offer" | "seek";
  loc?: string;
  avail?: string;
  excludeUserId: string;
}

export interface SearchResult {
  profile: PublicProfile;
  skills: UserSkill[];
}

/**
 * Descubre perfiles cuya skill matchee `q`. Hace dos queries:
 *  1) join interno a user_skills para encontrar los perfiles (sin email);
 *  2) trae TODAS las skills de esos perfiles para renderizar la tarjeta completa.
 */
export const searchProfiles = async (filters: SearchFiltersInput): Promise<SearchResult[]> => {
  const { q, kind, loc, avail, excludeUserId } = filters;
  if (!q.trim()) return [];

  const supabase = await createClient();

  let query = supabase
    .from("profiles")
    .select(`${PUBLIC_COLUMNS}, user_skills!inner(id)`)
    .ilike("user_skills.name", `%${q.trim()}%`)
    .neq("id", excludeUserId);

  if (kind) query = query.eq("user_skills.kind", kind);
  if (loc?.trim()) query = query.ilike("location", `%${loc.trim()}%`);
  if (avail) query = query.eq("availability", avail);

  const { data: matches, error } = await query.returns<PublicProfile[]>();
  if (error) {
    console.error("searchProfiles error:", error);
    return [];
  }
  if (!matches || matches.length === 0) return [];

  // Deduplica por id (un perfil puede matchear por varias skills).
  const byId = new Map<string, PublicProfile>();
  for (const p of matches) byId.set(p.id, p);
  const profiles = [...byId.values()];

  // Segunda query: todas las skills de los perfiles encontrados.
  const ids = profiles.map((p) => p.id);
  const { data: allSkills } = await supabase
    .from("user_skills")
    .select("*")
    .in("user_id", ids)
    .returns<UserSkill[]>();

  const skillsByUser = new Map<string, UserSkill[]>();
  for (const s of allSkills ?? []) {
    const list = skillsByUser.get(s.user_id) ?? [];
    list.push(s);
    skillsByUser.set(s.user_id, list);
  }

  return profiles.map((profile) => ({
    profile,
    skills: skillsByUser.get(profile.id) ?? [],
  }));
};

export interface ListProfilesInput {
  excludeUserId: string;
  kind?: "offer" | "seek";
  loc?: string;
  avail?: string;
  limit?: number;
  offset?: number;
}

/**
 * Lista perfiles para el feed abierto (sin email), ordenados por ayni_score desc.
 * Sin filtro = todos. Con kind se exige que el perfil tenga al menos una skill de ese tipo.
 */
export const listProfiles = async (filters: ListProfilesInput): Promise<SearchResult[]> => {
  const { excludeUserId, kind, loc, avail, limit = 50, offset = 0 } = filters;
  const supabase = await createClient();

  let query = supabase
    .from("profiles")
    .select(kind ? `${PUBLIC_COLUMNS}, user_skills!inner(id)` : PUBLIC_COLUMNS)
    .neq("id", excludeUserId)
    .order("ayni_score", { ascending: false })
    .range(offset, offset + limit - 1);

  if (kind) query = query.eq("user_skills.kind", kind);
  if (loc?.trim()) query = query.ilike("location", `%${loc.trim()}%`);
  if (avail) query = query.eq("availability", avail);

  const { data: matches, error } = await query.returns<PublicProfile[]>();
  if (error) {
    console.error("listProfiles error:", error);
    return [];
  }
  if (!matches || matches.length === 0) return [];

  // Deduplica por id (el join por kind puede repetir filas).
  const byId = new Map<string, PublicProfile>();
  for (const p of matches) byId.set(p.id, p);
  const profiles = [...byId.values()];

  const ids = profiles.map((p) => p.id);
  const { data: allSkills } = await supabase
    .from("user_skills")
    .select("*")
    .in("user_id", ids)
    .returns<UserSkill[]>();

  const skillsByUser = new Map<string, UserSkill[]>();
  for (const s of allSkills ?? []) {
    const list = skillsByUser.get(s.user_id) ?? [];
    list.push(s);
    skillsByUser.set(s.user_id, list);
  }

  return profiles.map((profile) => ({
    profile,
    skills: skillsByUser.get(profile.id) ?? [],
  }));
};

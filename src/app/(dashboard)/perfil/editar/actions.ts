"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { profileSchema, type ProfileInput } from "@/lib/profile/schema";
import { portfolioItemSchema } from "@/lib/portfolio/schema";

export interface ActionResult {
  error?: string;
  code?: string;
  details?: unknown;
}

/** Valida y persiste el perfil del usuario autenticado y reemplaza sus skills. */
export const updateProfile = async (input: ProfileInput): Promise<ActionResult> => {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Datos inválidos",
      code: "VALIDATION_ERROR",
      details: parsed.error.flatten(),
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return { error: "No autenticado", code: "UNAUTHENTICATED" };

  const { username, avatar_url, full_name, bio, location, availability, modality, links, skills } =
    parsed.data;

  // Quitar links vacíos antes de guardar.
  const cleanLinks = Object.fromEntries(
    Object.entries(links).filter(([, value]) => Boolean(value))
  );

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      username,
      avatar_url: avatar_url || null,
      full_name,
      bio: bio || null,
      location: location || null,
      availability,
      modality: modality ?? null,
      links: cleanLinks,
    })
    .eq("id", user.id);

  if (updateError) {
    if (updateError.code === "23505") {
      return { error: "Ese nombre de usuario ya está tomado", code: "USERNAME_TAKEN" };
    }
    console.error("updateProfile profiles error:", updateError);
    return { error: "No pudimos guardar tu perfil", code: "DB_ERROR" };
  }

  // Reemplazar skills: borrar las actuales e insertar las nuevas.
  const { error: deleteError } = await supabase
    .from("user_skills")
    .delete()
    .eq("user_id", user.id);
  if (deleteError) {
    console.error("updateProfile delete skills error:", deleteError);
    return { error: "No pudimos actualizar tus habilidades", code: "DB_ERROR" };
  }

  if (skills.length > 0) {
    const rows = skills.map((skill) => ({
      user_id: user.id,
      name: skill.name,
      kind: skill.kind,
      level: skill.level ?? null,
    }));
    const { error: insertError } = await supabase.from("user_skills").insert(rows);
    if (insertError) {
      console.error("updateProfile insert skills error:", insertError);
      return { error: "No pudimos guardar tus habilidades", code: "DB_ERROR" };
    }
  }

  revalidatePath("/perfil");
  return {};
};

/** Agrega un ítem al portafolio del usuario. */
export const addPortfolioItem = async (input: {
  title: string;
  description?: string;
  url?: string;
}): Promise<ActionResult> => {
  const parsed = portfolioItemSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos", code: "VALIDATION_ERROR" };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado", code: "UNAUTHENTICATED" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single();

  const { error } = await supabase.from("portfolio_items").insert({
    user_id: user.id,
    title: parsed.data.title,
    description: parsed.data.description || null,
    url: parsed.data.url || null,
  });

  if (error) return { error: "No se pudo agregar el proyecto", code: "DB_ERROR" };

  revalidatePath("/perfil/editar");
  if (profile?.username) revalidatePath(`/u/${profile.username}`);
  return {};
};

/** Elimina un ítem del portafolio (solo el dueño). */
export const deletePortfolioItem = async (id: string): Promise<ActionResult> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado", code: "UNAUTHENTICATED" };

  const { error } = await supabase
    .from("portfolio_items")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: "No se pudo eliminar el proyecto", code: "DB_ERROR" };
  revalidatePath("/perfil/editar");
  return {};
};

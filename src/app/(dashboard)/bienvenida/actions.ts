"use server";

import { createClient } from "@/lib/supabase/server";

/** Marca el onboarding como completado para el usuario actual. */
export async function completeOnboarding(): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { error } = await supabase
    .from("profiles")
    .update({ onboarding_completed: true })
    .eq("id", user.id);

  if (error) return { error: "No se pudo completar el onboarding" };
  return {};
}

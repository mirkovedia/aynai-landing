import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "@/components/features/profile/ProfileForm";
import { PortfolioEditor } from "@/components/features/profile/PortfolioEditor";
import type { Profile, UserSkill, PortfolioItem } from "@/types/database";

/** Edición de mi perfil. */
export default async function EditarPerfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: skills }, { data: portfolio }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, ayni_score, bio, skills, location, username, avatar_url, availability, modality, links, onboarding_completed, created_at")
      .eq("id", user.id)
      .single<Profile>(),
    supabase
      .from("user_skills")
      .select("id, user_id, name, kind, category, level, created_at")
      .eq("user_id", user.id)
      .returns<UserSkill[]>(),
    supabase
      .from("portfolio_items")
      .select("id, user_id, title, description, url, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .returns<PortfolioItem[]>(),
  ]);

  if (!profile) redirect("/dashboard");

  return (
    <main className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
      <h2 className="mb-6 font-serif text-2xl font-bold text-cocoa">Editar perfil</h2>
      <ProfileForm profile={profile} skills={skills ?? []} />
      <PortfolioEditor items={portfolio ?? []} />
    </main>
  );
}

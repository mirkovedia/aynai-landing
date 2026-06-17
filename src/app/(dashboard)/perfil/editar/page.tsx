import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "@/components/features/profile/ProfileForm";
import type { Profile, UserSkill } from "@/types/database";

/** Edición de mi perfil. */
export default async function EditarPerfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  const { data: skills } = await supabase
    .from("user_skills")
    .select("*")
    .eq("user_id", user.id)
    .returns<UserSkill[]>();

  if (!profile) redirect("/dashboard");

  return (
    <main className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
      <h2 className="mb-6 font-serif text-2xl font-bold text-cocoa">Editar perfil</h2>
      <ProfileForm profile={profile} skills={skills ?? []} />
    </main>
  );
}

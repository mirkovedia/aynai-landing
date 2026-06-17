import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileCard } from "@/components/features/profile/ProfileCard";
import { Button } from "@/components/ui/button";
import type { Profile, UserSkill } from "@/types/database";

/** Mi perfil: vista propia con acceso a edición. */
export default async function PerfilPage() {
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
      <div className="mb-6 flex items-center justify-between">
        <h2 className="font-serif text-2xl font-bold text-cocoa">Mi perfil</h2>
        <Button as="a" href="/perfil/editar" size="sm">Editar</Button>
      </div>
      <ProfileCard profile={profile} skills={skills ?? []} />
      {profile.username && (
        <p className="mt-4 text-sm text-cocoa/50">
          Tu perfil público:{" "}
          <Link href={`/u/${profile.username}`} className="text-red hover:underline">
            /u/{profile.username}
          </Link>
        </p>
      )}
    </main>
  );
}

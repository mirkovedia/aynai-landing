import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileCard, type PublicProfile } from "@/components/features/profile/ProfileCard";
import type { UserSkill } from "@/types/database";

/** Columnas públicas del perfil — nunca incluye email. */
const PUBLIC_COLUMNS =
  "id, full_name, ayni_score, bio, skills, location, username, avatar_url, availability, modality, links, created_at";

interface PageProps {
  params: Promise<{ username: string }>;
}

/** Perfil público (visible para usuarios autenticados). */
export default async function PublicProfilePage({ params }: PageProps) {
  const { username } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select(PUBLIC_COLUMNS)
    .eq("username", username)
    .maybeSingle<PublicProfile>();

  if (!profile) notFound();

  const { data: skills } = await supabase
    .from("user_skills")
    .select("*")
    .eq("user_id", profile.id)
    .returns<UserSkill[]>();

  return (
    <main className="min-h-screen bg-cream">
      <header className="border-b border-cream-300 bg-cream/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-3xl items-center px-5 sm:px-8">
          <Link href="/dashboard" className="font-serif text-2xl font-bold tracking-tight">
            <span className="text-cocoa">Ayn</span>
            <span className="text-red">AI</span>
          </Link>
        </div>
      </header>
      <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
        <ProfileCard profile={profile} skills={skills ?? []} />
      </div>
    </main>
  );
}

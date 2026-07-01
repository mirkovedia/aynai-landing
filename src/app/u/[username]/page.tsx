import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileCard, type PublicProfile } from "@/components/features/profile/ProfileCard";
import type { UserSkill, Rating, RatingSummary, PortfolioItem } from "@/types/database";

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

  // Usuario actual (para saber si puede proponer intercambio)
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  const isOwnProfile = currentUser?.id === profile.id;

  // Intercambios completados del perfil visitado
  const { count: completedCount } = await supabase
    .from("exchange_requests")
    .select("id", { count: "exact", head: true })
    .or(`requester_id.eq.${profile.id},recipient_id.eq.${profile.id}`)
    .eq("status", "completed");

  const { data: ratingRows } = await supabase
    .from("ratings")
    .select("stars, comment, created_at")
    .eq("ratee_id", profile.id)
    .order("created_at", { ascending: false })
    .returns<Pick<Rating, "stars" | "comment" | "created_at">[]>();

  const allRatings = ratingRows ?? [];
  const summary: RatingSummary = {
    count: allRatings.length,
    average: allRatings.length
      ? Math.round((allRatings.reduce((s, r) => s + r.stars, 0) / allRatings.length) * 10) / 10
      : 0,
  };
  const recent = allRatings.slice(0, 5);

  const { data: portfolio } = await supabase
    .from("portfolio_items")
    .select("*")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .returns<PortfolioItem[]>();

  return (
    <main className="min-h-screen bg-cream">
      <header className="border-b border-cream-300 bg-cream/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-3xl items-center px-5 sm:px-8">
          <Link href="/dashboard" className="font-serif text-2xl font-bold tracking-tight">
            <span className="text-cocoa">AYN</span>
            <span className="text-red">AI</span>
          </Link>
        </div>
      </header>
      <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
        {!isOwnProfile && currentUser && (
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-cream-300 bg-white px-5 py-4 shadow-sm">
            <p className="text-sm text-cocoa/70 text-center sm:text-left">
              {completedCount ? (
                <><span className="font-semibold text-cocoa">{completedCount}</span> intercambio{completedCount !== 1 ? "s" : ""} completado{completedCount !== 1 ? "s" : ""}</>
              ) : (
                "Nuevo en AYNAI"
              )}
            </p>
            <Link
              href={`/marketplace?propose=${profile.username}`}
              className="rounded-full bg-cocoa px-4 py-2 text-sm font-semibold text-cream transition-colors hover:bg-cocoa/90 text-center w-full sm:w-auto"
            >
              Proponer intercambio
            </Link>
          </div>
        )}
        <ProfileCard profile={profile} skills={skills ?? []} ratings={{ summary, recent }} portfolio={portfolio ?? []} />
      </div>
    </main>
  );
}

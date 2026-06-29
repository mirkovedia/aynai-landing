import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { computeAyniScore } from "@/lib/scoring/compute";
import { getMatchedFeed } from "@/lib/marketplace/matching";
import { ScoreWidget } from "@/components/features/dashboard/ScoreWidget";
import { ActiveExchanges } from "@/components/features/dashboard/ActiveExchanges";
import { MatchesPreview } from "@/components/features/dashboard/MatchesPreview";
import type { Profile, ExchangeRequest, UserSkill } from "@/types/database";

/** Dashboard — hub personalizado con 3 widgets: matches, intercambios activos y score. */
export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Perfil
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  // Mis skills
  const { data: mySkills } = await supabase
    .from("user_skills")
    .select("*")
    .eq("user_id", user.id)
    .returns<UserSkill[]>();

  const skillList = mySkills ?? [];
  const myOffers = skillList.filter((s) => s.kind === "offer").map((s) => s.name);
  const mySeeks = skillList.filter((s) => s.kind === "seek").map((s) => s.name);
  const hasSkills = skillList.length > 0;

  // Matches (top 3)
  const { perfect, partial } = await getMatchedFeed(myOffers, mySeeks, user.id);

  // Intercambios activos (pending + accepted)
  const { data: activeRaw } = await supabase
    .from("exchange_requests")
    .select("*")
    .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`)
    .in("status", ["pending", "accepted"])
    .order("updated_at", { ascending: false })
    .limit(5)
    .returns<ExchangeRequest[]>();

  const activeList = activeRaw ?? [];
  const counterpartIds = [
    ...new Set(
      activeList.map((r) =>
        r.requester_id === user.id ? r.recipient_id : r.requester_id
      )
    ),
  ];
  const { data: counterparts } = await supabase
    .from("profiles")
    .select("id, full_name, username")
    .in(
      "id",
      counterpartIds.length > 0
        ? counterpartIds
        : ["00000000-0000-0000-0000-000000000000"]
    )
    .returns<{ id: string; full_name: string | null; username: string | null }[]>();

  const nameById = new Map(
    (counterparts ?? []).map((p) => [
      p.id,
      p.full_name?.trim() || p.username || "Usuario",
    ])
  );

  const activeExchanges = activeList.map((request) => ({
    request,
    counterpartName: nameById.get(
      request.requester_id === user.id ? request.recipient_id : request.requester_id
    ) ?? "Usuario",
  }));

  // AYNAI Score
  const { data: ratingAgg } = await supabase
    .from("ratings")
    .select("stars")
    .eq("ratee_id", user.id)
    .returns<{ stars: number }[]>();
  const ratingList = ratingAgg ?? [];
  const avgStars = ratingList.length
    ? ratingList.reduce((s, r) => s + r.stars, 0) / ratingList.length
    : null;

  const { count: completedCount } = await supabase
    .from("exchange_requests")
    .select("id", { count: "exact", head: true })
    .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`)
    .eq("status", "completed");

  const { count: acceptedOrMore } = await supabase
    .from("exchange_requests")
    .select("id", { count: "exact", head: true })
    .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`)
    .in("status", ["accepted", "completed"]);

  const links = profile?.links ?? {};
  const hasLink = Boolean(links.web || links.linkedin || links.github || links.x);
  const skillKinds = new Set(skillList.map((s) => s.kind));
  const profileItems =
    (profile?.avatar_url ? 1 : 0) +
    (skillKinds.has("offer") ? 1 : 0) +
    (skillKinds.has("seek") ? 1 : 0) +
    (hasLink ? 1 : 0) +
    (profile && profile.availability !== "unavailable" ? 1 : 0);

  const score = computeAyniScore({
    avgStars,
    ratingCount: ratingList.length,
    completedCount: completedCount ?? 0,
    acceptedOrMore: acceptedOrMore ?? 0,
    profileItems,
  });

  const displayName =
    profile?.full_name?.trim() || user.email?.split("@")[0] || "Usuario";

  return (
    <main className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
      {/* Onboarding banner si perfil incompleto */}
      {profileItems < 5 && (
        <div className="mb-8 flex items-center justify-between gap-4 rounded-3xl border border-gold/40 bg-gold/10 p-5">
          <p className="text-sm font-medium text-cocoa">
            Completá tu perfil ({profileItems}/5) para subir tu AYNAI Score y aparecer en más matches.
          </p>
          <a
            href="/perfil/editar"
            className="shrink-0 rounded-full bg-cocoa px-4 py-2 text-sm font-semibold text-cream hover:bg-cocoa/90"
          >
            Completar
          </a>
        </div>
      )}

      <p className="font-sans text-sm text-cocoa/60">Bienvenido,</p>
      <h1 className="font-serif text-4xl font-bold text-cocoa">{displayName}</h1>

      {/* Grid de widgets */}
      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Columna izquierda: matches (grande) */}
        <MatchesPreview perfect={perfect} partial={partial} hasSkills={hasSkills} />

        {/* Columna derecha: score */}
        <ScoreWidget score={score} storedScore={profile?.ayni_score ?? 0} />
      </div>

      {/* Intercambios activos: ancho completo */}
      <div className="mt-6">
        <ActiveExchanges exchanges={activeExchanges} />
      </div>
    </main>
  );
}

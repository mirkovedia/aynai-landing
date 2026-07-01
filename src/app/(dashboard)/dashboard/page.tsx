import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { computeAyniScore } from "@/lib/scoring/compute";
import { getMatchedFeed } from "@/lib/marketplace/matching";
import { ScoreWidget } from "@/components/features/dashboard/ScoreWidget";
import { ActiveExchanges } from "@/components/features/dashboard/ActiveExchanges";
import { MatchesPreview } from "@/components/features/dashboard/MatchesPreview";
import { StatsWidget } from "@/components/features/dashboard/StatsWidget";
import type { Profile, ExchangeRequest, UserSkill } from "@/types/database";

/** Dashboard — hub personalizado con 3 widgets: matches, intercambios activos y score. */
export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Ronda 1: todas las queries independientes en paralelo
  const [
    { data: profile },
    { data: mySkills },
    { data: activeRaw },
    { data: ratingAgg },
    { count: completedCount },
    { count: sentCount },
    { count: receivedCount },
    { count: acceptedOrMore },
  ] = await Promise.all([
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
      .from("exchange_requests")
      .select("id, requester_id, recipient_id, offer_skill, want_skill, message, status, requester_confirmed, recipient_confirmed, completed_at, created_at, updated_at")
      .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .in("status", ["pending", "accepted"])
      .order("updated_at", { ascending: false })
      .limit(5)
      .returns<ExchangeRequest[]>(),
    supabase
      .from("ratings")
      .select("stars")
      .eq("ratee_id", user.id)
      .returns<{ stars: number }[]>(),
    supabase
      .from("exchange_requests")
      .select("id", { count: "exact", head: true })
      .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .eq("status", "completed"),
    supabase
      .from("exchange_requests")
      .select("id", { count: "exact", head: true })
      .eq("requester_id", user.id),
    supabase
      .from("exchange_requests")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", user.id),
    supabase
      .from("exchange_requests")
      .select("id", { count: "exact", head: true })
      .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .in("status", ["accepted", "completed"]),
  ]);

  const skillList = mySkills ?? [];
  const myOffers = skillList.filter((s) => s.kind === "offer").map((s) => s.name);
  const mySeeks = skillList.filter((s) => s.kind === "seek").map((s) => s.name);
  const hasSkills = skillList.length > 0;
  const activeList = activeRaw ?? [];
  const ratingList = ratingAgg ?? [];

  // Ronda 2: queries que dependen de ronda 1
  const counterpartIds = [
    ...new Set(activeList.map((r) => r.requester_id === user.id ? r.recipient_id : r.requester_id)),
  ];
  const [{ perfect, partial }, { data: counterparts }] = await Promise.all([
    getMatchedFeed(myOffers, mySeeks, user.id),
    supabase
      .from("profiles")
      .select("id, full_name, username")
      .in("id", counterpartIds.length > 0 ? counterpartIds : ["00000000-0000-0000-0000-000000000000"])
      .returns<{ id: string; full_name: string | null; username: string | null }[]>(),
  ]);

  const nameById = new Map(
    (counterparts ?? []).map((p) => [p.id, p.full_name?.trim() || p.username || "Usuario"])
  );
  const activeExchanges = activeList.map((request) => ({
    request,
    counterpartName: nameById.get(
      request.requester_id === user.id ? request.recipient_id : request.requester_id
    ) ?? "Usuario",
  }));

  const avgStars = ratingList.length
    ? ratingList.reduce((s, r) => s + r.stars, 0) / ratingList.length
    : null;

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

      {/* Estadísticas + intercambios activos */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.6fr]">
        <StatsWidget
          completed={completedCount ?? 0}
          sent={sentCount ?? 0}
          received={receivedCount ?? 0}
          score={score.total}
        />
        <ActiveExchanges exchanges={activeExchanges} />
      </div>
    </main>
  );
}

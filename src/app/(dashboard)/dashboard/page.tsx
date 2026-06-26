import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { computeAyniScore } from "@/lib/scoring/compute";
import type { Profile } from "@/types/database";

/** Dashboard de perfil: datos del usuario + AynAI Score. */
export default async function DashboardPage() {
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

  const { data: mySkills } = await supabase
    .from("user_skills")
    .select("kind")
    .eq("user_id", user.id)
    .returns<{ kind: string }[]>();
  const skillKinds = new Set((mySkills ?? []).map((s) => s.kind));
  const links = profile?.links ?? {};
  const hasLink = Boolean(links.web || links.linkedin || links.github || links.x);
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

  const displayName = profile?.full_name?.trim() || user.email || "Usuario";

  return (
    <main className="mx-auto max-w-5xl px-5 py-12 sm:px-8">
      {profileItems < 5 && (
        <div className="mb-6 flex items-center justify-between gap-4 rounded-3xl border border-gold/40 bg-gold/10 p-5">
          <p className="text-sm font-medium text-cocoa">
            Completá tu perfil ({profileItems}/5) para subir tu AynAI Score y recibir mejores intercambios.
          </p>
          <a href="/perfil/editar" className="shrink-0 rounded-full bg-cocoa px-4 py-2 text-sm font-semibold text-cream hover:bg-cocoa/90">
            Completar
          </a>
        </div>
      )}
      <p className="font-sans text-sm text-cocoa/60">Bienvenido,</p>
      <h1 className="font-serif text-4xl font-bold text-cocoa">{displayName}</h1>

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {/* AynAI Score */}
        <div className="rounded-3xl border border-cream-300 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-cocoa/60">Tu AynAI Score</p>
          <p className="mt-2 font-serif text-5xl font-bold text-green">
            {profile?.ayni_score ?? score.total}
          </p>
          <dl className="mt-4 space-y-1.5 text-xs text-cocoa/60">
            <div className="flex justify-between"><dt>Reputación</dt><dd>+{score.factors.reputation}</dd></div>
            <div className="flex justify-between"><dt>Intercambios</dt><dd>+{score.factors.volume}</dd></div>
            <div className="flex justify-between"><dt>Cumplimiento</dt><dd>+{score.factors.reliability}</dd></div>
            <div className="flex justify-between"><dt>Perfil completo</dt><dd>+{score.factors.profile}</dd></div>
          </dl>
        </div>

        {/* Datos del perfil */}
        <div className="rounded-3xl border border-cream-300 bg-white p-6 shadow-sm md:col-span-2">
          <p className="text-sm font-medium text-cocoa/60">Tu perfil</p>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-cocoa/50">Correo</dt>
              <dd className="font-medium text-cocoa">{profile?.email ?? user.email}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-cocoa/50">Ubicación</dt>
              <dd className="font-medium text-cocoa">{profile?.location ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-cocoa/50">Habilidades</dt>
              <dd className="font-medium text-cocoa">
                {profile?.skills?.length ? profile.skills.join(", ") : "—"}
              </dd>
            </div>
          </dl>
          <a
            href="/perfil"
            className="mt-4 inline-block text-sm font-semibold text-red hover:underline"
          >
            Ver y editar mi perfil →
          </a>
        </div>
      </div>
    </main>
  );
}

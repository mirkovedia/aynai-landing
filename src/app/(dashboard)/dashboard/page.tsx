import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, WaitlistEntry } from "@/types/database";

/** Dashboard de perfil: datos del usuario + AynAI Score + waitlist real. */
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

  const { data: waitlist } = await supabase
    .from("waitlist")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<WaitlistEntry[]>();

  const displayName = profile?.full_name?.trim() || user.email || "Usuario";
  const entries = waitlist ?? [];

  return (
    <main className="mx-auto max-w-5xl px-5 py-12 sm:px-8">
      <p className="font-sans text-sm text-cocoa/60">Bienvenido,</p>
      <h1 className="font-serif text-4xl font-bold text-cocoa">{displayName}</h1>

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {/* AynAI Score */}
        <div className="rounded-3xl border border-cream-300 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-cocoa/60">Tu AynAI Score</p>
          <p className="mt-2 font-serif text-5xl font-bold text-green">
            {profile?.ayni_score ?? 720}
          </p>
          <p className="mt-1 text-xs text-cocoa/50">Reputación verificable inicial</p>
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

      {/* Waitlist real desde Supabase */}
      <div className="mt-6 rounded-3xl border border-cream-300 bg-white p-6 shadow-sm">
        <div className="flex items-baseline justify-between">
          <p className="text-sm font-medium text-cocoa/60">Lista de espera</p>
          <span className="font-serif text-2xl font-bold text-red">{entries.length}</span>
        </div>
        <ul className="mt-4 divide-y divide-cream-200">
          {entries.length === 0 ? (
            <li className="py-3 text-sm text-cocoa/50">Aún no hay registros.</li>
          ) : (
            entries.map((entry) => (
              <li key={entry.id} className="flex justify-between gap-4 py-3 text-sm">
                <span className="text-cocoa">{entry.email}</span>
                <span className="text-cocoa/40">
                  {new Date(entry.created_at).toLocaleDateString("es-BO")}
                </span>
              </li>
            ))
          )}
        </ul>
      </div>
    </main>
  );
}

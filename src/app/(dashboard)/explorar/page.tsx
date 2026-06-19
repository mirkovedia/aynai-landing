import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SearchFilters } from "@/components/features/marketplace/SearchFilters";
import { ResultsGrid } from "@/components/features/marketplace/ResultsGrid";
import { searchProfiles } from "@/lib/marketplace/search";
import type { UserSkill } from "@/types/database";

interface PageProps {
  searchParams: Promise<{ q?: string; kind?: string; loc?: string; avail?: string }>;
}

/** Descubrimiento de perfiles por habilidad. Server Component: lee filtros de la URL. */
export default async function ExplorarPage({ searchParams }: PageProps) {
  const { q, kind, loc, avail } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Skills que YO ofrezco (para el formulario de propuesta).
  const { data: mySkills } = await supabase
    .from("user_skills")
    .select("*")
    .eq("user_id", user.id)
    .eq("kind", "offer")
    .returns<UserSkill[]>();
  const myOffers = (mySkills ?? []).map((s) => s.name);

  const results = q?.trim()
    ? await searchProfiles({
        q,
        kind: kind === "offer" || kind === "seek" ? kind : undefined,
        loc,
        avail,
        excludeUserId: user.id,
      })
    : [];

  return (
    <main className="mx-auto max-w-5xl px-5 py-12 sm:px-8">
      <h1 className="font-serif text-4xl font-bold text-cocoa">Explorar talento</h1>
      <p className="mt-2 text-sm text-cocoa/60">
        Busca por habilidad y propón un Ayni a quien te interese.
      </p>

      <div className="mt-8">
        <SearchFilters />
      </div>

      {q?.trim() ? (
        <ResultsGrid results={results} myOffers={myOffers} />
      ) : (
        <p className="mt-8 text-center text-sm text-cocoa/50">
          Escribe una habilidad para empezar a buscar.
        </p>
      )}
    </main>
  );
}

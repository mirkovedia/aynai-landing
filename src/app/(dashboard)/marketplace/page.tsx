import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SearchFilters } from "@/components/features/marketplace/SearchFilters";
import { ResultsGrid } from "@/components/features/marketplace/ResultsGrid";
import { HowItWorks } from "@/components/features/marketplace/HowItWorks";
import { listProfiles, searchProfiles } from "@/lib/marketplace/search";
import { COMMISSION_AMOUNT_BS } from "@/lib/payments/constants";
import type { UserSkill } from "@/types/database";

interface PageProps {
  searchParams: Promise<{ q?: string; kind?: string; loc?: string; avail?: string }>;
}

/** Feed abierto del marketplace. Landing post-login: lista a todas las personas. */
export default async function MarketplacePage({ searchParams }: PageProps) {
  const { q, kind, loc, avail } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Skills que YO ofrezco (para precargar el formulario de propuesta).
  const { data: mySkills } = await supabase
    .from("user_skills")
    .select("*")
    .eq("user_id", user.id)
    .eq("kind", "offer")
    .returns<UserSkill[]>();
  const myOffers = (mySkills ?? []).map((s) => s.name);

  const normalizedKind = kind === "offer" || kind === "seek" ? kind : undefined;

  // Con búsqueda por habilidad → searchProfiles; sin búsqueda → feed completo.
  const results = q?.trim()
    ? await searchProfiles({ q, kind: normalizedKind, loc, avail, excludeUserId: user.id })
    : await listProfiles({ excludeUserId: user.id, kind: normalizedKind, loc, avail });

  const hasFilters = Boolean(q?.trim() || normalizedKind || loc?.trim() || avail);

  return (
    <main className="mx-auto max-w-5xl px-5 py-12 sm:px-8">
      <h1 className="font-serif text-4xl font-bold text-cocoa">Marketplace</h1>
      <p className="mt-2 text-sm text-cocoa/60">
        Descubre personas, propón un Ayni y conecta.
      </p>

      <div className="mt-8">
        <HowItWorks amountBs={COMMISSION_AMOUNT_BS} />
      </div>

      <div className="mt-8">
        <SearchFilters />
      </div>

      {results.length > 0 && (
        <p className="mt-8 text-sm text-cocoa/60">
          {results.length} {results.length === 1 ? "persona" : "personas"}
          {hasFilters && " con esos criterios"}
        </p>
      )}

      <ResultsGrid results={results} myOffers={myOffers} query={q?.trim()} hasFilters={hasFilters} />
    </main>
  );
}

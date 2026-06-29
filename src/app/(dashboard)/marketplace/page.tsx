import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SearchFilters } from "@/components/features/marketplace/SearchFilters";
import { ResultsGrid } from "@/components/features/marketplace/ResultsGrid";
import { MatchSection } from "@/components/features/marketplace/MatchSection";
import { HowItWorks } from "@/components/features/marketplace/HowItWorks";
import { getMatchedFeed } from "@/lib/marketplace/matching";
import { searchProfiles } from "@/lib/marketplace/search";
import { COMMISSION_AMOUNT_BS } from "@/lib/payments/constants";
import type { UserSkill } from "@/types/database";

interface PageProps {
  searchParams: Promise<{ q?: string; kind?: string; loc?: string; avail?: string }>;
}

/** Marketplace con matching bilateral. Sin búsqueda activa: dos secciones. Con búsqueda: resultados planos. */
export default async function MarketplacePage({ searchParams }: PageProps) {
  const { q, kind, loc, avail } = await searchParams;
  const hasSearch = Boolean(q?.trim() || kind || loc?.trim() || avail);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Mis skills para el matching y para precargar el formulario de propuesta
  const { data: mySkills } = await supabase
    .from("user_skills")
    .select("*")
    .eq("user_id", user.id)
    .returns<UserSkill[]>();

  const skillList = mySkills ?? [];
  const myOffers = skillList.filter((s) => s.kind === "offer").map((s) => s.name);
  const mySeeks = skillList.filter((s) => s.kind === "seek").map((s) => s.name);
  const hasSkills = skillList.length > 0;

  // Con búsqueda: resultados planos (comportamiento existente)
  if (hasSearch) {
    const normalizedKind = kind === "offer" || kind === "seek" ? kind : undefined;
    const results = q?.trim()
      ? await searchProfiles({ q: q.trim(), kind: normalizedKind, loc, avail, excludeUserId: user.id })
      : [];

    return (
      <main className="mx-auto max-w-5xl px-5 py-12 sm:px-8">
        <h1 className="font-serif text-4xl font-bold text-cocoa">Marketplace</h1>
        <p className="mt-2 text-sm text-cocoa/60">Descubrí personas, proponé un Ayni y conectá.</p>
        <div className="mt-8">
          <SearchFilters />
        </div>
        {results.length > 0 && (
          <p className="mt-8 text-sm text-cocoa/60">
            {results.length} {results.length === 1 ? "persona" : "personas"} con esos criterios
          </p>
        )}
        <ResultsGrid
          results={results}
          myOffers={myOffers}
          query={q?.trim()}
          hasFilters={hasSearch}
        />
      </main>
    );
  }

  // Sin búsqueda: feed con matching bilateral
  const { perfect, partial, rest } = await getMatchedFeed(myOffers, mySeeks, user.id);
  const hasMatches = perfect.length > 0 || partial.length > 0;

  return (
    <main className="mx-auto max-w-5xl px-5 py-12 sm:px-8">
      <h1 className="font-serif text-4xl font-bold text-cocoa">Marketplace</h1>
      <p className="mt-2 text-sm text-cocoa/60">
        Descubrí personas, proponé un Ayni y conectá.
      </p>

      <div className="mt-8">
        <HowItWorks amountBs={COMMISSION_AMOUNT_BS} />
      </div>

      <div className="mt-8">
        <SearchFilters />
      </div>

      {!hasSkills && (
        <div className="mt-8 rounded-2xl border border-gold/30 bg-gold/8 p-5 text-sm text-cocoa">
          <p className="font-semibold">Agrega habilidades para ver tus matches personalizados.</p>
          <a href="/perfil/editar" className="mt-1 inline-block font-semibold text-red hover:underline text-xs">
            Completar perfil →
          </a>
        </div>
      )}

      <div className="mt-10">
        {/* Sección matches */}
        {hasMatches && (
          <MatchSection perfect={perfect} partial={partial} myOffers={myOffers} />
        )}

        {/* Sección otras personas */}
        {rest.length > 0 && (
          <section>
            {hasMatches && (
              <h2 className="mb-5 font-serif text-2xl font-bold text-cocoa">Otras personas</h2>
            )}
            <ResultsGrid
              results={rest}
              myOffers={myOffers}
              query={undefined}
              hasFilters={false}
            />
          </section>
        )}

        {!hasMatches && rest.length === 0 && (
          <ResultsGrid
            results={[]}
            myOffers={myOffers}
            query={undefined}
            hasFilters={false}
          />
        )}
      </div>
    </main>
  );
}

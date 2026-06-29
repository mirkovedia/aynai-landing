import { MatchCard } from "./MatchCard";
import type { SearchResult } from "@/lib/marketplace/search";

interface MatchSectionProps {
  perfect: SearchResult[];
  partial: SearchResult[];
  myOffers: string[];
}

/**
 * Sección "Matches para vos" del marketplace.
 * Muestra matches perfectos primero (badge dorado) y parciales después.
 */
export const MatchSection = ({ perfect, partial, myOffers }: MatchSectionProps) => {
  const hasMatches = perfect.length > 0 || partial.length > 0;
  if (!hasMatches) return null;

  return (
    <section className="mb-12">
      <div className="mb-5 flex items-center gap-3">
        <h2 className="font-serif text-2xl font-bold text-cocoa">Matches para vos</h2>
        <span className="rounded-full bg-gold/15 px-3 py-1 text-xs font-bold text-cocoa">
          {perfect.length + partial.length}
        </span>
      </div>

      {perfect.length > 0 && (
        <>
          {partial.length > 0 && (
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-green">
              ✦ Perfectos
            </p>
          )}
          <div className="grid gap-5 lg:grid-cols-2">
            {perfect.map((r) => (
              <MatchCard key={r.profile.id} result={r} myOffers={myOffers} isPerfect={true} />
            ))}
          </div>
        </>
      )}

      {partial.length > 0 && (
        <>
          <p
            className={`text-xs font-semibold uppercase tracking-wide text-cocoa/50 ${
              perfect.length > 0 ? "mt-6 mb-3" : "mb-3"
            }`}
          >
            {perfect.length > 0 ? "◆ Parciales" : "◆ Matches parciales"}
          </p>
          <div className="grid gap-5 lg:grid-cols-2">
            {partial.map((r) => (
              <MatchCard key={r.profile.id} result={r} myOffers={myOffers} isPerfect={false} />
            ))}
          </div>
        </>
      )}
    </section>
  );
};

import Link from "next/link";
import type { SearchResult } from "@/lib/marketplace/search";

interface MatchesPreviewProps {
  perfect: SearchResult[];
  partial: SearchResult[];
  hasSkills: boolean;
}

const MatchRow = ({
  result,
  isPerfect,
}: {
  result: SearchResult;
  isPerfect: boolean;
}) => {
  const name =
    result.profile.full_name?.trim() || result.profile.username || "Usuario";
  const offers = result.skills
    .filter((s) => s.kind === "offer")
    .map((s) => s.name)
    .slice(0, 2);

  return (
    <li className="flex items-center gap-3 rounded-2xl border border-cream-200 p-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cocoa font-serif text-xs font-bold text-cream">
        {name.slice(0, 2).toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-cocoa">{name}</p>
        <p className="truncate text-xs text-cocoa/55">
          Ofrece: {offers.join(", ") || "—"}
        </p>
      </div>
      <span
        className={`shrink-0 rounded-full px-2.5 py-1 text-[0.65rem] font-bold ${
          isPerfect
            ? "bg-gold/20 text-cocoa"
            : "bg-cocoa/8 text-cocoa/60"
        }`}
      >
        {isPerfect ? "✦ Perfecto" : "◆ Parcial"}
      </span>
    </li>
  );
};

/** Widget con los top 3 matches del usuario (perfectos primero). */
export const MatchesPreview = ({
  perfect,
  partial,
  hasSkills,
}: MatchesPreviewProps) => {
  const top = [...perfect, ...partial].slice(0, 3);

  return (
    <div className="rounded-3xl border border-cream-300 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-cocoa/60">Tus matches</p>
        <Link
          href="/marketplace"
          className="text-xs font-semibold text-red hover:underline"
        >
          Ver todos →
        </Link>
      </div>

      {!hasSkills ? (
        <div className="mt-4 rounded-2xl bg-cream-200 px-4 py-5 text-center">
          <p className="text-sm text-cocoa/50">
            Agrega habilidades para ver tus matches.
          </p>
          <Link
            href="/perfil/editar"
            className="mt-2 inline-block text-xs font-semibold text-red hover:underline"
          >
            Completar perfil →
          </Link>
        </div>
      ) : top.length === 0 ? (
        <div className="mt-4 rounded-2xl bg-cream-200 px-4 py-5 text-center">
          <p className="text-sm text-cocoa/50">
            Aún no hay matches. A medida que más personas se unan, aparecerán aquí.
          </p>
          <Link
            href="/marketplace"
            className="mt-2 inline-block text-xs font-semibold text-red hover:underline"
          >
            Explorar el marketplace →
          </Link>
        </div>
      ) : (
        <>
          <p className="mt-1 text-xs text-cocoa/40">
            {perfect.length > 0
              ? `${perfect.length} match${perfect.length > 1 ? "es" : ""} perfecto${perfect.length > 1 ? "s" : ""}`
              : `${partial.length} match${partial.length > 1 ? "es" : ""} parcial${partial.length > 1 ? "es" : ""}`}
          </p>
          <ul className="mt-3 space-y-2">
            {top.map((r) => (
              <MatchRow
                key={r.profile.id}
                result={r}
                isPerfect={perfect.some((p) => p.profile.id === r.profile.id)}
              />
            ))}
          </ul>
        </>
      )}
    </div>
  );
};

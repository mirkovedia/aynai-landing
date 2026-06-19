import { ProfileCard } from "@/components/features/profile/ProfileCard";
import { ProposeExchangeButton } from "./ProposeExchangeButton";
import type { SearchResult } from "@/lib/marketplace/search";

interface ResultsGridProps {
  results: SearchResult[];
  /** Skills que el usuario actual ofrece (para precargar el formulario de propuesta). */
  myOffers: string[];
}

/** Grid de tarjetas de perfil con CTA "Proponer Ayni" en cada una. */
export const ResultsGrid = ({ results, myOffers }: ResultsGridProps) => {
  if (results.length === 0) {
    return (
      <p className="mt-8 text-center text-sm text-cocoa/50">
        No encontramos perfiles. Prueba con otra habilidad.
      </p>
    );
  }

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-2">
      {results.map(({ profile, skills }) => {
        const recipientOffers = skills.filter((s) => s.kind === "offer").map((s) => s.name);
        const recipientName = profile.full_name?.trim() || profile.username || "Usuario";
        return (
          <div key={profile.id} className="flex flex-col">
            <ProfileCard profile={profile} skills={skills} />
            <div className="mt-3">
              <ProposeExchangeButton
                recipientId={profile.id}
                recipientName={recipientName}
                recipientOffers={recipientOffers}
                myOffers={myOffers}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

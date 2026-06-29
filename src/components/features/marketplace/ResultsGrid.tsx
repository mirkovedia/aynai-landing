import { ProfileCard } from "@/components/features/profile/ProfileCard";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { ProposeExchangeButton } from "./ProposeExchangeButton";
import type { SearchResult } from "@/lib/marketplace/search";

interface ResultsGridProps {
  results: SearchResult[];
  /** Skills que el usuario actual ofrece (para precargar el formulario de propuesta). */
  myOffers: string[];
  /** Texto de búsqueda activo (para diferenciar el estado vacío). */
  query?: string;
  /** Hay algún filtro aplicado (búsqueda, tipo, ubicación o disponibilidad). */
  hasFilters?: boolean;
}

/** Grid de tarjetas de perfil con CTA "Proponer Ayni" en cada una. */
export const ResultsGrid = ({ results, myOffers, query, hasFilters }: ResultsGridProps) => {
  if (results.length === 0) {
    // Búsqueda/filtros sin resultados vs. feed genuinamente vacío.
    return hasFilters ? (
      <EmptyState
        icon="🔍"
        title={query ? `Nada para “${query}”` : "Sin resultados"}
        description="No encontramos personas con esos criterios. Prueba ampliar la búsqueda o quitar filtros."
        action={
          <Button as="a" href="/marketplace" variant="ghost" size="sm">
            Limpiar filtros
          </Button>
        }
      />
    ) : (
      <EmptyState
        icon="🌱"
        title="Aún no hay perfiles que mostrar"
        description="Sé de los primeros en la comunidad. Completa tu perfil y agrega habilidades para que otros te encuentren."
        action={
          <Button as="a" href="/perfil/editar" size="sm">
            Completar mi perfil
          </Button>
        }
      />
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

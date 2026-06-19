"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { respondToRequest, cancelRequest } from "@/app/(dashboard)/intercambios/actions";
import type { ExchangeRequest, ExchangeStatus, ProfileLinks } from "@/types/database";

export interface ExchangeParty {
  full_name: string | null;
  username: string | null;
  links: ProfileLinks;
}

interface ExchangeRequestCardProps {
  request: ExchangeRequest;
  /** "received" = soy el destinatario; "sent" = yo la envié. */
  role: "received" | "sent";
  counterpart: ExchangeParty;
}

const statusLabel: Record<ExchangeStatus, string> = {
  pending: "Pendiente",
  accepted: "Aceptada",
  rejected: "Rechazada",
  cancelled: "Cancelada",
};

const statusColor: Record<ExchangeStatus, string> = {
  pending: "bg-gold/15 text-cocoa",
  accepted: "bg-green/10 text-green",
  rejected: "bg-red/10 text-red",
  cancelled: "bg-cocoa/10 text-cocoa/60",
};

/** Tarjeta de una solicitud de intercambio (recibida o enviada). */
export const ExchangeRequestCard = ({ request, role, counterpart }: ExchangeRequestCardProps) => {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const name = counterpart.full_name?.trim() || counterpart.username || "Usuario";

  const run = async (fn: () => Promise<{ error?: string }>) => {
    setError(null);
    setBusy(true);
    try {
      const result = await fn();
      if (result.error) setError(result.error);
      else router.refresh();
    } catch {
      setError("Ocurrió un error inesperado. Intenta de nuevo.");
    } finally {
      setBusy(false);
    }
  };

  const hasLinks = Boolean(
    counterpart.links?.web || counterpart.links?.linkedin || counterpart.links?.github || counterpart.links?.x
  );

  return (
    <div className="rounded-3xl border border-cream-300 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-cocoa/60">
            {role === "received" ? "De" : "Para"} <span className="font-semibold text-cocoa">{name}</span>
          </p>
          <p className="mt-2 text-sm text-cocoa">
            Ofrece <span className="font-semibold text-green">{request.offer_skill}</span> por{" "}
            <span className="font-semibold text-red">{request.want_skill}</span>
          </p>
          {request.message && (
            <p className="mt-2 text-sm leading-relaxed text-cocoa/70">“{request.message}”</p>
          )}
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${statusColor[request.status]}`}>
          {statusLabel[request.status]}
        </span>
      </div>

      {/* Al aceptar, revelar links de contacto para coordinar fuera de la plataforma. */}
      {request.status === "accepted" && (
        <div className="mt-4 rounded-2xl border border-green/30 bg-green/5 p-4 text-sm">
          <p className="font-semibold text-cocoa">Contacto de {name}:</p>
          {hasLinks ? (
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-cocoa/80">
              {counterpart.links?.web && <li><a className="hover:underline" href={counterpart.links.web} target="_blank" rel="noopener noreferrer">Web</a></li>}
              {counterpart.links?.linkedin && <li><a className="hover:underline" href={counterpart.links.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a></li>}
              {counterpart.links?.github && <li><a className="hover:underline" href={counterpart.links.github} target="_blank" rel="noopener noreferrer">GitHub</a></li>}
              {counterpart.links?.x && <li><a className="hover:underline" href={counterpart.links.x} target="_blank" rel="noopener noreferrer">X</a></li>}
            </ul>
          ) : (
            <p className="mt-1 text-cocoa/60">
              {counterpart.username
                ? <>Visita su perfil: <a className="font-semibold text-red hover:underline" href={`/u/${counterpart.username}`}>@{counterpart.username}</a></>
                : "Esta persona aún no agregó enlaces de contacto."}
            </p>
          )}
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red">{error}</p>}

      {request.status === "pending" && (
        <div className="mt-4 flex gap-3">
          {role === "received" ? (
            <>
              <Button as="button" type="button" size="sm" disabled={busy} onClick={() => run(() => respondToRequest({ requestId: request.id, action: "accept" }))}>
                Aceptar
              </Button>
              <Button as="button" type="button" variant="ghost" size="sm" disabled={busy} onClick={() => run(() => respondToRequest({ requestId: request.id, action: "reject" }))}>
                Rechazar
              </Button>
            </>
          ) : (
            <Button as="button" type="button" variant="ghost" size="sm" disabled={busy} onClick={() => run(() => cancelRequest({ requestId: request.id }))}>
              Cancelar
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

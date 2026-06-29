import Link from "next/link";
import type { ExchangeRequest } from "@/types/database";

interface ActiveExchange {
  request: ExchangeRequest;
  counterpartName: string;
}

interface ActiveExchangesProps {
  exchanges: ActiveExchange[];
}

const statusLabel: Record<string, string> = {
  pending: "Pendiente de respuesta",
  accepted: "Aceptada — pago pendiente",
};

const statusColor: Record<string, string> = {
  pending: "bg-gold/15 text-cocoa",
  accepted: "bg-green/10 text-green",
};

/** Widget de intercambios activos (pending + accepted). */
export const ActiveExchanges = ({ exchanges }: ActiveExchangesProps) => (
  <div className="rounded-3xl border border-cream-300 bg-white p-6 shadow-sm">
    <div className="flex items-center justify-between">
      <p className="text-sm font-medium text-cocoa/60">Intercambios activos</p>
      <Link
        href="/intercambios"
        className="text-xs font-semibold text-red hover:underline"
      >
        Ver todos →
      </Link>
    </div>

    {exchanges.length === 0 ? (
      <div className="mt-4 rounded-2xl bg-cream-200 px-4 py-5 text-center">
        <p className="text-sm text-cocoa/50">No tenés intercambios activos.</p>
        <Link
          href="/marketplace"
          className="mt-2 inline-block text-xs font-semibold text-red hover:underline"
        >
          Buscar personas →
        </Link>
      </div>
    ) : (
      <ul className="mt-4 space-y-3">
        {exchanges.map(({ request, counterpartName }) => (
          <li
            key={request.id}
            className="flex items-center justify-between gap-3 rounded-2xl border border-cream-200 p-3"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-cocoa">
                {counterpartName}
              </p>
              <p className="truncate text-xs text-cocoa/55">
                {request.offer_skill} ↔ {request.want_skill}
              </p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-[0.65rem] font-medium ${
                statusColor[request.status] ?? "bg-cocoa/10 text-cocoa/60"
              }`}
            >
              {statusLabel[request.status] ?? request.status}
            </span>
          </li>
        ))}
      </ul>
    )}
  </div>
);

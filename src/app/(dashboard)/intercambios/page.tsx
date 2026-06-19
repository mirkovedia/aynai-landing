import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ExchangeRequestCard, type ExchangeParty } from "@/components/features/marketplace/ExchangeRequestCard";
import type { ExchangeRequest } from "@/types/database";

interface PageProps {
  searchParams: Promise<{ tab?: string }>;
}

/** Bandeja de intercambios: recibidas (por defecto) y enviadas, por tab en la URL. */
export default async function IntercambiosPage({ searchParams }: PageProps) {
  const { tab } = await searchParams;
  const activeTab = tab === "sent" ? "sent" : "received";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: received } = await supabase
    .from("exchange_requests")
    .select("*")
    .eq("recipient_id", user.id)
    .order("created_at", { ascending: false })
    .returns<ExchangeRequest[]>();

  const { data: sent } = await supabase
    .from("exchange_requests")
    .select("*")
    .eq("requester_id", user.id)
    .order("created_at", { ascending: false })
    .returns<ExchangeRequest[]>();

  const receivedList = received ?? [];
  const sentList = sent ?? [];
  const rows = activeTab === "received" ? receivedList : sentList;

  // Cargar la contraparte de cada fila (nombre + username + links para revelar al aceptar).
  const counterpartIds = [
    ...new Set(rows.map((r) => (activeTab === "received" ? r.requester_id : r.recipient_id))),
  ];
  const { data: parties } = await supabase
    .from("profiles")
    .select("id, full_name, username, links")
    .in("id", counterpartIds.length > 0 ? counterpartIds : ["00000000-0000-0000-0000-000000000000"])
    .returns<(ExchangeParty & { id: string })[]>();
  const partyById = new Map((parties ?? []).map((p) => [p.id, p]));

  const tabClass = (active: boolean) =>
    `rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
      active ? "bg-cocoa text-cream" : "text-cocoa/70 hover:bg-cocoa/5"
    }`;

  return (
    <main className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
      <h1 className="font-serif text-4xl font-bold text-cocoa">Intercambios</h1>

      <div className="mt-6 flex gap-2">
        <Link href="/intercambios" className={tabClass(activeTab === "received")}>
          Recibidas{receivedList.length > 0 && ` (${receivedList.length})`}
        </Link>
        <Link href="/intercambios?tab=sent" className={tabClass(activeTab === "sent")}>
          Enviadas{sentList.length > 0 && ` (${sentList.length})`}
        </Link>
      </div>

      <div className="mt-8 space-y-4">
        {rows.length === 0 ? (
          <p className="text-center text-sm text-cocoa/50">
            {activeTab === "received" ? "Aún no tienes solicitudes recibidas." : "Aún no has enviado solicitudes."}
          </p>
        ) : (
          rows.map((request) => {
            const counterpartId = activeTab === "received" ? request.requester_id : request.recipient_id;
            const party = partyById.get(counterpartId) ?? { full_name: null, username: null, links: {} };
            return (
              <ExchangeRequestCard
                key={request.id}
                request={request}
                role={activeTab}
                counterpart={party}
              />
            );
          })
        )}
      </div>
    </main>
  );
}

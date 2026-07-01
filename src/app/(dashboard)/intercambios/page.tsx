import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ExchangeRequestCard, type ExchangeParty } from "@/components/features/marketplace/ExchangeRequestCard";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import type { ExchangeRequest, CommissionPayment, Rating } from "@/types/database";

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

  const EXCHANGE_COLS = "id, requester_id, recipient_id, offer_skill, want_skill, message, status, requester_confirmed, recipient_confirmed, completed_at, created_at, updated_at";

  const [{ data: received }, { data: sent }] = await Promise.all([
    supabase
      .from("exchange_requests")
      .select(EXCHANGE_COLS)
      .eq("recipient_id", user.id)
      .order("created_at", { ascending: false })
      .returns<ExchangeRequest[]>(),
    supabase
      .from("exchange_requests")
      .select(EXCHANGE_COLS)
      .eq("requester_id", user.id)
      .order("created_at", { ascending: false })
      .returns<ExchangeRequest[]>(),
  ]);

  const receivedList = received ?? [];
  const sentList = sent ?? [];
  const rows = activeTab === "received" ? receivedList : sentList;

  const counterpartIds = [
    ...new Set(rows.map((r) => (activeTab === "received" ? r.requester_id : r.recipient_id))),
  ];
  const rowIds = rows.map((r) => r.id);
  const EMPTY_ID = "00000000-0000-0000-0000-000000000000";

  const [{ data: parties }, { data: myPayments }, { data: myRatings }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, username, links")
      .in("id", counterpartIds.length > 0 ? counterpartIds : [EMPTY_ID])
      .returns<(ExchangeParty & { id: string })[]>(),
    supabase
      .from("commission_payments")
      .select("id, exchange_request_id, payer_id, amount_bs, status, provider, provider_ref, qr_payload, created_at, paid_at")
      .eq("payer_id", user.id)
      .in("exchange_request_id", rowIds.length > 0 ? rowIds : [EMPTY_ID])
      .returns<CommissionPayment[]>(),
    supabase
      .from("ratings")
      .select("exchange_request_id")
      .eq("rater_id", user.id)
      .in("exchange_request_id", rowIds.length > 0 ? rowIds : [EMPTY_ID])
      .returns<Pick<Rating, "exchange_request_id">[]>(),
  ]);

  const partyById = new Map((parties ?? []).map((p) => [p.id, p]));
  const paymentByExchange = new Map((myPayments ?? []).map((p) => [p.exchange_request_id, p]));
  const ratedExchangeIds = new Set((myRatings ?? []).map((r) => r.exchange_request_id));

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
          activeTab === "received" ? (
            <EmptyState
              icon="📬"
              title="Aún no tienes solicitudes recibidas"
              description="Cuando alguien quiera intercambiar contigo, su propuesta aparecerá aquí."
              action={
                <Button as="a" href="/marketplace" size="sm">
                  Explorar el marketplace
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon="✉️"
              title="Aún no has enviado propuestas"
              description="Encuentra a alguien con quien hacer un Ayni y envía tu primera propuesta de intercambio."
              action={
                <Button as="a" href="/marketplace" size="sm">
                  Buscar personas
                </Button>
              }
            />
          )
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
                myPayment={paymentByExchange.get(request.id) ?? null}
                alreadyRated={ratedExchangeIds.has(request.id)}
              />
            );
          })
        )}
      </div>
    </main>
  );
}

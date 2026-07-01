import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ChatWindow } from "@/components/features/chat/ChatWindow";
import type { ExchangeRequest, Message } from "@/types/database";

interface PageProps {
  params: Promise<{ id: string }>;
}

/** Página de chat de un intercambio. Solo accesible para los dos participantes. */
export default async function ChatPage({ params }: PageProps) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Cargar el intercambio y verificar que el usuario es participante
  const { data: exchange } = await supabase
    .from("exchange_requests")
    .select("*")
    .eq("id", id)
    .single<ExchangeRequest>();

  if (!exchange) notFound();

  const isParticipant = exchange.requester_id === user.id || exchange.recipient_id === user.id;
  if (!isParticipant) notFound();

  if (exchange.status !== "accepted" && exchange.status !== "completed") {
    redirect("/intercambios");
  }

  // Cargar la contraparte
  const counterpartId = exchange.requester_id === user.id ? exchange.recipient_id : exchange.requester_id;
  const { data: counterpart } = await supabase
    .from("profiles")
    .select("full_name, username")
    .eq("id", counterpartId)
    .single<{ full_name: string | null; username: string | null }>();

  const counterpartName =
    counterpart?.full_name?.trim() || counterpart?.username || "tu contraparte";

  // Cargar mensajes iniciales (últimos 100)
  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .eq("exchange_request_id", id)
    .order("created_at", { ascending: true })
    .limit(100)
    .returns<Message[]>();

  return (
    <main className="mx-auto max-w-2xl px-5 py-10 sm:px-8">
      <div className="mb-5 flex items-center gap-3">
        <Link
          href="/intercambios"
          className="text-sm text-cocoa/60 hover:text-cocoa transition-colors"
        >
          ← Intercambios
        </Link>
        <span className="text-cocoa/30">/</span>
        <span className="text-sm font-semibold text-cocoa">
          {exchange.offer_skill} ↔ {exchange.want_skill}
        </span>
      </div>

      <ChatWindow
        exchangeId={id}
        currentUserId={user.id}
        initialMessages={messages ?? []}
        counterpartName={counterpartName}
      />
    </main>
  );
}

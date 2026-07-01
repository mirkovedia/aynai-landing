import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ToastProvider } from "@/components/ui/toast";
import { NotificationBell } from "@/components/features/notifications/NotificationBell";
import { isAdminEmail } from "@/lib/admin";
import { signOut } from "./actions";
import type { Notification } from "@/types/database";

/** Shell del área privada: topbar con logo, navegación y botón de cerrar sesión. */
export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let pendingCount = 0;
  let unreadMessages = 0;
  let notifications: Notification[] = [];

  if (user) {
    // Ronda 1: pending count + active exchange ids + notifications en paralelo
    const [{ count: pending }, { data: activeExchanges }, { data: notifData }] =
      await Promise.all([
        supabase
          .from("exchange_requests")
          .select("id", { count: "exact", head: true })
          .eq("recipient_id", user.id)
          .eq("status", "pending"),
        supabase
          .from("exchange_requests")
          .select("id")
          .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`)
          .in("status", ["accepted", "completed"]),
        supabase
          .from("notifications")
          .select("id, user_id, type, title, body, link, read, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20)
          .returns<Notification[]>(),
      ]);

    pendingCount = pending ?? 0;
    notifications = notifData ?? [];

    // Ronda 2: mensajes no leídos (depende de activeExchanges)
    const activeIds = activeExchanges?.map((r) => r.id) ?? [];
    if (activeIds.length > 0) {
      const { count } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .neq("sender_id", user.id)
        .is("read_at", null)
        .in("exchange_request_id", activeIds);
      unreadMessages = count ?? 0;
    }
  }

  return (
    <ToastProvider>
    <div className="min-h-screen bg-cream">
      <header className="border-b border-cream-300 bg-cream/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5 sm:px-8">
          <div className="flex items-center gap-6">
            <Link
              href="/dashboard"
              aria-label="AYNAI — Inicio"
              className="font-serif text-2xl font-bold tracking-tight"
            >
              <span className="text-cocoa">AYN</span>
              <span className="text-red">AI</span>
            </Link>
            <nav className="hidden items-center gap-5 sm:flex">
              <Link href="/marketplace" className="text-sm font-medium text-cocoa/75 transition-colors hover:text-red">
                Marketplace
              </Link>
              <Link href="/intercambios" className="relative text-sm font-medium text-cocoa/75 transition-colors hover:text-red">
                Intercambios
                {pendingCount > 0 && (
                  <span className="ml-1 inline-flex items-center justify-center rounded-full bg-red px-1.5 text-[0.65rem] font-bold text-cream">
                    {pendingCount}
                  </span>
                )}
                {unreadMessages > 0 && (
                  <span className="ml-1 inline-flex items-center justify-center rounded-full bg-green px-1.5 text-[0.65rem] font-bold text-cream" title="Mensajes no leídos">
                    💬{unreadMessages}
                  </span>
                )}
              </Link>
              {isAdminEmail(user?.email) && (
                <Link href="/admin" className="text-sm font-bold text-red transition-colors hover:text-red/70">
                  Admin ↗
                </Link>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            {user && <NotificationBell userId={user.id} initial={notifications} />}
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-full px-4 py-2 text-sm font-semibold text-cocoa/75 transition-colors hover:bg-cocoa/5 hover:text-red"
              >
                Cerrar sesión
              </button>
            </form>
          </div>
        </div>
      </header>
      {children}
    </div>
    </ToastProvider>
  );
}

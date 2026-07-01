import { createClient } from "@/lib/supabase/server";
import { ToastProvider } from "@/components/ui/toast";
import { isAdminEmail } from "@/lib/admin";
import { DashboardNavbar } from "@/components/layout/DashboardNavbar";
import type { Notification } from "@/types/database";

/** Shell del área privada: topbar responsivo, navegación y botón de cerrar sesión. */
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
        <DashboardNavbar
          userId={user?.id ?? ""}
          userEmail={user?.email}
          isAdmin={isAdminEmail(user?.email)}
          pendingCount={pendingCount}
          unreadMessages={unreadMessages}
          initialNotifications={notifications}
        />
        {children}
      </div>
    </ToastProvider>
  );
}

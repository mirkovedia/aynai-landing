import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ToastProvider } from "@/components/ui/toast";
import { NotificationBell } from "@/components/features/notifications/NotificationBell";
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

  // Badge: solicitudes recibidas pendientes.
  let pendingCount = 0;
  if (user) {
    const { count } = await supabase
      .from("exchange_requests")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", user.id)
      .eq("status", "pending");
    pendingCount = count ?? 0;
  }

  let notifications: Notification[] = [];
  if (user) {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20)
      .returns<Notification[]>();
    notifications = data ?? [];
  }

  return (
    <ToastProvider>
    <div className="min-h-screen bg-cream">
      <header className="border-b border-cream-300 bg-cream/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5 sm:px-8">
          <div className="flex items-center gap-6">
            <Link
              href="/dashboard"
              aria-label="AynAI — Inicio"
              className="font-serif text-2xl font-bold tracking-tight"
            >
              <span className="text-cocoa">Ayn</span>
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
              </Link>
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

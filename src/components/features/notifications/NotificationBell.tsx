"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Notification } from "@/types/database";

interface NotificationBellProps {
  userId: string;
  initial: Notification[];
}

/** Campana de notificaciones con badge de no-leídas y panel; escucha Realtime. */
export const NotificationBell = ({ userId, initial }: NotificationBellProps) => {
  const [items, setItems] = useState<Notification[]>(initial);
  const [open, setOpen] = useState(false);
  const unread = items.filter((n) => !n.read).length;

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => setItems((prev) => [payload.new as Notification, ...prev])
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  const markAllRead = async () => {
    const supabase = createClient();
    const unreadIds = items.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    await supabase.from("notifications").update({ read: true }).in("id", unreadIds);
  };

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) void markAllRead();
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label={`Notificaciones${unread > 0 ? ` (${unread} sin leer)` : ""}`}
        className="relative rounded-full p-2 text-cocoa/75 transition-colors hover:bg-cocoa/5 hover:text-red"
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red px-1 text-[0.6rem] font-bold text-cream">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-80 rounded-2xl border border-cream-300 bg-white p-2 shadow-lg">
          {items.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-cocoa/50">Sin notificaciones todavía.</p>
          ) : (
            <ul className="max-h-96 overflow-y-auto">
              {items.slice(0, 12).map((n) => (
                <li key={n.id}>
                  <Link
                    href={n.link ?? "/intercambios"}
                    onClick={() => setOpen(false)}
                    className="block rounded-xl px-3 py-2.5 transition-colors hover:bg-cream/60"
                  >
                    <p className="text-sm font-semibold text-cocoa">{n.title}</p>
                    {n.body && <p className="mt-0.5 text-xs text-cocoa/60">{n.body}</p>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/features/notifications/NotificationBell";
import { signOut } from "@/app/(dashboard)/actions";
import type { Notification } from "@/types/database";

interface DashboardNavbarProps {
  userId: string;
  userEmail?: string;
  isAdmin: boolean;
  pendingCount: number;
  unreadMessages: number;
  initialNotifications: Notification[];
}

/**
 * Navbar interactivo para el Dashboard (Área Privada).
 * Incorpora un menú colapsable en móvil con soporte para contadores e indicadores.
 */
export const DashboardNavbar = ({
  userId,
  userEmail,
  isAdmin,
  pendingCount,
  unreadMessages,
  initialNotifications,
}: DashboardNavbarProps) => {
  const [open, setOpen] = useState(false);

  const handleLinkClick = () => setOpen(false);

  return (
    <header className="sticky top-0 z-50 border-b border-cream-300 bg-cream/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5 sm:px-8">
        <div className="flex items-center gap-6">
          <Link
            href="/dashboard"
            onClick={handleLinkClick}
            aria-label="AYNAI — Inicio"
            className="font-serif text-2xl font-bold tracking-tight"
          >
            <span className="text-cocoa">AYN</span>
            <span className="text-red">AI</span>
          </Link>
          
          {/* Navegación Desktop */}
          <nav className="hidden items-center gap-5 sm:flex">
            <Link
              href="/marketplace"
              className="text-sm font-medium text-cocoa/75 transition-colors hover:text-red"
            >
              Marketplace
            </Link>
            <Link
              href="/intercambios"
              className="relative text-sm font-medium text-cocoa/75 transition-colors hover:text-red"
            >
              Intercambios
              {pendingCount > 0 && (
                <span className="ml-1 inline-flex items-center justify-center rounded-full bg-red px-1.5 text-[0.65rem] font-bold text-cream">
                  {pendingCount}
                </span>
              )}
              {unreadMessages > 0 && (
                <span
                  className="ml-1 inline-flex items-center justify-center rounded-full bg-green px-1.5 text-[0.65rem] font-bold text-cream"
                  title="Mensajes no leídos"
                >
                  💬{unreadMessages}
                </span>
              )}
            </Link>
            {isAdmin && (
              <Link
                href="/admin"
                className="text-sm font-bold text-red transition-colors hover:text-red/70"
              >
                Admin ↗
              </Link>
            )}
          </nav>
        </div>

        {/* Acciones de la Derecha (Desktop) */}
        <div className="flex items-center gap-2">
          {userId && (
            <NotificationBell userId={userId} initial={initialNotifications} />
          )}

          {/* Formulario de Cerrar Sesión Desktop */}
          <form action={signOut} className="hidden sm:block">
            <button
              type="submit"
              className="rounded-full px-4 py-2 text-sm font-semibold text-cocoa/75 transition-colors hover:bg-cocoa/5 hover:text-red"
            >
              Cerrar sesión
            </button>
          </form>

          {/* Botón de Menú Móvil (Hamburguesa) */}
          <button
            type="button"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="rounded-lg p-2 text-cocoa transition-colors hover:bg-cocoa/5 sm:hidden"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Panel Móvil Desplegable */}
      <div
        className={cn(
          "overflow-hidden bg-cream/95 backdrop-blur-md transition-all duration-300 sm:hidden",
          open ? "max-h-[300px] border-b border-cream-300" : "max-h-0"
        )}
      >
        <ul className="flex flex-col gap-1 px-5 py-4">
          <li>
            <Link
              href="/marketplace"
              onClick={handleLinkClick}
              className="block rounded-lg px-3 py-2.5 text-base font-medium text-cocoa/80 transition-colors hover:bg-cocoa/5 hover:text-red"
            >
              Marketplace
            </Link>
          </li>
          <li>
            <Link
              href="/intercambios"
              onClick={handleLinkClick}
              className="flex items-center justify-between rounded-lg px-3 py-2.5 text-base font-medium text-cocoa/80 transition-colors hover:bg-cocoa/5 hover:text-red"
            >
              <span>Intercambios</span>
              <div className="flex gap-1.5">
                {pendingCount > 0 && (
                  <span className="inline-flex items-center justify-center rounded-full bg-red px-2 py-0.5 text-xs font-bold text-cream">
                    {pendingCount}
                  </span>
                )}
                {unreadMessages > 0 && (
                  <span className="inline-flex items-center justify-center rounded-full bg-green px-2 py-0.5 text-xs font-bold text-cream">
                    💬 {unreadMessages}
                  </span>
                )}
              </div>
            </Link>
          </li>
          {isAdmin && (
            <li>
              <Link
                href="/admin"
                onClick={handleLinkClick}
                className="block rounded-lg px-3 py-2.5 text-base font-bold text-red transition-colors hover:bg-cocoa/5"
              >
                Admin ↗
              </Link>
            </li>
          )}
          <li className="mt-2 border-t border-cream-200 pt-2">
            <form action={signOut} onSubmit={handleLinkClick} className="w-full">
              <button
                type="submit"
                className="w-full rounded-xl bg-cocoa/5 py-2.5 text-center text-sm font-semibold text-cocoa hover:bg-cocoa/10 hover:text-red transition-colors"
              >
                Cerrar sesión
              </button>
            </form>
          </li>
        </ul>
      </div>
    </header>
  );
};

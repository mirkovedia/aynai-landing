import Link from "next/link";
import { signOut } from "./actions";

/** Shell del área privada: topbar con logo y botón de cerrar sesión. */
export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-cream">
      <header className="border-b border-cream-300 bg-cream/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5 sm:px-8">
          <Link
            href="/"
            aria-label="AynAI — Inicio"
            className="font-serif text-2xl font-bold tracking-tight"
          >
            <span className="text-cocoa">Ayn</span>
            <span className="text-red">AI</span>
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-full px-4 py-2 text-sm font-semibold text-cocoa/75 transition-colors hover:bg-cocoa/5 hover:text-red"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </header>
      {children}
    </div>
  );
}

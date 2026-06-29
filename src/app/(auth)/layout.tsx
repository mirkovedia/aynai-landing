import Link from "next/link";

/** Shell centrado y oscuro para las pantallas de autenticación. */
export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen flex-col bg-cocoa">
      <div className="tricolor-bar h-1.5 w-full" />
      <header className="px-6 py-5">
        <Link
          href="/"
          aria-label="AYNAI — Inicio"
          className="font-serif text-2xl font-bold tracking-tight"
        >
          <span className="text-cream">AYN</span>
          <span className="text-red">AI</span>
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        {children}
      </main>
    </div>
  );
}

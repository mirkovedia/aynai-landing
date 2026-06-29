import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !isAdminEmail(user.email)) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <span className="font-serif text-xl font-bold">
              <span className="text-cocoa">Ayn</span><span className="text-red">AI</span>
            </span>
            <span className="rounded-full bg-red/10 px-2.5 py-0.5 text-xs font-bold text-red">ADMIN</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <a href="/dashboard" className="hover:text-gray-900">← Volver al app</a>
            <span className="text-gray-300">|</span>
            <span>{user.email}</span>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingWizard } from "./OnboardingWizard";

/** Página de bienvenida — solo accesible si onboarding no está completo. */
export default async function BienvenidaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, onboarding_completed")
    .eq("id", user.id)
    .single();

  if (profile?.onboarding_completed) redirect("/dashboard");

  const name = profile?.full_name?.trim() || user.email?.split("@")[0] || "Usuario";

  return (
    <main className="flex min-h-screen items-center justify-center bg-cream px-5 py-12">
      <OnboardingWizard name={name} />
    </main>
  );
}

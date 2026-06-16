import { createBrowserClient } from "@supabase/ssr";

/** Cliente de Supabase para componentes del lado del navegador. */
export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

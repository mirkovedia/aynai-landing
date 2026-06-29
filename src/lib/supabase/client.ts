import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/supabase";

/** Cliente de Supabase para componentes del lado del navegador. */
export const createClient = () =>
  createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

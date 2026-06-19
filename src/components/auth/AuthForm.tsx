"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { translateAuthError } from "@/lib/auth-errors";
import { Button } from "@/components/ui/button";
import { GoogleButton } from "@/components/auth/GoogleButton";

type Mode = "login" | "registro";

/** Formulario de autenticación. `mode` decide entre iniciar sesión o registrarse. */
export const AuthForm = ({ mode }: { mode: Mode }) => {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isRegister = mode === "registro";

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();

    const { error: authError } = isRegister
      ? await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        })
      : await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (authError) {
      setError(translateAuthError(authError.message));
      return;
    }

    router.push("/marketplace");
    router.refresh();
  };

  const inputClass =
    "w-full rounded-xl border border-cream/20 bg-cream/5 px-4 py-3 text-cream placeholder:text-cream/40 focus:border-gold/60 focus:outline-none focus:ring-2 focus:ring-gold/30";

  return (
    <div className="w-full max-w-md">
      <h1 className="font-serif text-3xl font-bold text-cream">
        {isRegister ? "Crea tu cuenta" : "Inicia sesión"}
      </h1>
      <p className="mt-2 text-sm text-cream/60">
        {isRegister
          ? "Empieza a construir tu reputación verificable."
          : "Bienvenido de vuelta a AynAI."}
      </p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        {isRegister && (
          <div>
            <label htmlFor="fullName" className="sr-only">Nombre completo</label>
            <input
              id="fullName"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nombre completo"
              className={inputClass}
            />
          </div>
        )}
        <div>
          <label htmlFor="email" className="sr-only">Correo</label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@correo.com"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="password" className="sr-only">Contraseña</label>
          <input
            id="password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Contraseña (mín. 6 caracteres)"
            className={inputClass}
          />
        </div>

        {error && (
          <p className="rounded-lg border border-red/30 bg-red/10 px-4 py-2 text-sm text-cream">
            {error}
          </p>
        )}

        <Button type="submit" size="lg" disabled={loading} className="w-full">
          {loading ? "Procesando..." : isRegister ? "Crear cuenta" : "Entrar"}
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3 text-cream/40">
        <span className="h-px flex-1 bg-cream/15" />
        <span className="text-xs">o</span>
        <span className="h-px flex-1 bg-cream/15" />
      </div>

      <GoogleButton />

      <p className="mt-8 text-center text-sm text-cream/60">
        {isRegister ? "¿Ya tienes cuenta? " : "¿No tienes cuenta? "}
        <Link
          href={isRegister ? "/login" : "/registro"}
          className="font-semibold text-gold hover:underline"
        >
          {isRegister ? "Inicia sesión" : "Regístrate"}
        </Link>
      </p>
    </div>
  );
};

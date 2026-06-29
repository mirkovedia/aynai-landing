"use client";

import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";

/** Barra fija en la parte inferior en mobile: aparece al salir del hero. */
export const MobileCta = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > window.innerHeight * 0.7);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 border-t border-cream-300 bg-cream/95 px-5 py-4 backdrop-blur-md md:hidden">
      <div className="flex gap-3">
        <a
          href="/registro"
          className="flex flex-1 items-center justify-center gap-2 rounded-full bg-cocoa px-5 py-3 text-sm font-bold text-cream"
        >
          Crear cuenta gratis
          <ArrowRight size={16} />
        </a>
        <a
          href="/login"
          className="flex items-center justify-center rounded-full border border-cocoa/20 px-5 py-3 text-sm font-semibold text-cocoa/80"
        >
          Entrar
        </a>
      </div>
    </div>
  );
};

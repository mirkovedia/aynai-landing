"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StarRating } from "@/components/ui/star-rating";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { submitRating } from "@/app/(dashboard)/intercambios/actions";

interface RatingFormProps {
  requestId: string;
  counterpartName: string;
}

/** Formulario para calificar a la contraparte tras un intercambio completado. */
export const RatingForm = ({ requestId, counterpartName }: RatingFormProps) => {
  const router = useRouter();
  const { toast } = useToast();
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async () => {
    if (stars < 1) {
      toast("Selecciona al menos una estrella", "error");
      return;
    }
    setBusy(true);
    try {
      const result = await submitRating({ requestId, stars, comment: comment.trim() || undefined });
      if (result.error) {
        toast(result.error, "error");
      } else {
        toast("¡Gracias por tu calificación!", "success");
        router.refresh();
      }
    } catch {
      toast("Ocurrió un error inesperado. Intenta de nuevo.", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4 border-t border-cream-200 pt-4">
      <p className="text-sm font-semibold text-cocoa">¿Cómo fue tu intercambio con {counterpartName}?</p>
      <div className="mt-2">
        <StarRating value={stars} onChange={setStars} />
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={500}
        rows={2}
        placeholder="Deja un comentario (opcional)"
        className="mt-3 w-full rounded-2xl border border-cream-300 bg-cream/40 px-4 py-2 text-sm text-cocoa placeholder:text-cocoa/40 focus:border-gold focus:outline-none"
      />
      <div className="mt-3">
        <Button as="button" type="button" size="sm" loading={busy} onClick={handleSubmit}>
          Enviar calificación
        </Button>
      </div>
    </div>
  );
};

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createExchangeRequest } from "@/app/(dashboard)/intercambios/actions";

interface ProposeExchangeFormProps {
  recipientId: string;
  recipientName: string;
  /** Skills que el destinatario OFRECE (lo que yo puedo querer). */
  recipientOffers: string[];
  /** Skills que YO ofrezco. */
  myOffers: string[];
  onClose: () => void;
}

const fieldClass =
  "w-full rounded-xl border border-cream-300 bg-white px-4 py-2.5 text-sm text-cocoa focus:border-gold focus:outline-none";
const labelClass = "block text-sm font-medium text-cocoa/70";

/** Formulario para proponer un Ayni: elijo qué ofrezco y qué quiero del destinatario. */
export const ProposeExchangeForm = ({
  recipientId,
  recipientName,
  recipientOffers,
  myOffers,
  onClose,
}: ProposeExchangeFormProps) => {
  const router = useRouter();
  const [offerSkill, setOfferSkill] = useState(myOffers[0] ?? "");
  const [wantSkill, setWantSkill] = useState(recipientOffers[0] ?? "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!offerSkill || !wantSkill) {
      setError("Elige qué ofreces y qué quieres.");
      return;
    }

    setSending(true);
    try {
      const result = await createExchangeRequest({ recipientId, offerSkill, wantSkill, message });
      if (result.error) {
        setError(result.error);
        return;
      }
      setDone(true);
      router.refresh();
    } catch {
      setError("Ocurrió un error inesperado. Intenta de nuevo.");
    } finally {
      setSending(false);
    }
  };

  if (done) {
    return (
      <div className="mt-4 rounded-2xl border border-green/30 bg-green/5 p-4 text-sm text-cocoa">
        ✓ Propuesta enviada a {recipientName}. Te avisaremos en <a href="/intercambios" className="font-semibold text-red hover:underline">Intercambios</a>.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4 rounded-2xl border border-cream-300 bg-cream/40 p-4">
      <div>
        <label htmlFor={`offer-${recipientId}`} className={labelClass}>Ofrezco</label>
        {myOffers.length === 0 ? (
          <p className="mt-1 text-sm text-cocoa/50">
            Primero agrega habilidades que ofreces en <a href="/perfil/editar" className="font-semibold text-red hover:underline">tu perfil</a>.
          </p>
        ) : (
          <select id={`offer-${recipientId}`} value={offerSkill} onChange={(e) => setOfferSkill(e.target.value)} className={fieldClass}>
            {myOffers.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        )}
      </div>

      <div>
        <label htmlFor={`want-${recipientId}`} className={labelClass}>Quiero de {recipientName}</label>
        {recipientOffers.length === 0 ? (
          <p className="mt-1 text-sm text-cocoa/50">Esta persona aún no ofrece habilidades.</p>
        ) : (
          <select id={`want-${recipientId}`} value={wantSkill} onChange={(e) => setWantSkill(e.target.value)} className={fieldClass}>
            {recipientOffers.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        )}
      </div>

      <div>
        <label htmlFor={`msg-${recipientId}`} className={labelClass}>Mensaje (opcional)</label>
        <textarea
          id={`msg-${recipientId}`}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={2}
          maxLength={500}
          className={fieldClass}
          placeholder="Cuéntale tu idea de intercambio"
        />
      </div>

      {error && <p className="text-sm text-red">{error}</p>}

      <div className="flex gap-3">
        <Button type="submit" size="sm" disabled={sending || myOffers.length === 0 || recipientOffers.length === 0}>
          {sending ? "Enviando..." : "Enviar propuesta"}
        </Button>
        <Button as="button" type="button" variant="ghost" size="sm" onClick={onClose}>
          Cancelar
        </Button>
      </div>
    </form>
  );
};

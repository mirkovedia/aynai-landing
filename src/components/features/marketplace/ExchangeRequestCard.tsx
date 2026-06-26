"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { respondToRequest, cancelRequest } from "@/app/(dashboard)/intercambios/actions";
import { CommissionPayment } from "./CommissionPayment";
import { COMMISSION_AMOUNT_BS } from "@/lib/payments/constants";
import type { ExchangeRequest, ExchangeStatus, ProfileLinks, CommissionPayment as CommissionPaymentRow } from "@/types/database";

export interface ExchangeParty {
  full_name: string | null;
  username: string | null;
  links: ProfileLinks;
}

interface ExchangeRequestCardProps {
  request: ExchangeRequest;
  /** "received" = soy el destinatario; "sent" = yo la envié. */
  role: "received" | "sent";
  counterpart: ExchangeParty;
  /** Mi pago de comisión para este intercambio (null si aún no existe). */
  myPayment: CommissionPaymentRow | null;
}

const statusLabel: Record<ExchangeStatus, string> = {
  pending: "Pendiente",
  accepted: "Aceptada",
  rejected: "Rechazada",
  cancelled: "Cancelada",
  completed: "Completado",
};

const statusColor: Record<ExchangeStatus, string> = {
  pending: "bg-gold/15 text-cocoa",
  accepted: "bg-green/10 text-green",
  rejected: "bg-red/10 text-red",
  cancelled: "bg-cocoa/10 text-cocoa/60",
  completed: "bg-green/15 text-green",
};

/** Acción destructiva pendiente de confirmación. */
type PendingConfirm = "reject" | "cancel" | null;

/** Tarjeta de una solicitud de intercambio (recibida o enviada). */
export const ExchangeRequestCard = ({ request, role, counterpart, myPayment }: ExchangeRequestCardProps) => {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState<PendingConfirm>(null);

  const name = counterpart.full_name?.trim() || counterpart.username || "Usuario";

  const run = async (fn: () => Promise<{ error?: string }>, successMsg: string) => {
    setBusy(true);
    try {
      const result = await fn();
      if (result.error) {
        toast(result.error, "error");
      } else {
        toast(successMsg, "success");
        router.refresh();
      }
    } catch {
      toast("Ocurrió un error inesperado. Intenta de nuevo.", "error");
    } finally {
      setBusy(false);
      setConfirming(null);
    }
  };

  const handleConfirm = () => {
    if (confirming === "reject") {
      void run(() => respondToRequest({ requestId: request.id, action: "reject" }), "Propuesta rechazada");
    } else if (confirming === "cancel") {
      void run(() => cancelRequest({ requestId: request.id }), "Propuesta cancelada");
    }
  };

  const hasLinks = Boolean(
    counterpart.links?.web || counterpart.links?.linkedin || counterpart.links?.github || counterpart.links?.x
  );

  return (
    <div className="rounded-3xl border border-cream-300 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-cocoa/60">
            {role === "received" ? "De" : "Para"} <span className="font-semibold text-cocoa">{name}</span>
          </p>
          <p className="mt-2 text-sm text-cocoa">
            Ofrece <span className="font-semibold text-green">{request.offer_skill}</span> por{" "}
            <span className="font-semibold text-red">{request.want_skill}</span>
          </p>
          {request.message && (
            <p className="mt-2 text-sm leading-relaxed text-cocoa/70">“{request.message}”</p>
          )}
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${statusColor[request.status]}`}>
          {statusLabel[request.status]}
        </span>
      </div>

      {/* Conexión concretada: revelar contacto solo si YO pagué mi comisión (desbloqueo independiente). */}
      {request.status === "accepted" && (
        myPayment?.status === "paid" ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="mt-4 rounded-2xl border border-green/40 bg-green/5 p-4 text-sm shadow-[0_0_0_3px_rgba(34,139,87,0.08)]"
          >
            <p className="flex items-center gap-1.5 font-semibold text-cocoa">
              <span aria-hidden="true">🎉</span> Contacto de {name}:
            </p>
            {hasLinks ? (
              <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-cocoa/80">
                {counterpart.links?.web && <li><a className="hover:underline" href={counterpart.links.web} target="_blank" rel="noopener noreferrer">Web</a></li>}
                {counterpart.links?.linkedin && <li><a className="hover:underline" href={counterpart.links.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a></li>}
                {counterpart.links?.github && <li><a className="hover:underline" href={counterpart.links.github} target="_blank" rel="noopener noreferrer">GitHub</a></li>}
                {counterpart.links?.x && <li><a className="hover:underline" href={counterpart.links.x} target="_blank" rel="noopener noreferrer">X</a></li>}
              </ul>
            ) : (
              <p className="mt-1 text-cocoa/60">
                {counterpart.username
                  ? <>Visita su perfil: <a className="font-semibold text-red hover:underline" href={`/u/${counterpart.username}`}>@{counterpart.username}</a></>
                  : "Esta persona aún no agregó enlaces de contacto."}
              </p>
            )}
          </motion.div>
        ) : (
          <CommissionPayment
            exchangeRequestId={request.id}
            counterpartName={name}
            amountBs={myPayment?.amount_bs ?? COMMISSION_AMOUNT_BS}
          />
        )
      )}

      {request.status === "pending" && (
        <div className="mt-4 flex gap-3">
          {role === "received" ? (
            <>
              <Button
                as="button"
                type="button"
                size="sm"
                loading={busy}
                onClick={() => run(() => respondToRequest({ requestId: request.id, action: "accept" }), "Solicitud aceptada")}
              >
                Aceptar
              </Button>
              <Button as="button" type="button" variant="ghost" size="sm" disabled={busy} onClick={() => setConfirming("reject")}>
                Rechazar
              </Button>
            </>
          ) : (
            <Button as="button" type="button" variant="ghost" size="sm" disabled={busy} onClick={() => setConfirming("cancel")}>
              Cancelar
            </Button>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirming !== null}
        title={confirming === "reject" ? "¿Rechazar esta propuesta?" : "¿Cancelar esta propuesta?"}
        description={
          confirming === "reject"
            ? `${name} ya no podrá concretar este intercambio contigo.`
            : "Se retirará tu propuesta. Podrás enviar otra más tarde."
        }
        confirmLabel={confirming === "reject" ? "Rechazar" : "Cancelar propuesta"}
        cancelLabel="Volver"
        loading={busy}
        onConfirm={handleConfirm}
        onCancel={() => setConfirming(null)}
      />
    </div>
  );
};

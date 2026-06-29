"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { startCommissionPayment, confirmMockPayment } from "@/app/(dashboard)/intercambios/actions";

interface CommissionPaymentProps {
  exchangeRequestId: string;
  counterpartName: string;
  amountBs: number;
}

/** Flujo de pago de la comisión: muestra QR de Yape y permite confirmar el pago. */
export const CommissionPayment = ({ exchangeRequestId, counterpartName, amountBs }: CommissionPaymentProps) => {
  const router = useRouter();
  const { toast } = useToast();
  const [chargeId, setChargeId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleStart = async () => {
    setBusy(true);
    try {
      const result = await startCommissionPayment({ exchangeRequestId });
      if (result.error) {
        toast(result.error, "error");
        return;
      }
      setChargeId(result.chargeId ?? null);
    } catch {
      toast("Ocurrió un error inesperado. Intenta de nuevo.", "error");
    } finally {
      setBusy(false);
    }
  };

  const handleConfirm = async () => {
    if (!chargeId) return;
    setBusy(true);
    try {
      const result = await confirmMockPayment({ chargeId });
      if (result.error) {
        toast(result.error, "error");
        return;
      }
      toast(`¡Conexión desbloqueada con ${counterpartName}!`, "success");
      router.refresh();
    } catch {
      toast("Ocurrió un error inesperado. Intenta de nuevo.", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4 rounded-2xl border border-gold/40 bg-gold/5 p-4 text-sm">
      <p className="font-semibold text-cocoa">
        Paga tu comisión (Bs {amountBs}) para ver el contacto de {counterpartName}.
      </p>

      {!chargeId ? (
        <Button as="button" type="button" size="sm" className="mt-3" loading={busy} onClick={handleStart}>
          {busy ? "Generando…" : `Pagar Bs ${amountBs} por Yape`}
        </Button>
      ) : (
        <div className="mt-3 space-y-3">
          <div>
            <p className="text-xs text-cocoa/60 mb-2">
              Escanea con Yape y paga <span className="font-semibold text-cocoa">Bs {amountBs}</span>:
            </p>
            <div className="flex justify-center">
              <Image
                src="/qr-yape.jpeg"
                alt="QR Yape para pagar la comisión"
                width={200}
                height={200}
                className="rounded-xl"
              />
            </div>
          </div>
          <Button as="button" type="button" size="sm" loading={busy} onClick={handleConfirm}>
            {busy ? "Confirmando…" : "Ya pagué"}
          </Button>
        </div>
      )}
    </div>
  );
};

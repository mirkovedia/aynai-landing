"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { startCommissionPayment, confirmMockPayment } from "@/app/(dashboard)/intercambios/actions";

interface CommissionPaymentProps {
  exchangeRequestId: string;
  counterpartName: string;
  amountBs: number;
}

/** Flujo de pago de la comisión: genera un QR simulado y permite confirmarlo (mock). */
export const CommissionPayment = ({ exchangeRequestId, counterpartName, amountBs }: CommissionPaymentProps) => {
  const router = useRouter();
  const [qrPayload, setQrPayload] = useState<string | null>(null);
  const [chargeId, setChargeId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleStart = async () => {
    setError(null);
    setBusy(true);
    try {
      const result = await startCommissionPayment({ exchangeRequestId });
      if (result.error) {
        setError(result.error);
        return;
      }
      setQrPayload(result.qrPayload ?? null);
      setChargeId(result.chargeId ?? null);
    } catch {
      setError("Ocurrió un error inesperado. Intenta de nuevo.");
    } finally {
      setBusy(false);
    }
  };

  const handleConfirm = async () => {
    if (!chargeId) return;
    setError(null);
    setBusy(true);
    try {
      const result = await confirmMockPayment({ chargeId });
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    } catch {
      setError("Ocurrió un error inesperado. Intenta de nuevo.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4 rounded-2xl border border-gold/40 bg-gold/5 p-4 text-sm">
      <p className="font-semibold text-cocoa">
        Paga tu comisión (Bs {amountBs}) para ver el contacto de {counterpartName}.
      </p>

      {error && <p className="mt-2 text-sm text-red">{error}</p>}

      {!qrPayload ? (
        <Button as="button" type="button" size="sm" className="mt-3" disabled={busy} onClick={handleStart}>
          {busy ? "Generando..." : `Pagar comisión (Bs ${amountBs})`}
        </Button>
      ) : (
        <div className="mt-3 space-y-3">
          <div>
            <p className="text-xs text-cocoa/60">Escanea este QR (simulado) para pagar:</p>
            <pre className="mt-1 overflow-x-auto rounded-xl border border-cream-300 bg-white px-3 py-3 text-xs text-cocoa">{qrPayload}</pre>
          </div>
          <Button as="button" type="button" size="sm" disabled={busy} onClick={handleConfirm}>
            {busy ? "Confirmando..." : "Ya pagué (simular)"}
          </Button>
        </div>
      )}
    </div>
  );
};

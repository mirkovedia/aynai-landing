"use client";

import { useState } from "react";
import { adminConfirmPayment, adminRevokePayment } from "./actions";

interface Props {
  paymentId: string;
  status: string;
}

export const PaymentActions = ({ paymentId, status }: Props) => {
  const [busy, setBusy] = useState(false);

  const run = async (fn: (id: string) => Promise<{ error?: string }>) => {
    setBusy(true);
    const result = await fn(paymentId);
    if (result.error) alert(result.error);
    setBusy(false);
  };

  return (
    <div className="flex gap-2">
      {status !== "paid" && (
        <button
          type="button"
          disabled={busy}
          onClick={() => run(adminConfirmPayment)}
          className="rounded-lg bg-green-600 px-3 py-1 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50"
        >
          ✓ Confirmar
        </button>
      )}
      {status === "paid" && (
        <button
          type="button"
          disabled={busy}
          onClick={() => run(adminRevokePayment)}
          className="rounded-lg bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
        >
          ✕ Anular
        </button>
      )}
    </div>
  );
};

import type { PaymentStatus } from "@/types/database";
import type { Charge, CreateChargeInput, PaymentProvider } from "./provider";

const VALID_STATUS: PaymentStatus[] = ["pending", "paid", "failed"];

/**
 * Proveedor de pago simulado. Genera un "QR" textual determinístico y acepta
 * confirmaciones directas. Reemplazable por el PSP real sin tocar la lógica de negocio.
 */
export class MockQrProvider implements PaymentProvider {
  readonly name = "mock";

  async createCharge({ amountBs, reference }: CreateChargeInput): Promise<Charge> {
    const chargeId = `AYNI-MOCK-${reference}`;
    const qrPayload = `AYNI-MOCK|ref=${reference}|monto=Bs ${amountBs}`;
    return { chargeId, qrPayload, status: "pending" };
  }

  parseWebhook(body: unknown): { chargeId: string; status: PaymentStatus } | null {
    if (typeof body !== "object" || body === null) return null;
    const { chargeId, status } = body as Record<string, unknown>;
    if (typeof chargeId !== "string" || chargeId.length === 0) return null;
    if (typeof status !== "string" || !VALID_STATUS.includes(status as PaymentStatus)) return null;
    return { chargeId, status: status as PaymentStatus };
  }
}

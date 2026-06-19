import type { PaymentStatus } from "@/types/database";

export interface CreateChargeInput {
  amountBs: number;
  /** Referencia única del cargo (ej: el id del commission_payments). */
  reference: string;
}

export interface Charge {
  chargeId: string;
  /** Contenido del QR a renderizar (texto). */
  qrPayload: string;
  status: PaymentStatus;
}

/** Abstracción de pasarela de pago. El PSP real (BNB/Tigo/etc.) implementa esta interfaz. */
export interface PaymentProvider {
  readonly name: string;
  createCharge(input: CreateChargeInput): Promise<Charge>;
  /** Verifica el payload de webhook del PSP y devuelve el cargo + estado, o null si es inválido. */
  parseWebhook(body: unknown): { chargeId: string; status: PaymentStatus } | null;
}

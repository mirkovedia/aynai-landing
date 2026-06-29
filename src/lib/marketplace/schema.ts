import { z } from "zod";
import type { ExchangeStatus } from "@/types/database";

const skillName = z.string().min(1).max(40);

/** UUID v4 en formato estándar (8-4-4-4-12 dígitos hexadecimales). */
const uuid = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

/** Propuesta de intercambio: offerSkill (ofrezco) por wantSkill (quiero). */
export const createExchangeSchema = z.object({
  recipientId: uuid,
  offerSkill: skillName,
  wantSkill: skillName,
  message: z.string().max(500).optional(),
});

/** Respuesta del destinatario a una solicitud pendiente. */
export const respondSchema = z.object({
  requestId: uuid,
  action: z.enum(["accept", "reject"]),
});

/** Cancelación del solicitante. */
export const cancelSchema = z.object({
  requestId: uuid,
});

/** Confirmación de completado por una de las partes. */
export const confirmExchangeSchema = z.object({
  requestId: uuid,
});
export type ConfirmExchangeInput = z.infer<typeof confirmExchangeSchema>;

/** Solo se puede confirmar el completado de un intercambio 'accepted'. */
export const canConfirm = (status: ExchangeStatus): boolean => status === "accepted";

/** Calificación de la contraparte tras un intercambio completado. */
export const submitRatingSchema = z.object({
  requestId: uuid,
  stars: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
});
export type SubmitRatingInput = z.infer<typeof submitRatingSchema>;

export type CreateExchangeInput = z.infer<typeof createExchangeSchema>;
export type RespondInput = z.infer<typeof respondSchema>;
export type CancelInput = z.infer<typeof cancelSchema>;

/** Solo se puede aceptar/rechazar/cancelar una solicitud en 'pending'. */
export const canRespond = (status: ExchangeStatus): boolean => status === "pending";

/** Inicia el pago de la comisión del usuario para un intercambio aceptado. */
export const startCommissionPaymentSchema = z.object({
  exchangeRequestId: uuid,
});

/** Confirma (simula) el pago de un cargo mock. */
export const confirmMockPaymentSchema = z.object({
  chargeId: z.string().min(1),
});

export type StartCommissionPaymentInput = z.infer<typeof startCommissionPaymentSchema>;
export type ConfirmMockPaymentInput = z.infer<typeof confirmMockPaymentSchema>;

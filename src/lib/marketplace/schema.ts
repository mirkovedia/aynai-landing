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

export type CreateExchangeInput = z.infer<typeof createExchangeSchema>;
export type RespondInput = z.infer<typeof respondSchema>;
export type CancelInput = z.infer<typeof cancelSchema>;

/** Solo se puede aceptar/rechazar/cancelar una solicitud en 'pending'. */
export const canRespond = (status: ExchangeStatus): boolean => status === "pending";

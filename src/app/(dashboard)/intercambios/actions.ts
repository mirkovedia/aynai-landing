"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createExchangeSchema,
  respondSchema,
  cancelSchema,
  canRespond,
  type CreateExchangeInput,
  type RespondInput,
  type CancelInput,
} from "@/lib/marketplace/schema";
import type { ExchangeRequest } from "@/types/database";

export interface ActionResult {
  error?: string;
  code?: string;
  details?: unknown;
}

/** Crea una solicitud de intercambio 'pending' del usuario autenticado al destinatario. */
export const createExchangeRequest = async (
  input: CreateExchangeInput
): Promise<ActionResult> => {
  const parsed = createExchangeSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Datos inválidos", code: "VALIDATION_ERROR", details: parsed.error.flatten() };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return { error: "No autenticado", code: "UNAUTHENTICATED" };

  const { recipientId, offerSkill, wantSkill, message } = parsed.data;

  if (recipientId === user.id) {
    return { error: "No puedes proponerte un intercambio a ti mismo", code: "SELF_REQUEST" };
  }

  // Evitar duplicados pendientes al mismo destinatario.
  const { data: existing } = await supabase
    .from("exchange_requests")
    .select("id")
    .eq("requester_id", user.id)
    .eq("recipient_id", recipientId)
    .eq("status", "pending")
    .maybeSingle();
  if (existing) {
    return { error: "Ya tienes una solicitud pendiente con esta persona", code: "DUPLICATE" };
  }

  const { error: insertError } = await supabase.from("exchange_requests").insert({
    requester_id: user.id,
    recipient_id: recipientId,
    offer_skill: offerSkill,
    want_skill: wantSkill,
    message: message || null,
  });
  if (insertError) {
    console.error("createExchangeRequest insert error:", insertError);
    return { error: "No pudimos enviar tu propuesta", code: "DB_ERROR" };
  }

  revalidatePath("/intercambios");
  return {};
};

/** El destinatario acepta o rechaza una solicitud pendiente dirigida a él. */
export const respondToRequest = async (input: RespondInput): Promise<ActionResult> => {
  const parsed = respondSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Datos inválidos", code: "VALIDATION_ERROR", details: parsed.error.flatten() };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return { error: "No autenticado", code: "UNAUTHENTICATED" };

  const { requestId, action } = parsed.data;

  const { data: row } = await supabase
    .from("exchange_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle<ExchangeRequest>();
  if (!row) return { error: "Solicitud no encontrada", code: "NOT_FOUND" };
  if (row.recipient_id !== user.id) {
    return { error: "No puedes responder esta solicitud", code: "FORBIDDEN" };
  }
  if (!canRespond(row.status)) {
    return { error: "Esta solicitud ya fue resuelta", code: "INVALID_STATE" };
  }

  const { error: updateError } = await supabase
    .from("exchange_requests")
    .update({ status: action === "accept" ? "accepted" : "rejected", updated_at: new Date().toISOString() })
    .eq("id", requestId);
  if (updateError) {
    console.error("respondToRequest update error:", updateError);
    return { error: "No pudimos actualizar la solicitud", code: "DB_ERROR" };
  }

  revalidatePath("/intercambios");
  return {};
};

/** El solicitante cancela su propia solicitud pendiente. */
export const cancelRequest = async (input: CancelInput): Promise<ActionResult> => {
  const parsed = cancelSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Datos inválidos", code: "VALIDATION_ERROR", details: parsed.error.flatten() };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return { error: "No autenticado", code: "UNAUTHENTICATED" };

  const { requestId } = parsed.data;

  const { data: row } = await supabase
    .from("exchange_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle<ExchangeRequest>();
  if (!row) return { error: "Solicitud no encontrada", code: "NOT_FOUND" };
  if (row.requester_id !== user.id) {
    return { error: "No puedes cancelar esta solicitud", code: "FORBIDDEN" };
  }
  if (!canRespond(row.status)) {
    return { error: "Esta solicitud ya fue resuelta", code: "INVALID_STATE" };
  }

  const { error: updateError } = await supabase
    .from("exchange_requests")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", requestId);
  if (updateError) {
    console.error("cancelRequest update error:", updateError);
    return { error: "No pudimos cancelar la solicitud", code: "DB_ERROR" };
  }

  revalidatePath("/intercambios");
  return {};
};

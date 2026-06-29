"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createExchangeSchema,
  respondSchema,
  cancelSchema,
  canRespond,
  confirmExchangeSchema,
  canConfirm,
  submitRatingSchema,
  startCommissionPaymentSchema,
  confirmMockPaymentSchema,
  type CreateExchangeInput,
  type RespondInput,
  type CancelInput,
  type ConfirmExchangeInput,
  type SubmitRatingInput,
  type StartCommissionPaymentInput,
  type ConfirmMockPaymentInput,
} from "@/lib/marketplace/schema";
import { getPaymentProvider } from "@/lib/payments";
import { COMMISSION_AMOUNT_BS } from "@/lib/payments/constants";
import { notify } from "@/lib/notifications";
import type { ExchangeRequest, CommissionPayment } from "@/types/database";

export interface ActionResult {
  error?: string;
  code?: string;
  details?: unknown;
}

/** Nombre legible del actor para los textos de notificación. */
const actorName = async (
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<string> => {
  const { data } = await supabase
    .from("profiles")
    .select("full_name, username")
    .eq("id", userId)
    .maybeSingle<{ full_name: string | null; username: string | null }>();
  return data?.full_name?.trim() || data?.username || "Alguien";
};

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

  const who = await actorName(supabase, user.id);
  await notify({
    userId: recipientId,
    type: "request_received",
    title: "Nueva solicitud de intercambio",
    body: `${who} ofrece ${offerSkill} por ${wantSkill}.`,
    link: "/intercambios",
  });

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

  const newStatus = action === "accept" ? "accepted" : "rejected";
  const { error: updateError } = await supabase
    .from("exchange_requests")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", requestId)
    .eq("recipient_id", user.id);
  if (updateError) {
    console.error("respondToRequest update error:", updateError);
    return { error: "No pudimos actualizar la solicitud", code: "DB_ERROR" };
  }

  // Al aceptar, crear las comisiones pendientes de ambas partes (idempotente por unique).
  if (action === "accept") {
    const provider = getPaymentProvider();
    const { error: paymentsError } = await supabase.from("commission_payments").insert([
      { exchange_request_id: requestId, payer_id: row.requester_id, amount_bs: COMMISSION_AMOUNT_BS, provider: provider.name },
      { exchange_request_id: requestId, payer_id: row.recipient_id, amount_bs: COMMISSION_AMOUNT_BS, provider: provider.name },
    ]);
    if (paymentsError) {
      console.error("respondToRequest payments insert error:", paymentsError);
      // No bloquea la aceptación: las filas pueden crearse luego en startCommissionPayment.
    }
  }

  const who = await actorName(supabase, user.id);
  await notify({
    userId: row.requester_id,
    type: action === "accept" ? "request_accepted" : "request_rejected",
    title: action === "accept" ? "Tu propuesta fue aceptada" : "Tu propuesta fue rechazada",
    body: action === "accept"
      ? `${who} aceptó tu intercambio. Paga la comisión para revelar el contacto.`
      : `${who} rechazó tu intercambio.`,
    link: "/intercambios",
  });

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
    .eq("id", requestId)
    .eq("requester_id", user.id);
  if (updateError) {
    console.error("cancelRequest update error:", updateError);
    return { error: "No pudimos cancelar la solicitud", code: "DB_ERROR" };
  }

  revalidatePath("/intercambios");
  return {};
};

/** Una de las partes confirma que el intercambio se concretó. Cuando ambas confirman, el trigger lo marca 'completed'. */
export const confirmExchange = async (input: ConfirmExchangeInput): Promise<ActionResult> => {
  const parsed = confirmExchangeSchema.safeParse(input);
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

  const isRequester = row.requester_id === user.id;
  const isRecipient = row.recipient_id === user.id;
  if (!isRequester && !isRecipient) {
    return { error: "No eres parte de este intercambio", code: "FORBIDDEN" };
  }
  if (!canConfirm(row.status)) {
    return { error: "Este intercambio no se puede confirmar todavía", code: "INVALID_STATE" };
  }

  const patch = isRequester ? { requester_confirmed: true } : { recipient_confirmed: true };
  const { error: updateError } = await supabase
    .from("exchange_requests")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", requestId);
  if (updateError) {
    console.error("confirmExchange update error:", updateError);
    return { error: "No pudimos confirmar el intercambio", code: "DB_ERROR" };
  }

  const { data: after } = await supabase
    .from("exchange_requests")
    .select("status, requester_id, recipient_id")
    .eq("id", requestId)
    .maybeSingle<{ status: string; requester_id: string; recipient_id: string }>();
  if (after?.status === "completed") {
    await Promise.all([
      notify({ userId: after.requester_id, type: "exchange_completed", title: "Intercambio completado", body: "Ambos confirmaron. ¡Ya puedes calificar!", link: "/intercambios" }),
      notify({ userId: after.recipient_id, type: "exchange_completed", title: "Intercambio completado", body: "Ambos confirmaron. ¡Ya puedes calificar!", link: "/intercambios" }),
    ]);
  }

  revalidatePath("/intercambios");
  return {};
};

/** Califica a la contraparte de un intercambio completado. La RLS valida elegibilidad; el trigger recalcula su score. */
export const submitRating = async (input: SubmitRatingInput): Promise<ActionResult> => {
  const parsed = submitRatingSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Datos inválidos", code: "VALIDATION_ERROR", details: parsed.error.flatten() };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return { error: "No autenticado", code: "UNAUTHENTICATED" };

  const { requestId, stars, comment } = parsed.data;

  const { data: row } = await supabase
    .from("exchange_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle<ExchangeRequest>();
  if (!row) return { error: "Solicitud no encontrada", code: "NOT_FOUND" };
  if (row.status !== "completed") {
    return { error: "Solo puedes calificar intercambios completados", code: "INVALID_STATE" };
  }

  const rateeId = row.requester_id === user.id ? row.recipient_id : row.requester_id;
  if (rateeId === user.id) {
    return { error: "No eres parte de este intercambio", code: "FORBIDDEN" };
  }

  const { error: insertError } = await supabase.from("ratings").insert({
    exchange_request_id: requestId,
    rater_id: user.id,
    ratee_id: rateeId,
    stars,
    comment: comment || null,
  });
  if (insertError) {
    if (insertError.code === "23505") {
      return { error: "Ya calificaste este intercambio", code: "DUPLICATE" };
    }
    console.error("submitRating insert error:", insertError);
    return { error: "No pudimos guardar tu calificación", code: "DB_ERROR" };
  }

  await notify({
    userId: rateeId,
    type: "rating_received",
    title: "Recibiste una calificación",
    body: `Te dieron ${stars} ${stars === 1 ? "estrella" : "estrellas"}.`,
    link: "/intercambios",
  });

  revalidatePath("/intercambios");
  return {};
};

/** Inicia (o reanuda) el pago de la comisión del usuario para un intercambio aceptado. */
export const startCommissionPayment = async (
  input: StartCommissionPaymentInput
): Promise<ActionResult & { qrPayload?: string; chargeId?: string }> => {
  const parsed = startCommissionPaymentSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Datos inválidos", code: "VALIDATION_ERROR", details: parsed.error.flatten() };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return { error: "No autenticado", code: "UNAUTHENTICATED" };

  const { exchangeRequestId } = parsed.data;

  // El intercambio debe existir, el usuario ser parte y estar aceptado.
  const { data: exchange } = await supabase
    .from("exchange_requests")
    .select("*")
    .eq("id", exchangeRequestId)
    .maybeSingle<ExchangeRequest>();
  if (!exchange) return { error: "Solicitud no encontrada", code: "NOT_FOUND" };
  if (![exchange.requester_id, exchange.recipient_id].includes(user.id)) {
    return { error: "No eres parte de este intercambio", code: "FORBIDDEN" };
  }
  if (exchange.status !== "accepted") {
    return { error: "El intercambio aún no está aceptado", code: "NOT_ACCEPTED" };
  }

  // Buscar el pago propio (lo crea respondToRequest; si faltara, se crea aquí).
  let { data: payment } = await supabase
    .from("commission_payments")
    .select("*")
    .eq("exchange_request_id", exchangeRequestId)
    .eq("payer_id", user.id)
    .maybeSingle<CommissionPayment>();

  if (payment?.status === "paid") {
    return { error: "Ya pagaste esta comisión", code: "ALREADY_PAID" };
  }

  const provider = getPaymentProvider();

  if (!payment) {
    const { data: created, error: insertError } = await supabase
      .from("commission_payments")
      .insert({ exchange_request_id: exchangeRequestId, payer_id: user.id, amount_bs: COMMISSION_AMOUNT_BS, provider: provider.name })
      .select("*")
      .single<CommissionPayment>();
    if (insertError || !created) {
      console.error("startCommissionPayment insert error:", insertError);
      return { error: "No pudimos iniciar el pago", code: "DB_ERROR" };
    }
    payment = created;
  }

  // Reusar el cargo si ya existe; si no, crearlo con el proveedor.
  if (payment.provider_ref && payment.qr_payload) {
    return { qrPayload: payment.qr_payload, chargeId: payment.provider_ref };
  }

  let charge;
  try {
    charge = await provider.createCharge({ amountBs: payment.amount_bs, reference: payment.id });
  } catch (err) {
    console.error("startCommissionPayment createCharge error:", err);
    return { error: "No pudimos generar el cobro", code: "PAYMENT_PROVIDER_ERROR" };
  }

  const { error: chargeError } = await supabase
    .from("commission_payments")
    .update({ provider_ref: charge.chargeId, qr_payload: charge.qrPayload })
    .eq("id", payment.id)
    .eq("payer_id", user.id);
  if (chargeError) {
    console.error("startCommissionPayment charge update error:", chargeError);
    return { error: "No pudimos generar el cobro", code: "PAYMENT_PROVIDER_ERROR" };
  }

  return { qrPayload: charge.qrPayload, chargeId: charge.chargeId };
};

/** Confirma (simula) el pago de la comisión del usuario. En producción esto lo hará el webhook del PSP. */
export const confirmMockPayment = async (
  input: ConfirmMockPaymentInput
): Promise<ActionResult> => {
  const parsed = confirmMockPaymentSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Datos inválidos", code: "VALIDATION_ERROR", details: parsed.error.flatten() };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return { error: "No autenticado", code: "UNAUTHENTICATED" };

  const { chargeId } = parsed.data;

  const { data: payment } = await supabase
    .from("commission_payments")
    .select("*")
    .eq("provider_ref", chargeId)
    .eq("payer_id", user.id)
    .maybeSingle<CommissionPayment>();
  if (!payment) return { error: "Cobro no encontrado", code: "NOT_FOUND" };
  if (payment.status === "paid") return {};

  const { error: updateError } = await supabase
    .from("commission_payments")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", payment.id)
    .eq("payer_id", user.id);
  if (updateError) {
    console.error("confirmMockPayment update error:", updateError);
    return { error: "No pudimos confirmar el pago", code: "DB_ERROR" };
  }

  const { data: exch } = await supabase
    .from("exchange_requests")
    .select("requester_id, recipient_id")
    .eq("id", payment.exchange_request_id)
    .maybeSingle<{ requester_id: string; recipient_id: string }>();
  if (exch) {
    const other = exch.requester_id === user.id ? exch.recipient_id : exch.requester_id;
    const who = await actorName(supabase, user.id);
    await notify({
      userId: other,
      type: "commission_paid",
      title: "Comisión pagada",
      body: `${who} pagó su comisión. Paga la tuya para concretar el intercambio.`,
      link: "/intercambios",
    });
  }

  revalidatePath("/intercambios");
  return {};
};

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPaymentProvider } from "@/lib/payments";

/**
 * Webhook del PSP: el proveedor real notifica aquí el resultado del cobro.
 * Para el proveedor mock, la confirmación se hace vía confirmMockPayment (server action),
 * así que este endpoint queda listo pero no se usa hasta conectar un PSP real.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido", code: "INVALID_BODY" }, { status: 400 });
  }

  const provider = getPaymentProvider();
  const parsed = provider.parseWebhook(body);
  if (!parsed) {
    return NextResponse.json({ error: "Webhook inválido", code: "INVALID_WEBHOOK" }, { status: 400 });
  }

  const update: { status: typeof parsed.status; paid_at?: string } = { status: parsed.status };
  if (parsed.status === "paid") {
    update.paid_at = new Date().toISOString();
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("commission_payments")
    .update(update)
    .eq("provider_ref", parsed.chargeId);
  if (error) {
    console.error("payments webhook update error:", error);
    return NextResponse.json({ error: "Error interno", code: "INTERNAL_ERROR" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

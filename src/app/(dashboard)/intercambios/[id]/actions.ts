"use server";

import { createClient } from "@/lib/supabase/server";
import { validateMessage, validateExchangeId } from "@/lib/chat/schema";
import { validateMilestoneTitle, validateNoteContent } from "@/lib/workspace/schema";

/** Inserta un mensaje en el chat de un intercambio. */
export async function sendMessage({
  exchangeId,
  content,
}: {
  exchangeId: string;
  content: string;
}): Promise<{ error?: string }> {
  const idResult = validateExchangeId(exchangeId);
  if (!idResult.ok) return { error: idResult.error };

  const msgResult = validateMessage(content);
  if (!msgResult.ok) return { error: msgResult.error };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado." };

  const { error } = await supabase.from("messages").insert({
    exchange_request_id: exchangeId,
    sender_id: user.id,
    content: msgResult.value,
  });

  if (error) return { error: "No se pudo enviar el mensaje." };
  return {};
}

/** Marca como leídos los mensajes de la contraparte en un intercambio. */
export async function markMessagesAsRead(exchangeId: string): Promise<void> {
  const idResult = validateExchangeId(exchangeId);
  if (!idResult.ok) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("exchange_request_id", exchangeId)
    .neq("sender_id", user.id)
    .is("read_at", null);
}

/** Añade un hito al workspace del intercambio. */
export async function addMilestone({
  exchangeId,
  title,
}: {
  exchangeId: string;
  title: string;
}): Promise<{ error?: string }> {
  const idResult = validateExchangeId(exchangeId);
  if (!idResult.ok) return { error: idResult.error };

  const titleResult = validateMilestoneTitle(title);
  if (!titleResult.ok) return { error: titleResult.error };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado." };

  // Calcular la posición como max + 1
  const { data: last } = await supabase
    .from("exchange_milestones")
    .select("position")
    .eq("exchange_request_id", exchangeId)
    .order("position", { ascending: false })
    .limit(1)
    .returns<{ position: number }[]>();

  const position = (last?.[0]?.position ?? -1) + 1;

  const { error } = await supabase.from("exchange_milestones").insert({
    exchange_request_id: exchangeId,
    created_by: user.id,
    title: titleResult.value,
    position,
  });

  if (error) return { error: "No se pudo añadir el hito." };
  return {};
}

/** Alterna el estado completado/pendiente de un hito. */
export async function toggleMilestone({
  milestoneId,
  exchangeId,
}: {
  milestoneId: string;
  exchangeId: string;
}): Promise<{ error?: string }> {
  const idResult = validateExchangeId(exchangeId);
  if (!idResult.ok) return { error: idResult.error };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado." };

  const { data: current } = await supabase
    .from("exchange_milestones")
    .select("completed")
    .eq("id", milestoneId)
    .eq("exchange_request_id", exchangeId)
    .single<{ completed: boolean }>();

  if (!current) return { error: "Hito no encontrado." };

  const nowCompleted = !current.completed;
  const { error } = await supabase
    .from("exchange_milestones")
    .update({
      completed: nowCompleted,
      completed_by: nowCompleted ? user.id : null,
      completed_at: nowCompleted ? new Date().toISOString() : null,
    })
    .eq("id", milestoneId)
    .eq("exchange_request_id", exchangeId);

  if (error) return { error: "No se pudo actualizar el hito." };
  return {};
}

/** Elimina un hito (solo el creador puede eliminarlo). */
export async function deleteMilestone({
  milestoneId,
  exchangeId,
}: {
  milestoneId: string;
  exchangeId: string;
}): Promise<{ error?: string }> {
  const idResult = validateExchangeId(exchangeId);
  if (!idResult.ok) return { error: idResult.error };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado." };

  const { error } = await supabase
    .from("exchange_milestones")
    .delete()
    .eq("id", milestoneId)
    .eq("exchange_request_id", exchangeId)
    .eq("created_by", user.id);

  if (error) return { error: "No se pudo eliminar el hito." };
  return {};
}

/** Guarda (upsert) la nota compartida del intercambio. */
export async function saveNote({
  exchangeId,
  content,
}: {
  exchangeId: string;
  content: string;
}): Promise<{ error?: string }> {
  const idResult = validateExchangeId(exchangeId);
  if (!idResult.ok) return { error: idResult.error };

  const contentResult = validateNoteContent(content);
  if (!contentResult.ok) return { error: contentResult.error };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado." };

  const { error } = await supabase
    .from("exchange_notes")
    .upsert(
      {
        exchange_request_id: exchangeId,
        content: contentResult.value,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "exchange_request_id" }
    );

  if (error) return { error: "No se pudo guardar la nota." };
  return {};
}

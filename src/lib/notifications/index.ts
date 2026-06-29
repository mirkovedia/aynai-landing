import { createClient } from "@/lib/supabase/server";
import { sendNotificationEmail } from "./email";
import type { NotificationType } from "@/types/database";

export interface NotifyParams {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
}

/**
 * Crea la notificación in-app (siempre) y dispara el email (best-effort).
 * Nunca lanza: una falla de notificación no debe romper la acción que la origina.
 */
export const notify = async ({ userId, type, title, body, link }: NotifyParams): Promise<void> => {
  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("create_notification", {
      p_user_id: userId,
      p_type: type,
      p_title: title,
      p_body: body ?? null,
      p_link: link ?? null,
    });
    if (error) {
      console.error("notify rpc error:", error);
      return;
    }

    // Email best-effort: buscar el correo del destinatario.
    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .maybeSingle<{ email: string | null }>();
    if (profile?.email) {
      await sendNotificationEmail(profile.email, type, title, body ?? null, link ?? null);
    }
  } catch (err) {
    console.error("notify error:", err);
  }
};

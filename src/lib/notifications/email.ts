import { Resend } from "resend";
import type { NotificationType } from "@/types/database";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://aynai-app.vercel.app";

/** Construye el email (asunto + HTML) de una notificación. Función pura. */
export const buildNotificationEmail = (
  _type: NotificationType,
  title: string,
  body: string | null,
  link: string | null
): { subject: string; html: string } => {
  const url = link ? `${APP_URL}${link}` : APP_URL;
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <h1 style="color:#3d2b1f;font-size:20px">${title}</h1>
      ${body ? `<p style="color:#5c4a3a;font-size:15px;line-height:1.5">${body}</p>` : ""}
      <a href="${url}" style="display:inline-block;margin-top:16px;background:#3d2b1f;color:#f5efe6;padding:10px 20px;border-radius:9999px;text-decoration:none;font-weight:600">Ver en AynAI</a>
    </div>`;
  return { subject: `AynAI · ${title}`, html };
};

/** Envía el email best-effort. Sin RESEND_API_KEY, no-op silencioso. Nunca lanza. */
export const sendNotificationEmail = async (
  to: string,
  type: NotificationType,
  title: string,
  body: string | null,
  link: string | null
): Promise<void> => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !to) return;
  try {
    const resend = new Resend(apiKey);
    const { subject, html } = buildNotificationEmail(type, title, body, link);
    await resend.emails.send({
      from: process.env.RESEND_FROM ?? "AynAI <onboarding@resend.dev>",
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error("sendNotificationEmail error:", err);
  }
};

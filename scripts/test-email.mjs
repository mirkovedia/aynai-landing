// Test manual: envía un email de notificación real vía Resend a un destinatario.
// Usa la MISMA plantilla que src/lib/notifications/email.ts para ser fiel al sistema.
// Uso: node scripts/test-email.mjs destinatario@correo.com
import { readFileSync } from "node:fs";
import { Resend } from "resend";

// Cargar variables desde .env.local (Node plano no las lee solo).
const env = {};
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^"|"$/g, "");
}

const APP_URL = env.NEXT_PUBLIC_APP_URL ?? "https://aynai-app.vercel.app";

// Espejo exacto de buildNotificationEmail() del proyecto.
const buildNotificationEmail = (title, body, link) => {
  const url = link ? `${APP_URL}${link}` : APP_URL;
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <h1 style="color:#3d2b1f;font-size:20px">${title}</h1>
      ${body ? `<p style="color:#5c4a3a;font-size:15px;line-height:1.5">${body}</p>` : ""}
      <a href="${url}" style="display:inline-block;margin-top:16px;background:#3d2b1f;color:#f5efe6;padding:10px 20px;border-radius:9999px;text-decoration:none;font-weight:600">Ver en AynAI</a>
    </div>`;
  return { subject: `AynAI · ${title}`, html };
};

const to = process.argv[2] || "baronvedia@gmail.com";
const { subject, html } = buildNotificationEmail(
  "Nueva solicitud de intercambio",
  "María Quispe quiere conectar contigo: ofrece Diseño UI por Inglés.",
  "/intercambios"
);

const resend = new Resend(env.RESEND_API_KEY);
const result = await resend.emails.send({
  from: env.RESEND_FROM ?? "AynAI <onboarding@resend.dev>",
  to,
  subject,
  html,
});

console.log("Destinatario:", to);
console.log("Remitente:", env.RESEND_FROM ?? "AynAI <onboarding@resend.dev>");
console.log("Resultado:", JSON.stringify(result, null, 2));

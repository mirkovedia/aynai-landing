// Test E2E del ciclo de confianza contra la base real (RLS + triggers + RPC).
// Crea 2 usuarios reales por signup y recorre: solicitud → aceptar → confirmar
// mutuo (trigger completed) → calificar (trigger score) → notificaciones (RPC).
// Uso: node scripts/test-e2e-flujo.mjs
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = {};
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^"|"$/g, "");
}
const URL_SB = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const pass = (m) => console.log(`  ✅ ${m}`);
const fail = (m) => { console.log(`  ❌ ${m}`); process.exitCode = 1; };
const stamp = Date.now();

const mkClient = () => createClient(URL_SB, ANON, { auth: { persistSession: false, autoRefreshToken: false } });

async function signUp(label) {
  const c = mkClient();
  const email = `e2e_${label}_${stamp}@aynai.dev`;
  const password = `Test-${stamp}-${label}!`;
  const { data, error } = await c.auth.signUp({ email, password });
  if (error) { fail(`signUp ${label}: ${error.message}`); return null; }
  if (!data.session) { fail(`signUp ${label}: sin sesión (¿email confirmation ON?)`); return null; }
  pass(`signUp ${label} con sesión (${email})`);
  return { c, id: data.user.id, email };
}

console.log("\n=== 1. Crear 2 usuarios reales ===");
const A = await signUp("A");
const B = await signUp("B");
if (!A || !B) { console.log("\n⛔ No se pudo crear sesiones; aborta el resto del flujo DB."); process.exit(); }

console.log("\n=== 2. Verificar perfiles auto-creados (trigger de signup) ===");
for (const [label, u] of [["A", A], ["B", B]]) {
  const { data } = await u.c.from("profiles").select("id, ayni_score").eq("id", u.id).maybeSingle();
  if (data) pass(`perfil ${label} existe, score inicial = ${data.ayni_score}`);
  else fail(`perfil ${label} NO se creó automáticamente`);
}

console.log("\n=== 3. A crea solicitud de intercambio a B ===");
const { data: reqRow, error: reqErr } = await A.c.from("exchange_requests").insert({
  requester_id: A.id, recipient_id: B.id, offer_skill: "React", want_skill: "Diseño",
}).select("*").single();
if (reqErr) { fail(`crear solicitud: ${reqErr.message}`); process.exit(); }
pass(`solicitud creada (status=${reqRow.status})`);
const reqId = reqRow.id;

console.log("\n=== 4. B acepta la solicitud ===");
const { error: accErr } = await B.c.from("exchange_requests")
  .update({ status: "accepted" }).eq("id", reqId);
accErr ? fail(`aceptar: ${accErr.message}`) : pass("B aceptó (status=accepted)");

console.log("\n=== 5. Confirmación mutua → trigger debe marcar 'completed' ===");
await A.c.from("exchange_requests").update({ requester_confirmed: true }).eq("id", reqId);
const { data: mid } = await A.c.from("exchange_requests").select("status").eq("id", reqId).single();
mid.status === "accepted" ? pass("tras 1 confirmación sigue 'accepted' (correcto)") : fail(`esperaba accepted, vino ${mid.status}`);
await B.c.from("exchange_requests").update({ recipient_confirmed: true }).eq("id", reqId);
const { data: done } = await B.c.from("exchange_requests").select("status, completed_at").eq("id", reqId).single();
if (done.status === "completed" && done.completed_at) pass(`trigger OK: status=completed, completed_at=${done.completed_at}`);
else fail(`trigger de completado FALLÓ: status=${done.status}, completed_at=${done.completed_at}`);

console.log("\n=== 6. A califica a B → trigger debe recalcular el score de B ===");
const { data: bBefore } = await A.c.from("profiles").select("ayni_score").eq("id", B.id).single();
const { error: ratErr } = await A.c.from("ratings").insert({
  exchange_request_id: reqId, rater_id: A.id, ratee_id: B.id, stars: 5, comment: "Excelente, test E2E",
});
if (ratErr) fail(`insertar rating: ${ratErr.message}`);
else pass("rating insertado (RLS lo permitió: intercambio completado y soy parte)");
const { data: bAfter } = await A.c.from("profiles").select("ayni_score").eq("id", B.id).single();
if (bAfter && bAfter.ayni_score !== bBefore.ayni_score) pass(`score de B recalculado: ${bBefore.ayni_score} → ${bAfter.ayni_score}`);
else fail(`score de B NO cambió (sigue ${bAfter?.ayni_score}) — ¿trigger de score?`);

console.log("\n=== 7. RLS negativa: B NO debe poder calificar dos veces ni a sí mismo ===");
const { error: selfErr } = await B.c.from("ratings").insert({
  exchange_request_id: reqId, rater_id: B.id, ratee_id: B.id, stars: 1,
});
selfErr ? pass("RLS bloqueó auto-calificación (esperado)") : fail("RLS NO bloqueó auto-calificación");

console.log("\n=== 8. RPC create_notification + RLS de notifications ===");
const { error: notifErr } = await A.c.rpc("create_notification", {
  p_user_id: B.id, p_type: "rating_received", p_title: "Recibiste una calificación",
  p_body: "Te dieron 5 estrellas.", p_link: "/intercambios",
});
notifErr ? fail(`RPC create_notification: ${notifErr.message}`) : pass("RPC create_notification ejecutó");
const { data: bNotifs } = await B.c.from("notifications").select("*").eq("user_id", B.id);
(bNotifs && bNotifs.length > 0) ? pass(`B ve ${bNotifs.length} notificación(es) propias`) : fail("B no ve sus notificaciones");
const { data: aSeesB } = await A.c.from("notifications").select("*").eq("user_id", B.id);
(aSeesB && aSeesB.length === 0) ? pass("RLS OK: A NO ve las notificaciones de B") : fail(`RLS FALLÓ: A ve ${aSeesB?.length} notifs de B`);

console.log("\n=== Resumen ===");
console.log(process.exitCode ? "⛔ Hubo fallos (ver ❌ arriba)" : "✅ Flujo E2E completo sin fallos");

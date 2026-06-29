import { createClient } from "@/lib/supabase/server";
import { PaymentActions } from "./PaymentActions";
import type { Profile, ExchangeRequest, CommissionPayment } from "@/types/database";

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("es-BO", { dateStyle: "short", timeStyle: "short" }) : "—";

const statusBadge: Record<string, string> = {
  pending:   "bg-yellow-100 text-yellow-800",
  accepted:  "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  rejected:  "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-600",
  paid:      "bg-green-100 text-green-800",
  failed:    "bg-red-100 text-red-800",
};

export default async function AdminPage() {
  const supabase = await createClient();

  const [
    { data: profiles, count: totalUsers },
    { data: exchanges, count: totalExchanges },
    { data: payments },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact" }).order("created_at", { ascending: false }).returns<Profile[]>(),
    supabase.from("exchange_requests").select("*", { count: "exact" }).order("created_at", { ascending: false }).returns<ExchangeRequest[]>(),
    supabase.from("commission_payments").select("*").order("created_at", { ascending: false }).returns<CommissionPayment[]>(),
  ]);

  const paymentList = payments ?? [];
  const exchangeList = exchanges ?? [];
  const profileList = profiles ?? [];

  const totalPaidBs = paymentList.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount_bs, 0);
  const completedCount = exchangeList.filter((e) => e.status === "completed").length;
  const pendingPayments = paymentList.filter((p) => p.status === "pending").length;

  // Mapas para cruzar datos
  const profileById = new Map(profileList.map((p) => [p.id, p]));
  const exchangeById = new Map(exchangeList.map((e) => [e.id, e]));

  const name = (id: string) => {
    const p = profileById.get(id);
    return p?.full_name?.trim() || p?.email || id.slice(0, 8);
  };

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Panel de administración</h1>
        <p className="mt-1 text-sm text-gray-500">Trazabilidad completa de intercambios y pagos</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Usuarios", value: totalUsers ?? 0, color: "text-blue-600" },
          { label: "Intercambios", value: totalExchanges ?? 0, color: "text-purple-600" },
          { label: "Completados", value: completedCount, color: "text-green-600" },
          { label: "Bs recaudados", value: `Bs ${totalPaidBs}`, color: "text-cocoa" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-gray-200 bg-white p-5">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className={`mt-1 text-3xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Pagos de comisión */}
      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Pagos de comisión
            {pendingPayments > 0 && (
              <span className="ml-2 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-bold text-yellow-800">
                {pendingPayments} pendientes
              </span>
            )}
          </h2>
        </div>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-gray-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">Pagador</th>
                <th className="px-4 py-3 text-left">Intercambio</th>
                <th className="px-4 py-3 text-left">Monto</th>
                <th className="px-4 py-3 text-left">Estado</th>
                <th className="px-4 py-3 text-left">Pagado el</th>
                <th className="px-4 py-3 text-left">Creado</th>
                <th className="px-4 py-3 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paymentList.map((p) => {
                const exch = exchangeById.get(p.exchange_request_id);
                return (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{name(p.payer_id)}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {exch ? `${exch.offer_skill} ↔ ${exch.want_skill}` : p.exchange_request_id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900">Bs {p.amount_bs}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadge[p.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{fmt(p.paid_at)}</td>
                    <td className="px-4 py-3 text-gray-500">{fmt(p.created_at)}</td>
                    <td className="px-4 py-3">
                      <PaymentActions paymentId={p.id} status={p.status} />
                    </td>
                  </tr>
                );
              })}
              {paymentList.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Sin pagos aún</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Intercambios */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900">Todos los intercambios</h2>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-gray-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">Solicitante</th>
                <th className="px-4 py-3 text-left">Destinatario</th>
                <th className="px-4 py-3 text-left">Ofrece</th>
                <th className="px-4 py-3 text-left">Busca</th>
                <th className="px-4 py-3 text-left">Estado</th>
                <th className="px-4 py-3 text-left">Creado</th>
                <th className="px-4 py-3 text-left">Completado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {exchangeList.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{name(e.requester_id)}</td>
                  <td className="px-4 py-3 text-gray-700">{name(e.recipient_id)}</td>
                  <td className="px-4 py-3 text-green-700 font-medium">{e.offer_skill}</td>
                  <td className="px-4 py-3 text-blue-700 font-medium">{e.want_skill}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadge[e.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {e.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{fmt(e.created_at)}</td>
                  <td className="px-4 py-3 text-gray-500">{fmt(e.completed_at)}</td>
                </tr>
              ))}
              {exchangeList.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Sin intercambios aún</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Usuarios */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900">Usuarios registrados</h2>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-gray-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">Nombre</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Username</th>
                <th className="px-4 py-3 text-left">AynAI Score</th>
                <th className="px-4 py-3 text-left">Disponibilidad</th>
                <th className="px-4 py-3 text-left">Registrado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {profileList.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{p.full_name || "—"}</td>
                  <td className="px-4 py-3 text-gray-500">{p.email}</td>
                  <td className="px-4 py-3 text-gray-500">{p.username ? `@${p.username}` : "—"}</td>
                  <td className="px-4 py-3">
                    <span className="font-bold text-cocoa">{p.ayni_score}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      p.availability === "available" ? "bg-green-100 text-green-700" :
                      p.availability === "busy" ? "bg-yellow-100 text-yellow-700" :
                      "bg-gray-100 text-gray-500"
                    }`}>
                      {p.availability}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{fmt(p.created_at)}</td>
                </tr>
              ))}
              {profileList.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Sin usuarios aún</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

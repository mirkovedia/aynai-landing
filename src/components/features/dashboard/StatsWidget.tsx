interface Stat {
  label: string;
  value: number;
  icon: string;
}

interface Props {
  completed: number;
  sent: number;
  received: number;
  score: number;
}

/** Widget de estadísticas personales del dashboard. */
export const StatsWidget = ({ completed, sent, received, score }: Props) => {
  const stats: Stat[] = [
    { label: "Completados", value: completed, icon: "✅" },
    { label: "Enviados", value: sent, icon: "📤" },
    { label: "Recibidos", value: received, icon: "📥" },
    { label: "AYNAI Score", value: score, icon: "⭐" },
  ];

  return (
    <div className="rounded-3xl border border-cream-300 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-cocoa/60">Tus números</h2>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl bg-cream px-4 py-3">
            <p className="text-xl">{s.icon}</p>
            <p className="mt-1 font-serif text-2xl font-bold text-cocoa">{s.value}</p>
            <p className="text-xs text-cocoa/50">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

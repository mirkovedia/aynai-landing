import type { ScoreResult } from "@/lib/scoring/compute";

interface ScoreWidgetProps {
  score: ScoreResult;
  storedScore: number;
}

/** Widget AYNAI Score: muestra el score almacenado con su desglose por factores. */
export const ScoreWidget = ({ score, storedScore }: ScoreWidgetProps) => {
  const display = storedScore > 0 ? storedScore : score.total;
  const pct = Math.min((display / 1000) * 100, 100);

  return (
    <div className="rounded-3xl border border-cream-300 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-cocoa/60">Tu AYNAI Score</p>
      <p className="mt-1 font-serif text-5xl font-bold text-green">{display}</p>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-cream-200">
        <div
          className="tricolor-bar h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-cocoa/60">
        <div className="flex justify-between">
          <dt>Reputación</dt>
          <dd className="font-semibold text-cocoa">+{score.factors.reputation}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Intercambios</dt>
          <dd className="font-semibold text-cocoa">+{score.factors.volume}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Cumplimiento</dt>
          <dd className="font-semibold text-cocoa">+{score.factors.reliability}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Perfil</dt>
          <dd className="font-semibold text-cocoa">+{score.factors.profile}</dd>
        </div>
      </dl>
      <a
        href="/perfil"
        className="mt-4 inline-block text-xs font-semibold text-red hover:underline"
      >
        Ver mi perfil →
      </a>
    </div>
  );
};

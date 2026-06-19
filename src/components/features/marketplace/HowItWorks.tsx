interface HowItWorksProps {
  amountBs: number;
}

const steps = [
  { n: 1, title: "Explora", desc: "Mira a todas las personas y sus habilidades." },
  { n: 2, title: "Propón un Ayni", desc: "Elige qué ofreces y qué quieres de alguien." },
  { n: 3, title: "Acepta", desc: "Si la otra parte acepta, se concreta la conexión." },
];

/** Explica el flujo del marketplace y la comisión por conexión. */
export const HowItWorks = ({ amountBs }: HowItWorksProps) => (
  <section className="rounded-3xl border border-cream-300 bg-white p-6 shadow-sm">
    <h2 className="font-serif text-xl font-bold text-cocoa">Cómo funciona</h2>
    <ol className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {steps.map((s) => (
        <li key={s.n} className="flex gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cocoa text-sm font-bold text-cream">
            {s.n}
          </span>
          <div>
            <p className="text-sm font-semibold text-cocoa">{s.title}</p>
            <p className="text-xs text-cocoa/60">{s.desc}</p>
          </div>
        </li>
      ))}
      <li className="flex gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red text-sm font-bold text-cream">
          4
        </span>
        <div>
          <p className="text-sm font-semibold text-cocoa">Paga y conecta</p>
          <p className="text-xs text-cocoa/60">
            Ambas partes pagan Bs {amountBs} y se revela el contacto para coordinar.
          </p>
        </div>
      </li>
    </ol>
  </section>
);

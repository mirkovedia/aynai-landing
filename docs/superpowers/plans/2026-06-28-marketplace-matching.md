# Marketplace MVP con Matching Bilateral — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar el marketplace de feed genérico a matching bilateral real: feed dividido en "Matches para vos" (perfectos + parciales) y "Otras personas", dashboard con 3 widgets accionables, y WhatsApp como contacto principal post-pago.

**Architecture:** La lógica de matching vive en `lib/marketplace/matching.ts` como función pura (`classifyMatches`) + wrapper async (`getMatchedFeed`). El dashboard pasa de pantalla de datos a hub con 3 widgets (matches preview, intercambios activos, score). El marketplace usa las dos secciones con badges visuales. WhatsApp se almacena en `links.whatsapp` (JSONB existente), sin migración nueva.

**Tech Stack:** Next.js 14 App Router, Supabase, TypeScript strict, Tailwind CSS, Framer Motion, Vitest, Zod.

## Global Constraints

- TypeScript strict — never `any`, usar `unknown` + type guards
- Named exports en todos los componentes
- Server Components por defecto; `"use client"` solo cuando hay hooks/eventos
- Tailwind solamente — sin CSS modules ni inline styles nuevos
- Tests con Vitest — `npx vitest run` para correr
- Commits en español con prefijo convencional (`feat:`, `fix:`, etc.)
- `COMMISSION_AMOUNT_BS` de `@/lib/payments/constants` — nunca hardcodear el monto

---

## Mapa de archivos

| Archivo | Acción | Responsabilidad |
|---------|--------|-----------------|
| `src/lib/marketplace/matching.ts` | CREAR | Lógica pura de clasificación bilateral |
| `src/lib/marketplace/matching.test.ts` | CREAR | Tests de classifyMatches |
| `src/types/database.ts` | MODIFICAR | Agregar `whatsapp` a ProfileLinks |
| `src/lib/profile/schema.ts` | MODIFICAR | Agregar validación de whatsapp en links |
| `src/components/features/profile/ProfileForm.tsx` | MODIFICAR | Campo WhatsApp en el formulario |
| `src/components/features/dashboard/ScoreWidget.tsx` | CREAR | Widget AynAI Score |
| `src/components/features/dashboard/ActiveExchanges.tsx` | CREAR | Widget intercambios activos |
| `src/components/features/dashboard/MatchesPreview.tsx` | CREAR | Widget top 3 matches |
| `src/app/(dashboard)/dashboard/page.tsx` | MODIFICAR | Layout 3 widgets + data fetching |
| `src/components/features/marketplace/MatchCard.tsx` | CREAR | Tarjeta con badge de match |
| `src/components/features/marketplace/MatchSection.tsx` | CREAR | Sección "Matches para vos" |
| `src/app/(dashboard)/marketplace/page.tsx` | MODIFICAR | Dos secciones con matching |
| `src/components/features/marketplace/ExchangeRequestCard.tsx` | MODIFICAR | Revelar WhatsApp post-pago |

---

## Task 1: Algoritmo de matching — función pura + tests

**Files:**
- Create: `src/lib/marketplace/matching.ts`
- Create: `src/lib/marketplace/matching.test.ts`

**Interfaces:**
- Consumes: `SearchResult` de `@/lib/marketplace/search`, `listProfiles` de `@/lib/marketplace/search`
- Produces:
  ```typescript
  export interface MatchedFeed {
    perfect: SearchResult[];
    partial: SearchResult[];
    rest: SearchResult[];
  }
  export const classifyMatches: (results: SearchResult[], myOffers: string[], mySeeks: string[]) => MatchedFeed
  export const getMatchedFeed: (myOffers: string[], mySeeks: string[], excludeUserId: string) => Promise<MatchedFeed>
  ```

- [ ] **Step 1: Escribir el test**

Crear `src/lib/marketplace/matching.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { classifyMatches } from "@/lib/marketplace/matching";
import type { SearchResult } from "@/lib/marketplace/search";
import type { PublicProfile } from "@/components/features/profile/ProfileCard";
import type { UserSkill } from "@/types/database";

const makeProfile = (id: string): PublicProfile => ({
  id,
  full_name: `Usuario ${id}`,
  ayni_score: 600,
  bio: null,
  skills: [],
  location: null,
  username: id,
  avatar_url: null,
  availability: "available",
  modality: null,
  links: {},
  created_at: new Date().toISOString(),
});

const makeSkill = (userId: string, name: string, kind: "offer" | "seek"): UserSkill => ({
  id: `${userId}-${name}-${kind}`,
  user_id: userId,
  name,
  kind,
  category: null,
  level: null,
  created_at: new Date().toISOString(),
});

const makeResult = (
  id: string,
  offers: string[],
  seeks: string[],
  score = 600
): SearchResult => ({
  profile: { ...makeProfile(id), ayni_score: score },
  skills: [
    ...offers.map((n) => makeSkill(id, n, "offer")),
    ...seeks.map((n) => makeSkill(id, n, "seek")),
  ],
});

describe("classifyMatches", () => {
  it("match perfecto cuando hay cruce bilateral", () => {
    // Yo ofrezco "Desarrollo web" y busco "Diseño UX"
    // María ofrece "Diseño UX" y busca "Desarrollo web"
    const maria = makeResult("maria", ["Diseño UX"], ["Desarrollo web"]);
    const { perfect, partial, rest } = classifyMatches([maria], ["Desarrollo web"], ["Diseño UX"]);
    expect(perfect).toHaveLength(1);
    expect(perfect[0].profile.id).toBe("maria");
    expect(partial).toHaveLength(0);
    expect(rest).toHaveLength(0);
  });

  it("match parcial cuando ellos ofrecen lo que yo busco pero no me buscan", () => {
    // Yo busco "Fotografía"; Juan ofrece "Fotografía" pero busca "Marketing" (no lo que yo ofrezco)
    const juan = makeResult("juan", ["Fotografía"], ["Marketing"]);
    const { perfect, partial, rest } = classifyMatches([juan], ["Desarrollo web"], ["Fotografía"]);
    expect(perfect).toHaveLength(0);
    expect(partial).toHaveLength(1);
    expect(partial[0].profile.id).toBe("juan");
    expect(rest).toHaveLength(0);
  });

  it("resto cuando no hay overlap de ningún tipo", () => {
    const ana = makeResult("ana", ["Contabilidad"], ["Legal"]);
    const { perfect, partial, rest } = classifyMatches([ana], ["Desarrollo web"], ["Diseño UX"]);
    expect(perfect).toHaveLength(0);
    expect(partial).toHaveLength(0);
    expect(rest).toHaveLength(1);
  });

  it("comparación case-insensitive y trim", () => {
    const carlos = makeResult("carlos", ["  Diseño UX  "], ["Desarrollo Web"]);
    const { perfect } = classifyMatches([carlos], ["desarrollo web"], ["diseño ux"]);
    expect(perfect).toHaveLength(1);
  });

  it("sin mySeeks → nadie es match (parcial ni perfecto)", () => {
    const maria = makeResult("maria", ["Diseño UX"], ["Desarrollo web"]);
    const { perfect, partial, rest } = classifyMatches([maria], ["Desarrollo web"], []);
    expect(perfect).toHaveLength(0);
    expect(partial).toHaveLength(0);
    expect(rest).toHaveLength(1);
  });

  it("sin myOffers → puede haber parcial pero nunca perfecto", () => {
    const maria = makeResult("maria", ["Diseño UX"], []);
    const { perfect, partial } = classifyMatches([maria], [], ["Diseño UX"]);
    expect(perfect).toHaveLength(0);
    expect(partial).toHaveLength(1);
  });

  it("ordena cada bucket por ayni_score descendente", () => {
    const bajo = makeResult("bajo", [], [], 400);
    const alto = makeResult("alto", [], [], 800);
    const { rest } = classifyMatches([bajo, alto], ["X"], ["Y"]);
    expect(rest[0].profile.ayni_score).toBe(800);
    expect(rest[1].profile.ayni_score).toBe(400);
  });

  it("lista vacía devuelve tres buckets vacíos", () => {
    const { perfect, partial, rest } = classifyMatches([], ["X"], ["Y"]);
    expect(perfect).toHaveLength(0);
    expect(partial).toHaveLength(0);
    expect(rest).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Correr el test para verificar que falla**

```bash
npx vitest run src/lib/marketplace/matching.test.ts
```
Esperado: FAIL con "Cannot find module '@/lib/marketplace/matching'"

- [ ] **Step 3: Implementar matching.ts**

Crear `src/lib/marketplace/matching.ts`:

```typescript
import { listProfiles } from "@/lib/marketplace/search";
import type { SearchResult } from "@/lib/marketplace/search";

export interface MatchedFeed {
  perfect: SearchResult[];
  partial: SearchResult[];
  rest: SearchResult[];
}

const normalize = (s: string) => s.toLowerCase().trim();

/**
 * Clasifica resultados en tres buckets según complementariedad bilateral.
 * perfectMatch: ellos ofrecen lo que yo busco Y buscan lo que yo ofrezco.
 * partialMatch: ellos ofrecen lo que yo busco (sin reciprocidad).
 * rest: sin overlap.
 * Cada bucket queda ordenado por ayni_score DESC.
 */
export const classifyMatches = (
  results: SearchResult[],
  myOffers: string[],
  mySeeks: string[]
): MatchedFeed => {
  const myOffersN = myOffers.map(normalize);
  const mySeeksN = mySeeks.map(normalize);

  const perfect: SearchResult[] = [];
  const partial: SearchResult[] = [];
  const rest: SearchResult[] = [];

  for (const result of results) {
    const theirOffers = result.skills
      .filter((s) => s.kind === "offer")
      .map((s) => normalize(s.name));
    const theirSeeks = result.skills
      .filter((s) => s.kind === "seek")
      .map((s) => normalize(s.name));

    const offerOverlap = mySeeksN.length > 0 && theirOffers.some((o) => mySeeksN.includes(o));
    const seekOverlap = myOffersN.length > 0 && theirSeeks.some((s) => myOffersN.includes(s));

    if (offerOverlap && seekOverlap) {
      perfect.push(result);
    } else if (offerOverlap) {
      partial.push(result);
    } else {
      rest.push(result);
    }
  }

  const byScore = (a: SearchResult, b: SearchResult) =>
    b.profile.ayni_score - a.profile.ayni_score;

  return {
    perfect: perfect.sort(byScore),
    partial: partial.sort(byScore),
    rest: rest.sort(byScore),
  };
};

/**
 * Obtiene todos los perfiles (excepto el propio) y los clasifica por match.
 */
export const getMatchedFeed = async (
  myOffers: string[],
  mySeeks: string[],
  excludeUserId: string
): Promise<MatchedFeed> => {
  const all = await listProfiles({ excludeUserId });
  return classifyMatches(all, myOffers, mySeeks);
};
```

- [ ] **Step 4: Correr tests para verificar que pasan**

```bash
npx vitest run src/lib/marketplace/matching.test.ts
```
Esperado: 8 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/marketplace/matching.ts src/lib/marketplace/matching.test.ts
git commit -m "feat: algoritmo de matching bilateral con tests"
```

---

## Task 2: WhatsApp — tipos, schema y formulario de perfil

**Files:**
- Modify: `src/types/database.ts` (línea ~12 — interface ProfileLinks)
- Modify: `src/lib/profile/schema.ts` (línea ~18 — links object)
- Modify: `src/components/features/profile/ProfileForm.tsx`

**Interfaces:**
- Consumes: `ProfileLinks` de `@/types/database`
- Produces: `ProfileLinks.whatsapp?: string` disponible en todo el sistema; `links.whatsapp` se guarda en Supabase JSONB

- [ ] **Step 1: Agregar whatsapp a ProfileLinks**

En `src/types/database.ts`, modificar la interface `ProfileLinks`:

```typescript
/** Links sociales/portfolio del perfil (guardados como jsonb). */
export interface ProfileLinks {
  web?: string;
  linkedin?: string;
  github?: string;
  x?: string;
  whatsapp?: string;  // número internacional sin +, ej: 59170000000
}
```

- [ ] **Step 2: Agregar validación en profileSchema**

En `src/lib/profile/schema.ts`, modificar el objeto `links` dentro de `profileSchema`:

```typescript
  links: z
    .object({
      web: optionalUrl,
      linkedin: optionalUrl,
      github: optionalUrl,
      x: optionalUrl,
      whatsapp: z
        .string()
        .regex(/^\d{7,15}$/, "Solo dígitos, sin + ni espacios (ej: 59170000000)")
        .optional()
        .or(z.literal("")),
    })
    .partial(),
```

- [ ] **Step 3: Agregar campo WhatsApp al ProfileForm**

En `src/components/features/profile/ProfileForm.tsx`:

a) Cambiar el estado inicial de `links` para incluir `whatsapp`:

```typescript
  const [links, setLinks] = useState({
    web: profile.links.web ?? "",
    linkedin: profile.links.linkedin ?? "",
    github: profile.links.github ?? "",
    x: profile.links.x ?? "",
    whatsapp: profile.links.whatsapp ?? "",
  });
```

b) Agregar el campo en el JSX, dentro del grid de links (después del campo `x`):

```tsx
        <div className="sm:col-span-2">
          <label htmlFor="whatsapp" className={labelClass}>
            WhatsApp{" "}
            <span className="text-cocoa/40 font-normal text-xs">
              (se revela al concretar un Ayni — ej: 59170000000)
            </span>
          </label>
          <input
            id="whatsapp"
            value={links.whatsapp}
            onChange={(e) => setLinks({ ...links, whatsapp: e.target.value })}
            className={fieldClass}
            placeholder="59170000000"
            inputMode="numeric"
          />
        </div>
```

- [ ] **Step 4: Verificar TypeScript**

```bash
npx tsc --noEmit
```
Esperado: sin errores

- [ ] **Step 5: Commit**

```bash
git add src/types/database.ts src/lib/profile/schema.ts src/components/features/profile/ProfileForm.tsx
git commit -m "feat: campo whatsapp en perfil (tipo, validacion y formulario)"
```

---

## Task 3: Widgets del Dashboard

**Files:**
- Create: `src/components/features/dashboard/ScoreWidget.tsx`
- Create: `src/components/features/dashboard/ActiveExchanges.tsx`
- Create: `src/components/features/dashboard/MatchesPreview.tsx`

**Interfaces:**
- Consumes: `ScoreResult` de `@/lib/scoring/compute`, `MatchedFeed` de `@/lib/marketplace/matching`, `ExchangeRequest` de `@/types/database`
- Produces: tres Server Components que reciben datos como props

- [ ] **Step 1: Crear ScoreWidget**

Crear `src/components/features/dashboard/ScoreWidget.tsx`:

```typescript
import type { ScoreResult } from "@/lib/scoring/compute";

interface ScoreWidgetProps {
  score: ScoreResult;
  storedScore: number;
}

/** Widget AynAI Score: muestra el score almacenado con su desglose por factores. */
export const ScoreWidget = ({ score, storedScore }: ScoreWidgetProps) => {
  const display = storedScore > 0 ? storedScore : score.total;
  const pct = Math.min((display / 1000) * 100, 100);

  return (
    <div className="rounded-3xl border border-cream-300 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-cocoa/60">Tu AynAI Score</p>
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
```

- [ ] **Step 2: Crear ActiveExchanges**

Crear `src/components/features/dashboard/ActiveExchanges.tsx`:

```typescript
import Link from "next/link";
import type { ExchangeRequest } from "@/types/database";

interface ActiveExchange {
  request: ExchangeRequest;
  counterpartName: string;
}

interface ActiveExchangesProps {
  exchanges: ActiveExchange[];
}

const statusLabel: Record<string, string> = {
  pending: "Pendiente de respuesta",
  accepted: "Aceptada — pago pendiente",
};

const statusColor: Record<string, string> = {
  pending: "bg-gold/15 text-cocoa",
  accepted: "bg-green/10 text-green",
};

/** Widget de intercambios activos (pending + accepted). */
export const ActiveExchanges = ({ exchanges }: ActiveExchangesProps) => (
  <div className="rounded-3xl border border-cream-300 bg-white p-6 shadow-sm">
    <div className="flex items-center justify-between">
      <p className="text-sm font-medium text-cocoa/60">Intercambios activos</p>
      <Link
        href="/intercambios"
        className="text-xs font-semibold text-red hover:underline"
      >
        Ver todos →
      </Link>
    </div>

    {exchanges.length === 0 ? (
      <div className="mt-4 rounded-2xl bg-cream-200 px-4 py-5 text-center">
        <p className="text-sm text-cocoa/50">No tenés intercambios activos.</p>
        <Link
          href="/marketplace"
          className="mt-2 inline-block text-xs font-semibold text-red hover:underline"
        >
          Buscar personas →
        </Link>
      </div>
    ) : (
      <ul className="mt-4 space-y-3">
        {exchanges.map(({ request, counterpartName }) => (
          <li
            key={request.id}
            className="flex items-center justify-between gap-3 rounded-2xl border border-cream-200 p-3"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-cocoa">
                {counterpartName}
              </p>
              <p className="truncate text-xs text-cocoa/55">
                {request.offer_skill} ↔ {request.want_skill}
              </p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-[0.65rem] font-medium ${
                statusColor[request.status] ?? "bg-cocoa/10 text-cocoa/60"
              }`}
            >
              {statusLabel[request.status] ?? request.status}
            </span>
          </li>
        ))}
      </ul>
    )}
  </div>
);
```

- [ ] **Step 3: Crear MatchesPreview**

Crear `src/components/features/dashboard/MatchesPreview.tsx`:

```typescript
import Link from "next/link";
import type { SearchResult } from "@/lib/marketplace/search";

interface MatchesPreviewProps {
  perfect: SearchResult[];
  partial: SearchResult[];
  hasSkills: boolean;
}

const MatchRow = ({
  result,
  isPerfect,
}: {
  result: SearchResult;
  isPerfect: boolean;
}) => {
  const name =
    result.profile.full_name?.trim() || result.profile.username || "Usuario";
  const offers = result.skills
    .filter((s) => s.kind === "offer")
    .map((s) => s.name)
    .slice(0, 2);

  return (
    <li className="flex items-center gap-3 rounded-2xl border border-cream-200 p-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cocoa font-serif text-xs font-bold text-cream">
        {name.slice(0, 2).toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-cocoa">{name}</p>
        <p className="truncate text-xs text-cocoa/55">
          Ofrece: {offers.join(", ") || "—"}
        </p>
      </div>
      <span
        className={`shrink-0 rounded-full px-2.5 py-1 text-[0.65rem] font-bold ${
          isPerfect
            ? "bg-gold/20 text-cocoa"
            : "bg-cocoa/8 text-cocoa/60"
        }`}
      >
        {isPerfect ? "✦ Perfecto" : "◆ Parcial"}
      </span>
    </li>
  );
};

/** Widget con los top 3 matches del usuario (perfectos primero). */
export const MatchesPreview = ({
  perfect,
  partial,
  hasSkills,
}: MatchesPreviewProps) => {
  const top = [...perfect, ...partial].slice(0, 3);

  return (
    <div className="rounded-3xl border border-cream-300 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-cocoa/60">Tus matches</p>
        <Link
          href="/marketplace"
          className="text-xs font-semibold text-red hover:underline"
        >
          Ver todos →
        </Link>
      </div>

      {!hasSkills ? (
        <div className="mt-4 rounded-2xl bg-cream-200 px-4 py-5 text-center">
          <p className="text-sm text-cocoa/50">
            Agrega habilidades para ver tus matches.
          </p>
          <Link
            href="/perfil/editar"
            className="mt-2 inline-block text-xs font-semibold text-red hover:underline"
          >
            Completar perfil →
          </Link>
        </div>
      ) : top.length === 0 ? (
        <div className="mt-4 rounded-2xl bg-cream-200 px-4 py-5 text-center">
          <p className="text-sm text-cocoa/50">
            Aún no hay matches. A medida que más personas se unan, aparecerán aquí.
          </p>
          <Link
            href="/marketplace"
            className="mt-2 inline-block text-xs font-semibold text-red hover:underline"
          >
            Explorar el marketplace →
          </Link>
        </div>
      ) : (
        <>
          <p className="mt-1 text-xs text-cocoa/40">
            {perfect.length > 0
              ? `${perfect.length} match${perfect.length > 1 ? "es" : ""} perfecto${perfect.length > 1 ? "s" : ""}`
              : `${partial.length} match${partial.length > 1 ? "es" : ""} parcial${partial.length > 1 ? "es" : ""}`}
          </p>
          <ul className="mt-3 space-y-2">
            {top.map((r) => (
              <MatchRow
                key={r.profile.id}
                result={r}
                isPerfect={perfect.some((p) => p.profile.id === r.profile.id)}
              />
            ))}
          </ul>
        </>
      )}
    </div>
  );
};
```

- [ ] **Step 4: Verificar TypeScript**

```bash
npx tsc --noEmit
```
Esperado: sin errores

- [ ] **Step 5: Commit**

```bash
git add src/components/features/dashboard/
git commit -m "feat: widgets ScoreWidget, ActiveExchanges y MatchesPreview"
```

---

## Task 4: Dashboard page renovado

**Files:**
- Modify: `src/app/(dashboard)/dashboard/page.tsx`

**Interfaces:**
- Consumes: `ScoreWidget`, `ActiveExchanges`, `MatchesPreview` de `@/components/features/dashboard/`, `getMatchedFeed` de `@/lib/marketplace/matching`, `computeAyniScore` de `@/lib/scoring/compute`
- Produces: página dashboard con 3 widgets y layout grid

- [ ] **Step 1: Reemplazar dashboard/page.tsx completo**

```typescript
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { computeAyniScore } from "@/lib/scoring/compute";
import { getMatchedFeed } from "@/lib/marketplace/matching";
import { ScoreWidget } from "@/components/features/dashboard/ScoreWidget";
import { ActiveExchanges } from "@/components/features/dashboard/ActiveExchanges";
import { MatchesPreview } from "@/components/features/dashboard/MatchesPreview";
import type { Profile, ExchangeRequest, UserSkill } from "@/types/database";

/** Dashboard — hub personalizado con 3 widgets: matches, intercambios activos y score. */
export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Perfil
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  // Mis skills
  const { data: mySkills } = await supabase
    .from("user_skills")
    .select("*")
    .eq("user_id", user.id)
    .returns<UserSkill[]>();

  const skillList = mySkills ?? [];
  const myOffers = skillList.filter((s) => s.kind === "offer").map((s) => s.name);
  const mySeeks = skillList.filter((s) => s.kind === "seek").map((s) => s.name);
  const hasSkills = skillList.length > 0;

  // Matches (top 3)
  const { perfect, partial } = await getMatchedFeed(myOffers, mySeeks, user.id);

  // Intercambios activos (pending + accepted)
  const { data: activeRaw } = await supabase
    .from("exchange_requests")
    .select("*")
    .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`)
    .in("status", ["pending", "accepted"])
    .order("updated_at", { ascending: false })
    .limit(5)
    .returns<ExchangeRequest[]>();

  const activeList = activeRaw ?? [];
  const counterpartIds = [
    ...new Set(
      activeList.map((r) =>
        r.requester_id === user.id ? r.recipient_id : r.requester_id
      )
    ),
  ];
  const { data: counterparts } = await supabase
    .from("profiles")
    .select("id, full_name, username")
    .in(
      "id",
      counterpartIds.length > 0
        ? counterpartIds
        : ["00000000-0000-0000-0000-000000000000"]
    )
    .returns<{ id: string; full_name: string | null; username: string | null }[]>();

  const nameById = new Map(
    (counterparts ?? []).map((p) => [
      p.id,
      p.full_name?.trim() || p.username || "Usuario",
    ])
  );

  const activeExchanges = activeList.map((request) => ({
    request,
    counterpartName: nameById.get(
      request.requester_id === user.id ? request.recipient_id : request.requester_id
    ) ?? "Usuario",
  }));

  // AynAI Score
  const { data: ratingAgg } = await supabase
    .from("ratings")
    .select("stars")
    .eq("ratee_id", user.id)
    .returns<{ stars: number }[]>();
  const ratingList = ratingAgg ?? [];
  const avgStars = ratingList.length
    ? ratingList.reduce((s, r) => s + r.stars, 0) / ratingList.length
    : null;

  const { count: completedCount } = await supabase
    .from("exchange_requests")
    .select("id", { count: "exact", head: true })
    .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`)
    .eq("status", "completed");

  const { count: acceptedOrMore } = await supabase
    .from("exchange_requests")
    .select("id", { count: "exact", head: true })
    .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`)
    .in("status", ["accepted", "completed"]);

  const links = profile?.links ?? {};
  const hasLink = Boolean(links.web || links.linkedin || links.github || links.x);
  const skillKinds = new Set(skillList.map((s) => s.kind));
  const profileItems =
    (profile?.avatar_url ? 1 : 0) +
    (skillKinds.has("offer") ? 1 : 0) +
    (skillKinds.has("seek") ? 1 : 0) +
    (hasLink ? 1 : 0) +
    (profile && profile.availability !== "unavailable" ? 1 : 0);

  const score = computeAyniScore({
    avgStars,
    ratingCount: ratingList.length,
    completedCount: completedCount ?? 0,
    acceptedOrMore: acceptedOrMore ?? 0,
    profileItems,
  });

  const displayName =
    profile?.full_name?.trim() || user.email?.split("@")[0] || "Usuario";

  return (
    <main className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
      {/* Onboarding banner si perfil incompleto */}
      {profileItems < 5 && (
        <div className="mb-8 flex items-center justify-between gap-4 rounded-3xl border border-gold/40 bg-gold/10 p-5">
          <p className="text-sm font-medium text-cocoa">
            Completá tu perfil ({profileItems}/5) para subir tu AynAI Score y aparecer en más matches.
          </p>
          <a
            href="/perfil/editar"
            className="shrink-0 rounded-full bg-cocoa px-4 py-2 text-sm font-semibold text-cream hover:bg-cocoa/90"
          >
            Completar
          </a>
        </div>
      )}

      <p className="font-sans text-sm text-cocoa/60">Bienvenido,</p>
      <h1 className="font-serif text-4xl font-bold text-cocoa">{displayName}</h1>

      {/* Grid de widgets */}
      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Columna izquierda: matches (grande) */}
        <MatchesPreview perfect={perfect} partial={partial} hasSkills={hasSkills} />

        {/* Columna derecha: score */}
        <ScoreWidget score={score} storedScore={profile?.ayni_score ?? 0} />
      </div>

      {/* Intercambios activos: ancho completo */}
      <div className="mt-6">
        <ActiveExchanges exchanges={activeExchanges} />
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```
Esperado: sin errores

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/dashboard/page.tsx
git commit -m "feat: dashboard renovado con widgets de matches, intercambios y score"
```

---

## Task 5: MatchCard y MatchSection — UI del marketplace

**Files:**
- Create: `src/components/features/marketplace/MatchCard.tsx`
- Create: `src/components/features/marketplace/MatchSection.tsx`

**Interfaces:**
- Consumes: `SearchResult` de `@/lib/marketplace/search`, `ProposeExchangeButton` de `@/components/features/marketplace/ProposeExchangeButton`
- Produces:
  ```typescript
  // MatchCard — tarjeta compacta con badge de match
  export const MatchCard: (props: MatchCardProps) => JSX.Element
  // MatchSection — sección "Matches para vos" con ambos buckets
  export const MatchSection: (props: MatchSectionProps) => JSX.Element
  ```

- [ ] **Step 1: Crear MatchCard**

Crear `src/components/features/marketplace/MatchCard.tsx`:

```typescript
import { MapPin, Star } from "lucide-react";
import { ProposeExchangeButton } from "./ProposeExchangeButton";
import type { SearchResult } from "@/lib/marketplace/search";

interface MatchCardProps {
  result: SearchResult;
  myOffers: string[];
  isPerfect: boolean;
}

/** Tarjeta de perfil enriquecida con badge de match bilateral o parcial. */
export const MatchCard = ({ result, myOffers, isPerfect }: MatchCardProps) => {
  const { profile, skills } = result;
  const name = profile.full_name?.trim() || profile.username || "Usuario";
  const offers = skills.filter((s) => s.kind === "offer");
  const seeks = skills.filter((s) => s.kind === "seek");
  const recipientOffers = offers.map((s) => s.name);

  return (
    <div className="flex flex-col rounded-3xl border bg-white shadow-sm transition-shadow hover:shadow-md overflow-hidden"
      style={{ borderColor: isPerfect ? "rgba(201,168,76,0.4)" : undefined }}
    >
      {/* Badge de match */}
      <div className={`px-5 py-2 text-xs font-bold tracking-wide ${
        isPerfect
          ? "bg-gold/10 text-cocoa border-b border-gold/20"
          : "bg-cocoa/5 text-cocoa/60 border-b border-cocoa/10"
      }`}>
        {isPerfect ? "✦ Match perfecto" : "◆ Match parcial"}
      </div>

      <div className="flex flex-1 flex-col p-5">
        {/* Header */}
        <div className="flex items-start gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={profile.avatar_url || "/icon.svg"}
            alt={name}
            className="h-14 w-14 rounded-2xl border border-cream-300 object-cover shrink-0"
          />
          <div className="min-w-0 flex-1">
            <a
              href={`/u/${profile.username}`}
              className="font-serif text-xl font-bold text-cocoa hover:text-red transition-colors"
            >
              {name}
            </a>
            {profile.username && (
              <p className="text-xs text-cocoa/40">@{profile.username}</p>
            )}
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-cocoa/55">
              {profile.location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin size={11} aria-hidden="true" />
                  {profile.location}
                </span>
              )}
              <span className="inline-flex items-center gap-1 font-semibold text-green">
                <Star size={11} aria-hidden="true" className="fill-green" />
                {profile.ayni_score}
              </span>
            </div>
          </div>
        </div>

        {profile.bio && (
          <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-cocoa/70">
            {profile.bio}
          </p>
        )}

        {/* Skills */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs font-semibold text-green mb-1.5">Ofrece</p>
            <div className="flex flex-wrap gap-1.5">
              {offers.slice(0, 3).map((s) => (
                <span
                  key={s.id}
                  className="rounded-full bg-green/8 px-2.5 py-1 text-[0.7rem] text-cocoa"
                >
                  {s.name}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-red mb-1.5">Busca</p>
            <div className="flex flex-wrap gap-1.5">
              {seeks.slice(0, 3).map((s) => (
                <span
                  key={s.id}
                  className="rounded-full bg-red/8 px-2.5 py-1 text-[0.7rem] text-cocoa"
                >
                  {s.name}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-4 pt-4 border-t border-cream-200">
          <ProposeExchangeButton
            recipientId={profile.id}
            recipientName={name}
            recipientOffers={recipientOffers}
            myOffers={myOffers}
          />
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Crear MatchSection**

Crear `src/components/features/marketplace/MatchSection.tsx`:

```typescript
import { MatchCard } from "./MatchCard";
import type { SearchResult } from "@/lib/marketplace/search";

interface MatchSectionProps {
  perfect: SearchResult[];
  partial: SearchResult[];
  myOffers: string[];
}

/**
 * Sección "Matches para vos" del marketplace.
 * Muestra matches perfectos primero (badge dorado) y parciales después.
 */
export const MatchSection = ({ perfect, partial, myOffers }: MatchSectionProps) => {
  const hasMatches = perfect.length > 0 || partial.length > 0;
  if (!hasMatches) return null;

  return (
    <section className="mb-12">
      <div className="mb-5 flex items-center gap-3">
        <h2 className="font-serif text-2xl font-bold text-cocoa">
          Matches para vos
        </h2>
        <span className="rounded-full bg-gold/15 px-3 py-1 text-xs font-bold text-cocoa">
          {perfect.length + partial.length}
        </span>
      </div>

      {perfect.length > 0 && (
        <>
          {partial.length > 0 && (
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-green">
              ✦ Perfectos
            </p>
          )}
          <div className="grid gap-5 lg:grid-cols-2">
            {perfect.map((r) => (
              <MatchCard key={r.profile.id} result={r} myOffers={myOffers} isPerfect={true} />
            ))}
          </div>
        </>
      )}

      {partial.length > 0 && (
        <>
          <p className={`text-xs font-semibold uppercase tracking-wide text-cocoa/50 ${perfect.length > 0 ? "mt-6 mb-3" : "mb-3"}`}>
            {perfect.length > 0 ? "◆ Parciales" : "◆ Matches parciales"}
          </p>
          <div className="grid gap-5 lg:grid-cols-2">
            {partial.map((r) => (
              <MatchCard key={r.profile.id} result={r} myOffers={myOffers} isPerfect={false} />
            ))}
          </div>
        </>
      )}
    </section>
  );
};
```

- [ ] **Step 3: Verificar TypeScript**

```bash
npx tsc --noEmit
```
Esperado: sin errores

- [ ] **Step 4: Commit**

```bash
git add src/components/features/marketplace/MatchCard.tsx src/components/features/marketplace/MatchSection.tsx
git commit -m "feat: MatchCard con badge bilateral y MatchSection para el marketplace"
```

---

## Task 6: Marketplace page — dos secciones con matching

**Files:**
- Modify: `src/app/(dashboard)/marketplace/page.tsx`

**Interfaces:**
- Consumes: `getMatchedFeed` de `@/lib/marketplace/matching`, `MatchSection` de `@/components/features/marketplace/MatchSection`, `ResultsGrid` de `@/components/features/marketplace/ResultsGrid`
- Produces: página marketplace con sección de matches + sección "Otras personas"

- [ ] **Step 1: Reemplazar marketplace/page.tsx**

```typescript
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SearchFilters } from "@/components/features/marketplace/SearchFilters";
import { ResultsGrid } from "@/components/features/marketplace/ResultsGrid";
import { MatchSection } from "@/components/features/marketplace/MatchSection";
import { HowItWorks } from "@/components/features/marketplace/HowItWorks";
import { getMatchedFeed } from "@/lib/marketplace/matching";
import { searchProfiles } from "@/lib/marketplace/search";
import { COMMISSION_AMOUNT_BS } from "@/lib/payments/constants";
import type { UserSkill } from "@/types/database";

interface PageProps {
  searchParams: Promise<{ q?: string; kind?: string; loc?: string; avail?: string }>;
}

/** Marketplace con matching bilateral. Sin búsqueda activa: dos secciones. Con búsqueda: resultados planos. */
export default async function MarketplacePage({ searchParams }: PageProps) {
  const { q, kind, loc, avail } = await searchParams;
  const hasSearch = Boolean(q?.trim() || kind || loc?.trim() || avail);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Mis skills para el matching y para precargar el formulario de propuesta
  const { data: mySkills } = await supabase
    .from("user_skills")
    .select("*")
    .eq("user_id", user.id)
    .returns<UserSkill[]>();

  const skillList = mySkills ?? [];
  const myOffers = skillList.filter((s) => s.kind === "offer").map((s) => s.name);
  const mySeeks = skillList.filter((s) => s.kind === "seek").map((s) => s.name);
  const hasSkills = skillList.length > 0;

  // Con búsqueda: override plano (comportamiento existente)
  if (hasSearch) {
    const normalizedKind = kind === "offer" || kind === "seek" ? kind : undefined;
    const results = q?.trim()
      ? await searchProfiles({ q: q.trim(), kind: normalizedKind, loc, avail, excludeUserId: user.id })
      : [];

    return (
      <main className="mx-auto max-w-5xl px-5 py-12 sm:px-8">
        <h1 className="font-serif text-4xl font-bold text-cocoa">Marketplace</h1>
        <p className="mt-2 text-sm text-cocoa/60">Descubrí personas, proponé un Ayni y conectá.</p>
        <div className="mt-8">
          <SearchFilters />
        </div>
        {results.length > 0 && (
          <p className="mt-8 text-sm text-cocoa/60">
            {results.length} {results.length === 1 ? "persona" : "personas"} con esos criterios
          </p>
        )}
        <ResultsGrid
          results={results}
          myOffers={myOffers}
          query={q?.trim()}
          hasFilters={hasSearch}
        />
      </main>
    );
  }

  // Sin búsqueda: feed con matching bilateral
  const { perfect, partial, rest } = await getMatchedFeed(myOffers, mySeeks, user.id);
  const hasMatches = perfect.length > 0 || partial.length > 0;

  return (
    <main className="mx-auto max-w-5xl px-5 py-12 sm:px-8">
      <h1 className="font-serif text-4xl font-bold text-cocoa">Marketplace</h1>
      <p className="mt-2 text-sm text-cocoa/60">
        Descubrí personas, proponé un Ayni y conectá.
      </p>

      <div className="mt-8">
        <HowItWorks amountBs={COMMISSION_AMOUNT_BS} />
      </div>

      <div className="mt-8">
        <SearchFilters />
      </div>

      {!hasSkills && (
        <div className="mt-8 rounded-2xl border border-gold/30 bg-gold/8 p-5 text-sm text-cocoa">
          <p className="font-semibold">Agrega habilidades para ver tus matches personalizados.</p>
          <a href="/perfil/editar" className="mt-1 inline-block font-semibold text-red hover:underline text-xs">
            Completar perfil →
          </a>
        </div>
      )}

      <div className="mt-10">
        {/* Sección matches */}
        {hasMatches && (
          <MatchSection perfect={perfect} partial={partial} myOffers={myOffers} />
        )}

        {/* Sección otras personas */}
        {rest.length > 0 && (
          <section>
            {hasMatches && (
              <h2 className="mb-5 font-serif text-2xl font-bold text-cocoa">
                Otras personas
              </h2>
            )}
            <ResultsGrid
              results={rest}
              myOffers={myOffers}
              query={undefined}
              hasFilters={false}
            />
          </section>
        )}

        {!hasMatches && rest.length === 0 && (
          <ResultsGrid
            results={[]}
            myOffers={myOffers}
            query={undefined}
            hasFilters={false}
          />
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```
Esperado: sin errores

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/marketplace/page.tsx
git commit -m "feat: marketplace con dos secciones de matching bilateral"
```

---

## Task 7: WhatsApp reveal en ExchangeRequestCard

**Files:**
- Modify: `src/components/features/marketplace/ExchangeRequestCard.tsx`

**Interfaces:**
- Consumes: `ExchangeParty` (ya tiene `links: ProfileLinks`) — `links.whatsapp` ahora disponible
- Produces: sección de contacto revelado que muestra WhatsApp primero, links como fallback

- [ ] **Step 1: Modificar el bloque de contacto revelado**

En `src/components/features/marketplace/ExchangeRequestCard.tsx`, encontrar el bloque donde se muestra el contacto (cuando `myPayment?.status === "paid"`) y reemplazarlo:

```tsx
          {request.status === "accepted" && (
            myPayment?.status === "paid" ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.97, y: 6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="mt-4 rounded-2xl border border-green/40 bg-green/5 p-4 text-sm shadow-[0_0_0_3px_rgba(34,139,87,0.08)]"
              >
                <p className="flex items-center gap-1.5 font-semibold text-cocoa">
                  <span aria-hidden="true">🎉</span> Contacto de {name}:
                </p>

                {counterpart.links?.whatsapp ? (
                  <a
                    href={`https://wa.me/${counterpart.links.whatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 flex items-center gap-2.5 rounded-xl bg-green px-4 py-2.5 font-semibold text-white transition-opacity hover:opacity-90 w-fit"
                  >
                    <span aria-hidden="true" className="text-base">💬</span>
                    Abrir WhatsApp
                  </a>
                ) : hasLinks ? (
                  <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-cocoa/80">
                    {counterpart.links?.web && (
                      <li>
                        <a className="hover:underline" href={counterpart.links.web} target="_blank" rel="noopener noreferrer">
                          Web
                        </a>
                      </li>
                    )}
                    {counterpart.links?.linkedin && (
                      <li>
                        <a className="hover:underline" href={counterpart.links.linkedin} target="_blank" rel="noopener noreferrer">
                          LinkedIn
                        </a>
                      </li>
                    )}
                    {counterpart.links?.github && (
                      <li>
                        <a className="hover:underline" href={counterpart.links.github} target="_blank" rel="noopener noreferrer">
                          GitHub
                        </a>
                      </li>
                    )}
                    {counterpart.links?.x && (
                      <li>
                        <a className="hover:underline" href={counterpart.links.x} target="_blank" rel="noopener noreferrer">
                          X
                        </a>
                      </li>
                    )}
                  </ul>
                ) : (
                  <p className="mt-1 text-cocoa/60">
                    {counterpart.username
                      ? <>Perfil público: <a className="font-semibold text-red hover:underline" href={`/u/${counterpart.username}`}>@{counterpart.username}</a></>
                      : "Esta persona aún no agregó contacto. Escríbele por su perfil."}
                  </p>
                )}
              </motion.div>
            ) : (
              <CommissionPayment
                exchangeRequestId={request.id}
                counterpartName={name}
                amountBs={myPayment?.amount_bs ?? COMMISSION_AMOUNT_BS}
              />
            )
          )}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```
Esperado: sin errores

- [ ] **Step 3: Build final**

```bash
npm run build 2>&1 | tail -15
```
Esperado: build exitoso sin errores

- [ ] **Step 4: Correr todos los tests**

```bash
npx vitest run
```
Esperado: todos los tests en verde (incluyendo los 8 nuevos de matching)

- [ ] **Step 5: Commit final**

```bash
git add src/components/features/marketplace/ExchangeRequestCard.tsx
git commit -m "feat: revelar WhatsApp post-pago con fallback a links"
```

---

## Verificación end-to-end

Después de implementar todas las tasks:

```bash
# TypeScript limpio
npx tsc --noEmit

# Todos los tests
npx vitest run

# Build de producción
npm run build

# Push y deploy
git push origin feat/mvp-confianza-notificaciones
```

Flujo manual a verificar:
1. Login → Dashboard muestra 3 widgets
2. Sin skills → widget matches muestra CTA "Completar perfil"
3. Con skills cargadas → widget matches muestra top 3 (perfectos primero)
4. Marketplace sin búsqueda → sección "Matches para vos" + "Otras personas"
5. Marketplace con búsqueda → resultado plano sin secciones
6. Perfil/editar → campo WhatsApp visible y guardable
7. Intercambio completado + pago → botón "Abrir WhatsApp" si la contraparte tiene número

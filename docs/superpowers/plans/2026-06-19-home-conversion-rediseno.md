# Rediseño de la Home — Conversión + Estética + Accesibilidad — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reestructurar la home pública para convertir visitantes en usuarios registrados del marketplace, comunicando el modelo de comisión (Bs 20) con transparencia, con estética más profesional y accesibilidad WCAG AA.

**Architecture:** La home sigue siendo `src/app/(marketing)/page.tsx` (Server Component) que compone secciones de `src/components/sections/`. Se reescriben Hero, HowItWorks, BusinessModel→Pricing, FinalCta; se condensa Audience; se eliminan Problem y ValueProp; y se añade una capa de accesibilidad (skip-link, focus-visible, landmarks).

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Tailwind CSS 4, lucide-react, Framer Motion.

## Global Constraints

- **Sin dependencias nuevas.** Solo Tailwind 4, lucide-react, Framer Motion, Supabase (ya instalados).
- **Precio nunca hardcodeado:** el copy que mencione el monto importa `COMMISSION_AMOUNT_BS` de `src/lib/payments/constants.ts` (valor actual = 20). Nunca escribir el número "20" a mano en el copy de precio.
- **Color disciplinado:** `--color-red` es el único color de acción (CTAs). Dorado (`--color-gold`) solo para detalles decorativos y para texto SOLO sobre fondos oscuros (cocoa); NUNCA como texto pequeño sobre fondos claros (no pasa contraste AA).
- **Rutas de auth confirmadas:** registro = `/registro`, login = `/login` (ambas en `src/app/(auth)/`).
- **CTAs:** usar `Button` de `@/components/ui/button` con `as="a"` y `href`. Variantes: `"primary" | "outline" | "gold" | "ghost"`. Tamaños: `"sm" | "md" | "lg"`.
- **Gate de tipos:** `npx tsc --noEmit` es el validador real (`next.config.mjs` tiene `typescript.ignoreBuildErrors: true`). Línea base de error preexistente: `src/components/ui/button.tsx:50`. No introducir errores nuevos.
- **Idioma:** UI y comentarios en español; identificadores en inglés.
- **Accesibilidad:** un solo `<h1>` por página (vive en Hero); headings en orden; `aria-label` en iconos funcionales; `prefers-reduced-motion` ya respetado en `globals.css`.

---

## File Structure

**Crear:**
- `src/components/sections/Pricing.tsx` — sección "Precio transparente" (reemplaza a `BusinessModel.tsx`).

**Modificar:**
- `src/app/(marketing)/layout.tsx` — skip-link "Saltar al contenido".
- `src/app/globals.css` — regla global `:focus-visible`.
- `src/app/(marketing)/page.tsx` — `<main id="contenido">`, recomposición de secciones.
- `src/components/sections/Hero.tsx` — CTA a `/registro`, métricas honestas, copy "producto vivo".
- `src/constants/content.ts` — `STEPS` pasa de 3 a 4 (añade paso de comisión).
- `src/components/sections/HowItWorks.tsx` — grilla a 4 columnas + copy.
- `src/components/sections/FinalCta.tsx` — de waitlist a CTA de registro.
- `src/components/sections/Audience.tsx` — condensar padding vertical.

**Eliminar:**
- `src/components/sections/BusinessModel.tsx` (renombrado a `Pricing.tsx`).
- `src/components/sections/Problem.tsx`.
- `src/components/sections/ValueProp.tsx`.

---

## Task 1: Cimientos de accesibilidad (skip-link + focus-visible)

**Files:**
- Modify: `src/app/(marketing)/layout.tsx`
- Modify: `src/app/globals.css`
- Modify: `src/app/(marketing)/page.tsx`

**Interfaces:**
- Consumes: nada.
- Produces: ancla `#contenido` en `<main>`; skip-link visible al enfocar; anillo de foco global para enlaces/botones nativos.

- [ ] **Step 1: Añadir el skip-link en el layout**

En `src/app/(marketing)/layout.tsx`, reemplazar el `return` completo por:

```tsx
  return (
    <>
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-cocoa focus:px-5 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-cream"
      >
        Saltar al contenido
      </a>
      <Navbar />
      {children}
      <Footer />
    </>
  );
```

- [ ] **Step 2: Añadir el id de destino en la home**

En `src/app/(marketing)/page.tsx`, cambiar la etiqueta de apertura `<main>` por `<main id="contenido">`. (El resto del archivo se recompone en la Task 6; aquí solo se añade el `id`.)

- [ ] **Step 3: Añadir el anillo de foco global**

En `src/app/globals.css`, justo después del bloque `@media (prefers-reduced-motion: reduce) { ... }`, añadir:

```css
/* Anillo de foco visible para navegación por teclado (accesibilidad) */
:focus-visible {
  outline: 2px solid var(--color-gold);
  outline-offset: 2px;
  border-radius: 4px;
}
```

- [ ] **Step 4: Verificar que compila**

Run: `npx tsc --noEmit`
Expected: sin errores nuevos (solo `button.tsx:50`).

- [ ] **Step 5: Commit**

```bash
git add "src/app/(marketing)/layout.tsx" src/app/globals.css "src/app/(marketing)/page.tsx"
git commit -m "feat: cimientos de accesibilidad (skip-link + focus-visible global)"
```

---

## Task 2: Hero — CTA a registro + métricas honestas

**Files:**
- Modify: `src/components/sections/Hero.tsx`

**Interfaces:**
- Consumes: `Button`, `ChakanaPattern`, `TricolorStripe` (existentes).
- Produces: Hero con `<h1>` único; CTA primario → `/registro`, secundario → `#como-funciona`.

- [ ] **Step 1: Reescribir el Hero**

Reemplazar el contenido completo de `src/components/sections/Hero.tsx` por:

```tsx
"use client";

import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChakanaPattern } from "@/components/shared/ChakanaPattern";
import { TricolorStripe } from "@/components/shared/TricolorStripe";
import { COMMISSION_AMOUNT_BS } from "@/lib/payments/constants";

// Variantes de stagger para la entrada secuencial del hero
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
};

// Métricas honestas alineadas al modelo de comisión transparente.
const STATS = [
  { value: "Gratis", label: "Explorar y proponer" },
  { value: `Bs ${COMMISSION_AMOUNT_BS}`, label: "Solo al conectar" },
  { value: "100%", label: "Reputación tuya" },
];

/**
 * Sección Hero — fondo cocoa con textura chakana, resplandor cálido y grano.
 * Producto vivo: CTA primario al registro, secundario a "cómo funciona".
 */
export const Hero = () => (
  <section id="inicio" className="cocoa-glow grain relative overflow-hidden">
    {/* Patrón geométrico andino sutil */}
    <div aria-hidden="true" className="absolute inset-0 text-gold/[0.07]">
      <ChakanaPattern className="h-full w-full" />
    </div>

    {/* Halos de color difusos */}
    <div aria-hidden="true" className="pointer-events-none absolute -left-32 top-20 h-72 w-72 rounded-full bg-red/20 blur-[120px]" />
    <div aria-hidden="true" className="pointer-events-none absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-green/20 blur-[120px]" />

    <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-5 pb-20 pt-28 text-center sm:px-8">
      <motion.div variants={container} initial="hidden" animate="show">
        <motion.div variants={item}>
          <span className="mb-7 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-gold">
            <Sparkles size={14} aria-hidden="true" />
            Marketplace de habilidades · ya disponible
          </span>
        </motion.div>

        <motion.h1
          variants={item}
          className="font-serif text-[2.6rem] font-bold leading-[1.04] tracking-tight text-cream sm:text-6xl md:text-7xl"
        >
          Tu talento vale.
          <br />
          <span className="text-gradient-gold">Conéctalo.</span>
        </motion.h1>

        <motion.p
          variants={item}
          className="mx-auto mt-7 max-w-2xl text-lg leading-relaxed text-cream/75 sm:text-xl"
        >
          AynAI es el marketplace donde intercambias habilidades y construyes una
          reputación verificable. Explora gratis y conecta con quien necesitas.
        </motion.p>

        <motion.div
          variants={item}
          className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <Button as="a" href="/registro" size="lg" className="group w-full sm:w-auto">
            Crear cuenta gratis
            <ArrowRight size={18} aria-hidden="true" className="transition-transform group-hover:translate-x-1" />
          </Button>
          <Button as="a" href="#como-funciona" variant="outline" size="lg" className="w-full sm:w-auto">
            Ver cómo funciona
          </Button>
        </motion.div>
      </motion.div>

      {/* Métricas de confianza */}
      <motion.dl
        variants={item}
        initial="hidden"
        animate="show"
        transition={{ delay: 0.7 }}
        className="mt-16 grid w-full max-w-lg grid-cols-3 gap-4 border-t border-cream/10 pt-8"
      >
        {STATS.map((stat) => (
          <div key={stat.label} className="text-center">
            <dt className="font-serif text-2xl font-bold text-gold sm:text-3xl">{stat.value}</dt>
            <dd className="mt-1 text-xs text-cream/60">{stat.label}</dd>
          </div>
        ))}
      </motion.dl>
    </div>

    <TricolorStripe />
  </section>
);
```

- [ ] **Step 2: Verificar que compila**

Run: `npx tsc --noEmit`
Expected: sin errores nuevos.

- [ ] **Step 3: Commit**

```bash
git add src/components/sections/Hero.tsx
git commit -m "feat: hero con CTA a registro y métricas de comisión transparente"
```

---

## Task 3: Cómo funciona — 4 pasos incluyendo la comisión

**Files:**
- Modify: `src/constants/content.ts`
- Modify: `src/components/sections/HowItWorks.tsx`

**Interfaces:**
- Consumes: `COMMISSION_AMOUNT_BS` de `@/lib/payments/constants`; `STEPS` (extendido a 4); `SectionHeading`, `Reveal`.
- Produces: `STEPS` con 4 ítems; sección con grilla de 4 columnas en desktop.

- [ ] **Step 1: Importar la constante de comisión en content.ts**

En `src/constants/content.ts`, en la zona de imports superior, añadir:

```typescript
import { COMMISSION_AMOUNT_BS } from "@/lib/payments/constants";
```

Y en el import de iconos de `lucide-react` ya existente, añadir `HandCoins` a la lista de iconos importados.

- [ ] **Step 2: Extender STEPS a 4 pasos**

En `src/constants/content.ts`, reemplazar el arreglo `STEPS` completo por:

```typescript
export const STEPS: StepItem[] = [
  {
    number: "01",
    icon: Megaphone,
    title: "Explora y publica",
    description: "Descubre a todas las personas y publica lo que sabes hacer. Explorar es gratis.",
  },
  {
    number: "02",
    icon: Repeat,
    title: "Propón un Ayni",
    description: "Elige qué ofreces y qué quieres de alguien. Proponer no cuesta nada.",
  },
  {
    number: "03",
    icon: Award,
    title: "Acepta y construye reputación",
    description: "Si la otra parte acepta, se concreta la conexión y cada trabajo suma a tu AynAI Score.",
  },
  {
    number: "04",
    icon: HandCoins,
    title: "Paga y conecta",
    description: `Cada parte paga Bs ${COMMISSION_AMOUNT_BS} para revelar el contacto del otro y coordinar. Sin suscripciones.`,
  },
];
```

- [ ] **Step 3: Pasar la grilla a 4 columnas y actualizar el copy**

En `src/components/sections/HowItWorks.tsx`, reemplazar el contenido completo por:

```tsx
import { STEPS } from "@/constants/content";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { Reveal } from "@/components/shared/Reveal";

/**
 * Sección Cómo funciona — 4 pasos numerados conectados por una línea.
 * Flujo: explorar → proponer → aceptar → pagar y conectar.
 */
export const HowItWorks = () => (
  <section id="como-funciona" className="relative bg-cream-200 py-24 sm:py-32">
    <div className="mx-auto max-w-6xl px-5 sm:px-8">
      <SectionHeading
        eyebrow="Cómo funciona"
        title="Explora. Propón. Conecta."
        description="Cuatro pasos simples. Explorar y proponer es gratis; solo pagas cuando concretas una conexión."
      />

      <div className="relative mt-20">
        {/* Línea conectora en escritorio */}
        <div
          aria-hidden="true"
          className="absolute left-0 right-0 top-7 hidden h-px bg-gradient-to-r from-transparent via-cocoa/20 to-transparent md:block"
        />

        <ol className="grid gap-12 md:grid-cols-4 md:gap-8">
          {STEPS.map((step, i) => (
            <Reveal key={step.number} delay={i * 0.12}>
              <li className="relative flex flex-col items-center text-center md:items-start md:text-left">
                <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-2xl bg-cocoa text-cream shadow-lg">
                  <step.icon size={24} aria-hidden="true" />
                  <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-gold font-sans text-[0.7rem] font-bold text-cocoa">
                    {step.number}
                  </span>
                </div>
                <h3 className="mt-6 font-serif text-xl font-bold text-cocoa">{step.title}</h3>
                <p className="mt-3 max-w-xs text-[0.95rem] leading-relaxed text-cocoa/70">
                  {step.description}
                </p>
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </div>
  </section>
);
```

- [ ] **Step 4: Verificar que compila**

Run: `npx tsc --noEmit`
Expected: sin errores nuevos.

- [ ] **Step 5: Commit**

```bash
git add src/constants/content.ts src/components/sections/HowItWorks.tsx
git commit -m "feat: cómo funciona en 4 pasos incluyendo la comisión transparente"
```

---

## Task 4: Precio transparente (Pricing.tsx)

**Files:**
- Create: `src/components/sections/Pricing.tsx`
- Delete: `src/components/sections/BusinessModel.tsx`

**Interfaces:**
- Consumes: `COMMISSION_AMOUNT_BS` de `@/lib/payments/constants`; `SectionHeading`, `Reveal`; `Button`; iconos de `lucide-react`.
- Produces: `export const Pricing` (Server Component).

- [ ] **Step 1: Crear Pricing.tsx**

Crear `src/components/sections/Pricing.tsx`:

```tsx
import { Check, Compass, HandCoins, ArrowRight } from "lucide-react";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { Reveal } from "@/components/shared/Reveal";
import { Button } from "@/components/ui/button";
import { COMMISSION_AMOUNT_BS } from "@/lib/payments/constants";

const freeFeatures = [
  "Crear tu perfil y publicar habilidades",
  "Explorar a todas las personas del marketplace",
  "Proponer todos los Ayni que quieras",
];

const paidFeatures = [
  `Bs ${COMMISSION_AMOUNT_BS} por persona, una sola vez por conexión`,
  "Se revela el contacto para coordinar",
  "Sin suscripción ni cargos ocultos",
];

/**
 * Sección Precio transparente — honestidad total del modelo de comisión.
 * Explorar y proponer es gratis; solo se paga al concretar una conexión.
 */
export const Pricing = () => (
  <section id="precio" className="aguayo-texture relative bg-cream py-24 sm:py-32">
    <div className="mx-auto max-w-5xl px-5 sm:px-8">
      <SectionHeading
        eyebrow="Precio transparente"
        title={`Gratis para explorar. Bs ${COMMISSION_AMOUNT_BS} solo al conectar.`}
        description="Sin suscripciones ni sorpresas. Pagas únicamente cuando ambas partes deciden concretar un Ayni."
      />

      <div className="mt-14 grid gap-6 md:grid-cols-2">
        {/* Gratis */}
        <Reveal>
          <article className="card-andino flex h-full flex-col rounded-3xl p-8">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-cocoa/5 text-cocoa">
              <Compass size={22} aria-hidden="true" />
            </div>
            <h3 className="mt-5 font-serif text-2xl font-bold text-cocoa">Explorar</h3>
            <p className="mt-1 font-serif text-3xl font-bold text-green">Gratis</p>
            <ul className="mt-6 space-y-3">
              {freeFeatures.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-cocoa/80">
                  <Check size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-green" />
                  <span className="leading-relaxed">{f}</span>
                </li>
              ))}
            </ul>
          </article>
        </Reveal>

        {/* Comisión */}
        <Reveal delay={0.1}>
          <article className="card-andino relative flex h-full flex-col rounded-3xl border-red/35 bg-red/[0.02] p-8">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-red/10 text-red">
              <HandCoins size={22} aria-hidden="true" />
            </div>
            <h3 className="mt-5 font-serif text-2xl font-bold text-cocoa">Conectar</h3>
            <p className="mt-1 font-serif text-3xl font-bold text-red">Bs {COMMISSION_AMOUNT_BS}</p>
            <ul className="mt-6 space-y-3">
              {paidFeatures.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-cocoa/80">
                  <Check size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-red" />
                  <span className="leading-relaxed">{f}</span>
                </li>
              ))}
            </ul>
          </article>
        </Reveal>
      </div>

      <Reveal delay={0.16}>
        <div className="mt-10 flex justify-center">
          <Button as="a" href="/registro" size="lg" className="group">
            Crear cuenta gratis
            <ArrowRight size={18} aria-hidden="true" className="transition-transform group-hover:translate-x-1" />
          </Button>
        </div>
      </Reveal>
    </div>
  </section>
);
```

- [ ] **Step 2: Eliminar BusinessModel.tsx**

```bash
git rm src/components/sections/BusinessModel.tsx
```

> Nota: `page.tsx` aún importa `BusinessModel`; el reemplazo del import se hace en la Task 6. Entre tareas el typecheck podría fallar por el import; por eso esta task NO corre `tsc` aislada del wiring. Continuar a la Task 6 antes de validar tipos del conjunto.

- [ ] **Step 3: Commit**

```bash
git add src/components/sections/Pricing.tsx
git commit -m "feat: sección de precio transparente (gratis vs comisión Bs 20)"
```

---

## Task 5: CTA final → registro (sin waitlist)

**Files:**
- Modify: `src/components/sections/FinalCta.tsx`

**Interfaces:**
- Consumes: `Button`, `ChakanaPattern`, `Reveal`.
- Produces: `export const FinalCta` (Server Component) con CTA a `/registro` y `/login`. Conserva `id="contacto"`.

- [ ] **Step 1: Reescribir FinalCta como bloque de registro**

Reemplazar el contenido completo de `src/components/sections/FinalCta.tsx` por:

```tsx
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChakanaPattern } from "@/components/shared/ChakanaPattern";
import { Reveal } from "@/components/shared/Reveal";

/**
 * CTA final — fondo cocoa con franja tricolor superior. Convierte al registro.
 * Es el ancla #contacto de la navegación.
 */
export const FinalCta = () => (
  <section id="contacto" className="relative overflow-hidden">
    <div aria-hidden="true" className="tricolor-bar h-1.5 w-full" />

    <div className="cocoa-glow grain relative overflow-hidden py-24 sm:py-32">
      <div aria-hidden="true" className="absolute inset-0 text-gold/[0.06]">
        <ChakanaPattern className="h-full w-full" />
      </div>

      <div className="relative mx-auto max-w-3xl px-5 text-center sm:px-8">
        <Reveal>
          <h2 className="font-serif text-4xl font-bold leading-[1.08] tracking-tight text-cream sm:text-5xl">
            Empieza a conectar tu{" "}
            <span className="text-gradient-gold">talento</span>
          </h2>
        </Reveal>

        <Reveal delay={0.08}>
          <p className="mx-auto mt-6 max-w-xl text-lg text-cream/75">
            Crea tu cuenta gratis, explora el marketplace y construye una reputación
            que nadie podrá quitarte.
          </p>
        </Reveal>

        <Reveal delay={0.16}>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button as="a" href="/registro" size="lg" className="group w-full sm:w-auto">
              Crear cuenta gratis
              <ArrowRight size={18} aria-hidden="true" className="transition-transform group-hover:translate-x-1" />
            </Button>
            <Button as="a" href="/login" variant="outline" size="lg" className="w-full sm:w-auto">
              Ya tengo cuenta
            </Button>
          </div>
        </Reveal>

        <Reveal delay={0.24}>
          <p className="mt-5 text-xs text-cream/40">
            Explorar y proponer es gratis. Solo pagas al concretar una conexión.
          </p>
        </Reveal>
      </div>
    </div>
  </section>
);
```

- [ ] **Step 2: Commit**

```bash
git add src/components/sections/FinalCta.tsx
git commit -m "feat: CTA final convierte al registro (elimina waitlist)"
```

---

## Task 6: Recomposición de la home + condensar Audience + verificación final

**Files:**
- Modify: `src/app/(marketing)/page.tsx`
- Modify: `src/components/sections/Audience.tsx`
- Delete: `src/components/sections/Problem.tsx`
- Delete: `src/components/sections/ValueProp.tsx`

**Interfaces:**
- Consumes: `Hero`, `HowItWorks`, `Pricing`, `AynaiScore`, `Audience`, `FinalCta`.
- Produces: home final de 6 secciones.

- [ ] **Step 1: Recomponer page.tsx**

Reemplazar el contenido completo de `src/app/(marketing)/page.tsx` por:

```tsx
import { Hero } from "@/components/sections/Hero";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { Pricing } from "@/components/sections/Pricing";
import { AynaiScore } from "@/components/sections/AynaiScore";
import { Audience } from "@/components/sections/Audience";
import { FinalCta } from "@/components/sections/FinalCta";

/** Landing pública de AynAI. Navbar y Footer viven en el layout de (marketing). */
export default function Home() {
  return (
    <main id="contenido">
      <Hero />
      <HowItWorks />
      <Pricing />
      <AynaiScore />
      <Audience />
      <FinalCta />
    </main>
  );
}
```

- [ ] **Step 2: Condensar Audience**

En `src/components/sections/Audience.tsx`, reemplazar la clase del `<section>`:

```tsx
  <section className="relative bg-cream-200 py-24 sm:py-32">
```

por (padding vertical reducido para un embudo más ágil):

```tsx
  <section className="relative bg-cream-200 py-20 sm:py-24">
```

- [ ] **Step 3: Eliminar las secciones absorbidas**

```bash
git rm src/components/sections/Problem.tsx src/components/sections/ValueProp.tsx
```

- [ ] **Step 4: Verificar que no quedan referencias a lo eliminado**

Run: `grep -rn "Problem\|ValueProp\|BusinessModel" src/ --include=*.tsx --include=*.ts`
Expected: sin resultados que importen o usen esos componentes (puede haber coincidencias no relacionadas con la palabra; verificar que ninguna sea un import de `@/components/sections/Problem|ValueProp|BusinessModel`).

- [ ] **Step 5: Verificar que compila**

Run: `npx tsc --noEmit`
Expected: sin errores nuevos (solo `button.tsx:50`).

- [ ] **Step 6: Verificar el build**

Run: `npm run build`
Expected: build exitoso.

- [ ] **Step 7: Commit**

```bash
git add "src/app/(marketing)/page.tsx" src/components/sections/Audience.tsx
git commit -m "feat: recompone la home a 6 secciones y condensa audiencia"
```

---

## Verificación final (después de todas las tareas)

- [ ] `npx tsc --noEmit` — solo el error preexistente de `button.tsx:50`.
- [ ] `npm run build` — exitoso.
- [ ] **Checklist de accesibilidad (manual, `npm run dev`):**
  - Tecla Tab desde el inicio muestra el skip-link "Saltar al contenido"; Enter salta al `<main>`.
  - Todos los CTAs y enlaces muestran anillo de foco dorado al navegar por teclado.
  - Un solo `<h1>` (en Hero); headings en orden lógico.
  - El monto de comisión que se ve en pantalla es Bs 20 (proveniente de `COMMISSION_AMOUNT_BS`).
  - Contraste AA: texto rojo/verde/cocoa sobre crema legible; no hay texto dorado pequeño sobre fondos claros.
- [ ] **Responsive:** revisar 360px → desktop (Hero, grilla de 4 pasos, precio en 2 columnas).
- [ ] Los CTAs primarios llevan a `/registro` y el secundario de FinalCta a `/login`.

---

## Notas de cierre

- **Fuera de alcance (futuro):** preview de perfiles reales en la home (vitrina viva), planes premium/suscripción, perfiles destacados, A/B testing del copy.
- La tabla `waitlist` de Supabase queda sin uso desde la home (no se elimina; decisión futura).
- Al integrar la rama, usar la skill `superpowers:finishing-a-development-branch`.

# Rediseño de la Home — Conversión a Registro + Estética Profesional + Accesibilidad

**Fecha:** 2026-06-19
**Autor:** Mirko (con Claude Code)
**Estado:** Aprobado — listo para plan de implementación

## Resumen

AynAI dejó de ser un "coming soon" con lista de espera: el producto está vivo (marketplace de habilidades, perfiles, autenticación y comisión de Bs 20 por conexión). Esta home se reestructura para **convertir visitantes en usuarios registrados** que entran al marketplace, comunicando el modelo de negocio con **transparencia total** (explorar es gratis; solo se paga Bs 20 cuando ambas partes concretan un Ayni). El rediseño eleva la estética a un nivel más profesional y trata la **accesibilidad como requisito de primera clase**, sin cambiar el sistema de diseño existente ("editorial andino" / paleta aguayo).

## Objetivos

- **Acción principal:** crear cuenta (`/registro`) y entrar al marketplace.
- **Modelo de ingresos visible:** comisión transparente de Bs 20 por conexión.
- **Estética profesional:** elevar el sistema de diseño actual (más aire, jerarquía tipográfica nítida, color disciplinado, un solo lenguaje de tarjeta).
- **Accesibilidad WCAG AA** en toda la home.

## No-objetivos (fuera de alcance)

- Cambiar el sistema de tokens de color/tipografía (se respeta el existente).
- Tocar marketplace, auth o pagos.
- Preview del feed real en la home (vitrina viva) — iteración futura.
- Planes premium / suscripción — el único ingreso hoy es la comisión.
- Tests unitarios nuevos (componentes presentacionales).

## Dirección estética

Elevar, no reemplazar, el sistema "editorial andino" definido en `src/app/globals.css`.

- **Espaciado y ritmo:** escala vertical consistente (24/32/48/64/96), ancho de lectura ~65ch en párrafos. El lujo percibido viene del espacio en blanco.
- **Tipografía:** Playfair (serif) solo para títulos grandes con tamaños fluidos `clamp()`; cuerpo Hanken (sans) con interlineado ~1.6.
- **Color disciplinado:** cocoa/cream base; **rojo** (`--color-red`) como único color de acción (CTAs); **dorado** solo para detalles decorativos y subrayados, **nunca como texto pequeño** (no pasa contraste AA); verde solo para éxito/confirmación.
- **Profundidad sutil:** bordes `cream-300`, sombras suaves, `rounded-2xl/3xl` consistentes. Un único lenguaje de tarjeta en toda la home.
- **Microinteracciones discretas:** hover/translate suaves, respetando `prefers-reduced-motion` (ya soportado en `globals.css`).

## Accesibilidad (WCAG AA)

- Contraste **AA** en todo el texto; auditar rojo-sobre-crema y eliminar dorado-como-texto pequeño.
- `:focus-visible` con anillo dorado visible en todos los enlaces/botones (global en `globals.css`).
- Landmarks semánticos (`header/main/section/footer`), un solo `<h1>`, jerarquía de headings correcta.
- **Skip-link** "Saltar al contenido" en el layout de `(marketing)`.
- `alt` en imágenes, `aria-label` en iconos decorativos/funcionales, labels reales en formularios.
- Touch targets ≥ 44px; navegación 100% por teclado.

## Estructura de la home (6 secciones)

Pasa de 8 secciones (con waitlist) a 6, con embudo a registro. Orden: gancho → mecánica → honestidad de precio → confianza → identificación → conversión.

| # | Sección | Origen | Cambio |
|---|---------|--------|--------|
| 1 | **Hero** | `Hero` | Mensaje "producto vivo" + CTA doble: **Crear cuenta gratis** (`/registro`) / Ver cómo funciona (ancla `#como-funciona`). Quita el aire de "coming soon". |
| 2 | **Cómo funciona** | `HowItWorks` | 4 pasos incluyendo la comisión: Explora → Propón un Ayni → Acepta → **Paga Bs 20 y conecta**. |
| 3 | **Precio transparente** | `BusinessModel` (reenfocada) | Honestidad: explorar y proponer es **gratis**; solo **Bs 20 cuando ambos concretan**. Sin suscripción, sin sorpresas. |
| 4 | **AynaiScore** | `AynaiScore` | Se mantiene: reputación verificable = confianza. Diferenciador. |
| 5 | **Para quién es** | `Audience` (condensada) | Versión compacta de la audiencia. |
| 6 | **CTA final** | `FinalCta` (reconvertida) | Deja de ser waitlist → bloque de **registro** ("Crea tu cuenta gratis", `/registro`). El email/waitlist se elimina como acción principal. |

**Fusiones/retiros:** `Problem` y `ValueProp` se absorben en Hero y "Cómo funciona" (hoy se solapan y alargan el embudo). Sus archivos se **eliminan** para no dejar código muerto.

## Enfoque técnico

- La home sigue siendo `src/app/(marketing)/page.tsx` (Server Component) que compone secciones de `src/components/sections/`.
- **Reescribir:** `Hero`, `HowItWorks`, `FinalCta` (→ registro), `BusinessModel` (→ "Precio transparente"), `Audience` (condensada).
- **Eliminar de la home y del repo:** `Problem.tsx`, `ValueProp.tsx`.
- **Precio:** importar `COMMISSION_AMOUNT_BS` desde `src/lib/payments/constants.ts`. Nunca hardcodear "20" en el copy.
- **CTAs:** `Button` existente con `as="a"` → `/registro` (primario) y `/login` (secundario donde aplique). Rutas confirmadas: `src/app/(auth)/registro/page.tsx`, `src/app/(auth)/login/page.tsx`.
- **Accesibilidad transversal:** skip-link en el layout de `(marketing)`; `:focus-visible` global y auditoría de contraste en `globals.css`; landmarks/headings.
- **Sin dependencias nuevas:** Tailwind 4, lucide-react, Framer Motion (ya instalados).

## Componentes y responsabilidades

- `(marketing)/page.tsx` — compone las 6 secciones, en orden. Sin lógica.
- `Hero` — gancho + CTA doble. Sin estado (los CTAs son enlaces).
- `HowItWorks` — 4 pasos; el paso 4 usa `COMMISSION_AMOUNT_BS`.
- `Pricing` — archivo renombrado de `BusinessModel.tsx` a `Pricing.tsx` (export `Pricing`); explica gratis vs Bs 20; usa `COMMISSION_AMOUNT_BS`.
- `AynaiScore` — sin cambios funcionales; pasa auditoría a11y/estética.
- `Audience` — condensada.
- `FinalCta` — bloque de registro (CTA a `/registro`); se elimina el form de waitlist como acción principal.
- Layout `(marketing)` — añade skip-link y `id="contenido"` en `<main>`.

## Manejo de errores

No aplica lógica de datos (componentes presentacionales y enlaces estáticos). El antiguo `FinalCta` insertaba en `waitlist`; al reconvertir a registro se elimina esa llamada a Supabase de la home.

## Verificación

- `npx tsc --noEmit` — sin errores nuevos (línea base: `src/components/ui/button.tsx:50`).
- `npm run build` — pasa.
- **Accesibilidad (checklist manual):** navegación por teclado completa, foco visible, contraste AA (rojo-sobre-crema y textos), skip-link funcional, un solo `<h1>`, headings en orden, `alt`/`aria-label` presentes.
- **Responsive:** 360px → desktop.
- Sin tests unitarios nuevos (opcional: smoke test de render del Hero).

## Notas de cierre

- Iteraciones futuras: preview de perfiles reales en la home (vitrina viva), planes premium/suscripción, perfiles destacados.
- Al integrar la rama, usar `superpowers:finishing-a-development-branch`.

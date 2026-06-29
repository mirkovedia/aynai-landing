# AynAI — Marketplace MVP con Matching Bilateral
**Fecha:** 2026-06-28  
**Estado:** Aprobado — en implementación

---

## Objetivo

Transformar el marketplace de un feed genérico ordenado por score a un sistema de matching bilateral real: el usuario ve primero a las personas que complementan sus habilidades exactas. El dashboard pasa de pantalla de datos a home personalizado con widgets accionables.

---

## Decisiones de diseño aprobadas

### 1. Algoritmo de matching

**perfectMatch**: ellos ofrecen algo que yo busco AND ellos buscan algo que yo ofrezco.  
**partialMatch**: ellos ofrecen algo que yo busco (pero no necesariamente me buscan).  
**rest**: todos los demás, ordenados por ayni_score DESC.

Comparación case-insensitive con trim. Sin matching semántico (fase 2).  
Clasificación en JS sobre la respuesta de `listProfiles()` — escalable a Postgres cuando haya miles de usuarios.

```typescript
// lib/marketplace/matching.ts
getMatchedFeed(myOffers, mySeeks, excludeId)
  → { perfect: SearchResult[], partial: SearchResult[], rest: SearchResult[] }
```

Edge cases:
- Sin skills "offer" → no hay perfectMatch como emisor → solo resto
- Sin skills "seek" → no hay partialMatch → solo resto
- Ambos vacíos → feed sin secciones de match, CTA a completar perfil

### 2. Marketplace — dos secciones

```
┌─ Matches para vos ──────────────────────────┐
│  [✦ Match perfecto]  María — Diseño UX      │
│  [◆ Match parcial]   Juan — Fotografía      │
└─────────────────────────────────────────────┘
┌─ Otras personas ────────────────────────────┐
│  Carlos · Ana · Roberto…                    │
└─────────────────────────────────────────────┘
```

- Matches perfectos primero (badge dorado ✦), parciales después (badge ◆)
- Si hay búsqueda activa → search override, sin secciones (comportamiento actual)
- Si usuario sin skills → banner "Agrega habilidades para ver tus matches"

### 3. Dashboard renovado (Hub + Spoke)

Login → Dashboard con 3 widgets:

**Widget 1 — Tus matches** (top 3 del getMatchedFeed, perfectos primero)  
**Widget 2 — Intercambios activos** (pending + accepted con nombre de contraparte)  
**Widget 3 — AynAI Score** (breakdown existente, sin cambios)

Si perfil incompleto → banner onboarding dismissable encima de los widgets.

Layout desktop: grid 2 cols (matches grande izq + score chico der), intercambios abajo.  
Layout mobile: stack vertical, matches primero.

### 4. WhatsApp como contacto principal

- Nuevo campo `whatsapp` en `ProfileLinks` (string, formato: `591XXXXXXXX`)
- Campo opcional en el perfil, pero recomendado fuertemente (tooltip explicativo)
- Post-pago de comisión: revela `wa.me/{whatsapp}` con botón "Abrir WhatsApp"
- Fallback: si no tiene WhatsApp → links existentes (web, LinkedIn, GitHub)
- El campo whatsapp NO se expone en el feed del marketplace (solo post-pago)

---

## Archivos a crear/modificar

### Nuevos
- `supabase/migrations/0009_whatsapp.sql` — columna whatsapp en profiles
- `src/lib/marketplace/matching.ts` — algoritmo bilateral
- `src/components/features/marketplace/MatchSection.tsx` — sección con badge
- `src/components/features/marketplace/MatchCard.tsx` — tarjeta con indicador de match
- `src/components/features/dashboard/MatchesPreview.tsx` — widget matches
- `src/components/features/dashboard/ActiveExchanges.tsx` — widget intercambios
- `src/components/features/dashboard/ScoreWidget.tsx` — widget score

### Modificados
- `src/types/database.ts` — agregar `whatsapp` a ProfileLinks
- `src/app/(dashboard)/dashboard/page.tsx` — 3 widgets + queries
- `src/app/(dashboard)/marketplace/page.tsx` — 2 secciones + matching
- `src/components/features/marketplace/ExchangeRequestCard.tsx` — revelar WhatsApp post-pago
- `src/components/features/profile/ProfileForm.tsx` — campo WhatsApp
- `src/lib/marketplace/search.ts` — no cambia la función, se reutiliza

---

## Fuera de scope (Fase 2)

- Chat interno entre usuarios
- Matching semántico con IA (Claude API)
- Filtros por categoría de skill
- Paginación infinita del feed

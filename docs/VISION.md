# AynAI — Visión y Arquitectura (Norte del proyecto)

> **Documento vivo.** Es la estrella polar a la que volvemos en cada decisión.
> Última actualización: 2026-06-16.

## Qué es AynAI

**El LinkedIn + Mercado Pago del talento, con una reputación que nadie puede falsificar.**

AynAI es un marketplace de habilidades donde las personas intercambian talento y
construyen una reputación verificable que les pertenece de verdad. Nace de un
principio andino: el **Ayni** (reciprocidad) y el **Ayllu** (comunidad).

Es un producto **para todos los públicos** — no exige saber qué es Web3 — pero por
debajo corre sobre infraestructura on-chain que lo hace transparente y a prueba de
fraude.

## Los tres pilares

1. **Marketplace de habilidades** — ofrecés/buscás skills, hacés intercambios (Ayni).
2. **AynAI Score** — reputación verificable: IA (Claude) + señales on-chain → un
   puntaje *soulbound* (no transferible, es tuyo).
3. **Ayllu Pools** — ahorro colaborativo tipo pasanaku/ROSCA on-chain ("sin bancos").

## Principio rector de UX: Decentralización progresiva

El usuario promedio **no sabe ni necesita saber** qué es una wallet. Por eso:

- **Por defecto:** se registra con email/Google y recibe una **wallet embebida
  invisible**. Su reputación vive on-chain sin que él vea jamás una frase semilla.
- **Opcional (avanzados):** puede **conectar su propia wallet** (MetaMask, etc.). Esto
  además funciona como **señal de seguridad y seriedad** para el público cripto: ven
  que el sitio es real y verificable on-chain.

> Esta es "la mezcla loca" bien hecha: UX de Web2, garantías de Web3. Empezamos con la
> mejor experiencia posible y dejamos una puerta abierta a la verificación total.

## Stack profesional

### Capa Web2 (núcleo del producto)
| Área | Tecnología |
|---|---|
| Monorepo | Turborepo (`apps/`, `packages/`) |
| Frontend | Next.js 15 (App Router) + TypeScript strict |
| UI | shadcn/ui + Tailwind 4 + Framer Motion (paleta boliviana actual) |
| DB / Auth | Supabase (Postgres + Auth + Storage + Realtime) + Drizzle ORM |
| Server state | TanStack Query |
| Validación | Zod en todos los boundaries |
| Pagos fiat | Stripe (suscripciones SaaS + pasarela local Bs) |
| Email | Resend (transaccional) |

### Capa Web3 (la magia, escondida)
| Área | Tecnología |
|---|---|
| Chain | Avalanche C-Chain (Fuji testnet → mainnet) |
| Contratos | Solidity ^0.8.20 + OpenZeppelin + Foundry |
| Wallet UX | **Híbrida:** embebida (Privy o thirdweb) + conexión propia (wagmi/viem + RainbowKit) |
| Indexado | Subgraph (The Graph) o indexer en Supabase para eventos on-chain |

### Capa IA (AynAI Score)
- Anthropic Claude API con structured outputs → motor de scoring que combina señales
  on-chain y off-chain en un puntaje explicable.

### Contratos clave
- `AyniScore.sol` — reputación *soulbound* (SBT, ERC-5192): no transferible.
- `SkillEscrow.sol` — escrow para intercambios de habilidades (protege a ambas partes).
- `AylluPool.sol` — pools de ahorro rotativo (pasanaku on-chain).

## Estructura del monorepo (objetivo)

```
aynai/
├── apps/
│   ├── web/            # Next.js (landing + app SaaS) — evoluciona del repo actual
│   └── contracts/      # Foundry: AyniScore, SkillEscrow, AylluPool
├── packages/
│   ├── ui/             # Design system compartido (shadcn + marca AynAI)
│   ├── db/             # Esquema Drizzle + tipos Supabase
│   ├── web3/           # ABIs, hooks wagmi, config de wallets
│   └── config/         # tsconfig, eslint, tailwind compartidos
└── turbo.json
```

## Roadmap por fases

- **Fase 0 ✅ (hecha):** landing + auth (email/password + Google) + waitlist en Supabase.
  Desplegada en producción (Vercel).
- **Fase 1 — Núcleo SaaS:** migrar a monorepo · perfiles ricos · **marketplace MVP**
  (publicar/buscar habilidades, matching) · wallets embebidas + conexión híbrida ·
  AynAI Score v1 (IA, mock on-chain).
- **Fase 2 — On-chain:** `AyniScore` SBT + `SkillEscrow` en Fuji testnet, conectados al
  perfil. Indexado de eventos.
- **Fase 3 — Economía:** Ayllu Pools · billing Stripe · reputación avanzada · i18n ·
  PWA móvil · panel admin.

## Decisiones tomadas (ADR resumido)

| # | Decisión | Razón |
|---|---|---|
| 1 | Wallet **híbrida** (embebida + propia) | Inclusión total + señal de seguridad para cripto-nativos |
| 2 | **Monorepo Turborepo** | Web, contratos, UI y tipos compartidos sin duplicar |
| 3 | **Avalanche C-Chain** | Rápida, barata, alineada al ecosistema del proyecto |
| 4 | Fase 1 = **Perfiles + Marketplace MVP** | Es lo que hace que "se vea SaaS" cuanto antes |
| 5 | Reputación **soulbound (SBT)** | La reputación no se compra ni se transfiere: es tuya |

## Fuera de alcance (por ahora)

Token propio / tokenomics · DAO de gobernanza · mainnet · app móvil nativa.
Se evalúan recién después de validar Fases 1–2.

# AynAI — Landing Page

Landing page moderna, responsive y con raíz cultural andina boliviana para **AynAI**, el marketplace de habilidades con reputación verificable on-chain.

> _"Tu talento vale. Demuéstralo."_

---

## ✨ Características

- **Next.js 15** (App Router) + **TypeScript** en modo estricto
- **Tailwind CSS v4** con sistema de diseño basado en variables CSS
- **Framer Motion** para animaciones sutiles al hacer scroll (fade-in / slide-up)
- **lucide-react** para iconografía
- Identidad visual andina: paleta del aguayo boliviano, franjas tricolor y patrón geométrico tipo chakana
- 100% responsive (mobile-first) y accesible (semántica HTML, contraste, `prefers-reduced-motion`)
- Optimizada para performance y lista para desplegar en **Vercel**

---

## 🎨 Identidad visual

| Color              | Hex       | Uso                                  |
| ------------------ | --------- | ------------------------------------ |
| Marrón profundo    | `#1A0A00` | Fondos oscuros, texto fuerte         |
| Rojo boliviano     | `#D52B1E` | Acentos, CTAs                        |
| Dorado             | `#F4C430` | Highlights, detalles                 |
| Verde boliviano    | `#007A3D` | Éxito, confirmaciones                |
| Crema              | `#F9F5EE` | Fondo claro                          |

- **Títulos:** Playfair Display (serif editorial de alto contraste)
- **Cuerpo:** Hanken Grotesk (sans-serif limpia y caracterful)

---

## 📂 Estructura del proyecto

```
src/
├── app/
│   ├── layout.tsx          # Layout raíz: fuentes, metadata SEO
│   ├── page.tsx            # Ensamblado de secciones
│   └── globals.css         # Sistema de diseño (Tailwind v4 + utilidades de marca)
├── components/
│   ├── ui/
│   │   └── button.tsx      # Botón polimórfico estilo shadcn/ui
│   ├── layout/
│   │   ├── Navbar.tsx      # Navegación sticky + menú móvil
│   │   └── Footer.tsx      # Pie con créditos y "Hecho en Bolivia"
│   ├── sections/           # Las 10 secciones de la landing
│   │   ├── Hero.tsx
│   │   ├── Problem.tsx
│   │   ├── HowItWorks.tsx
│   │   ├── ValueProp.tsx
│   │   ├── AynaiScore.tsx
│   │   ├── Audience.tsx
│   │   ├── BusinessModel.tsx   # Sección reservada para el BMC
│   │   └── FinalCta.tsx
│   └── shared/             # Reveal (animación), TricolorStripe, ChakanaPattern, SectionHeading
├── constants/
│   └── content.ts          # Todo el contenido textual centralizado
└── lib/
    └── utils.ts            # Helper `cn` para clases condicionales
```

---

## 🚀 Instalación y desarrollo

Requisitos: **Node.js 18.18+** (recomendado 20+).

```bash
# 1. Instalar dependencias
npm install

# 2. Levantar el servidor de desarrollo
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

### Otros comandos

```bash
npm run build    # Compila para producción
npm run start    # Sirve el build de producción
npm run lint     # Ejecuta ESLint
```

---

## ▲ Deploy en Vercel

La forma más rápida de publicar:

1. Sube el repositorio a GitHub/GitLab/Bitbucket.
2. Entra a [vercel.com/new](https://vercel.com/new) e importa el repo.
3. Vercel detecta Next.js automáticamente — no necesitas configurar nada.
4. Pulsa **Deploy**. Listo. ✅

### Deploy por CLI (alternativa)

```bash
npm i -g vercel
vercel          # Despliegue de preview
vercel --prod   # Despliegue a producción
```

No se requieren variables de entorno: el formulario de email es solo visual por ahora.

---

## 🧩 Secciones

1. **Navbar** sticky con logo y pestaña _Modelo de Negocio_ (BMC)
2. **Hero** — propuesta principal con animación de entrada
3. **Problema** — las grietas de los marketplaces actuales
4. **Cómo funciona** — 3 pasos: publica, intercambia, gana reputación
5. **Propuesta de valor** — diferenciadores + comparativa vs Fiverr/Upwork
6. **AynAI Score** — el CV verificable on-chain (sección destacada)
7. **Para quién es** — freelancers, estudiantes, sin banco, empresas
8. **Modelo de Negocio (BMC)** — espacio reservado para el Business Model Canvas
9. **CTA final** — captura de email con franja tricolor
10. **Footer** — créditos del proyecto universitario · _Hecho en Bolivia 🇧🇴_

---

## 📝 Notas

- El **Business Model Canvas** está como placeholder estilizado (`BusinessModel.tsx`), listo para incrustar el contenido real más adelante.
- El campo de email del CTA valida visualmente pero aún no envía a un backend.
- Todas las animaciones respetan `prefers-reduced-motion` para accesibilidad.

---

_Proyecto universitario · Reciprocidad · Confianza · Talento_

/**
 * Contenido centralizado de la landing de AynAI.
 * Mantener los textos aquí facilita su edición sin tocar los componentes.
 */

import type { LucideIcon } from "lucide-react";
import {
  ShieldOff,
  Banknote,
  UserX,
  Megaphone,
  Repeat,
  Award,
  Users,
  GraduationCap,
  Landmark,
  Building2,
  Handshake,
  Activity,
  Wrench,
  Heart,
  Compass,
  Coins,
  TrendingUp,
  HandCoins,
} from "lucide-react";

import { COMMISSION_AMOUNT_BS } from "@/lib/payments/constants";

export const NAV_LINKS = [
  { label: "Inicio", href: "#inicio" },
  { label: "Cómo funciona", href: "#como-funciona" },
  { label: "Modelo de Negocio", href: "#modelo-de-negocio" },
  { label: "Contacto", href: "#contacto" },
] as const;

export interface FeatureItem {
  icon: LucideIcon;
  title: string;
  description: string;
}

/** Sección 3 — Problema */
export const PROBLEMS: FeatureItem[] = [
  {
    icon: ShieldOff,
    title: "Reputación manipulable",
    description: "Las reseñas se compran y se falsifican. Nadie sabe en quién confiar de verdad.",
  },
  {
    icon: Banknote,
    title: "Exclusión económica",
    description: "Sin tarjeta ni banco, quedas fuera. El talento no debería depender de un plástico.",
  },
  {
    icon: UserX,
    title: "Tu historial no es tuyo",
    description: "Si la plataforma te banea, pierdes todo lo que construiste. Empiezas de cero.",
  },
];

export interface StepItem {
  number: string;
  icon: LucideIcon;
  title: string;
  description: string;
}

/** Sección 4 — Cómo funciona */
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

export interface AudienceItem {
  icon: LucideIcon;
  title: string;
  description: string;
}

/** Sección 7 — Para quién es */
export const AUDIENCES: AudienceItem[] = [
  {
    icon: Users,
    title: "Freelancers",
    description: "Construye una reputación portátil que va contigo a cualquier plataforma.",
  },
  {
    icon: GraduationCap,
    title: "Estudiantes",
    description: "Convierte tus primeras prácticas en un historial verificable desde el día uno.",
  },
  {
    icon: Landmark,
    title: "Sin acceso bancario",
    description: "Participa en la economía del talento sin necesidad de tarjeta ni cuenta bancaria.",
  },
  {
    icon: Building2,
    title: "Empresas",
    description: "Contrata talento con reputación comprobable, no con promesas sin respaldo.",
  },
];

/** Sección 5 — Comparativa de comisiones */
export const COMPARISON = {
  aynai: {
    name: "AynAI",
    fee: "10–15%",
    points: [
      { label: "Matching con IA", value: true },
      { label: "Reputación verificable on-chain", value: true },
      { label: "Funciona sin banco ni tarjeta", value: true },
      { label: "Tu historial te pertenece", value: true },
      { label: "Intercambio por trueque", value: true },
    ],
  },
  others: {
    name: "Fiverr / Upwork",
    fee: "20–32%",
    points: [
      { label: "Matching con IA", value: false },
      { label: "Reputación verificable on-chain", value: false },
      { label: "Funciona sin banco ni tarjeta", value: false },
      { label: "Tu historial te pertenece", value: false },
      { label: "Intercambio por trueque", value: false },
    ],
  },
} as const;

export interface BmcBlock {
  id: string;
  title: string;
  icon: LucideIcon;
  description: string;
  items: string[];
}

export const BMC_DATA: BmcBlock[] = [
  {
    id: "socios",
    title: "Socios Clave",
    icon: Handshake,
    description: "Alianzas estratégicas para fortalecer el ecosistema de AynAI, reducir costos de transacción y potenciar el alcance.",
    items: [
      "Proveedores de infraestructura Web3 (Blockchains Layer 2 de bajo costo)",
      "Universidades e institutos técnicos de Bolivia (semillero de talento joven)",
      "Comunidades locales y cooperativas enfocadas en economía colaborativa y trueque",
      "Procesadores de pagos alternativos y pasarelas de criptoactivos estables"
    ]
  },
  {
    id: "actividades",
    title: "Actividades Clave",
    icon: Activity,
    description: "Acciones operativas indispensables para que el producto funcione de manera segura, escalable y automatizada.",
    items: [
      "Desarrollo continuo de la plataforma web/móvil y su seguridad",
      "Optimización del algoritmo de Matching por Inteligencia Artificial",
      "Moderación de disputas y mantenimiento del contrato inteligente de reputación",
      "Campañas de educación digital y marketing de adquisición de usuarios"
    ]
  },
  {
    id: "recursos",
    title: "Recursos Clave",
    icon: Wrench,
    description: "Activos tecnológicos, humanos e intelectuales fundamentales para sostener y operar el modelo AynAI.",
    items: [
      "Algoritmo propietario de Matching IA para la conexión de habilidades",
      "Contrato inteligente y base de datos descentralizada del AynAI Score",
      "Equipo de desarrollo tecnológico, soporte y moderadores",
      "Ecosistema de usuarios activos y comunidad de validación"
    ]
  },
  {
    id: "propuesta",
    title: "Propuesta de Valor",
    icon: Award,
    description: "Qué nos hace únicos: reputación inalterable, comisiones ultra bajas, inclusión para los no bancarizados y trueque.",
    items: [
      "AynAI Score: Reputación portable, inalterable y de tu propiedad (on-chain)",
      "Conexión instantánea y eficiente mediante inteligencia artificial",
      "Comisión justa y baja (10-15%) frente al 20-30% de la competencia",
      "Inclusión total: Opera con o sin cuenta bancaria (criptomonedas/trueques)"
    ]
  },
  {
    id: "relaciones",
    title: "Relación con Clientes",
    icon: Heart,
    description: "La manera en la que interactuamos con nuestra comunidad para garantizar su retención, confianza y lealtad.",
    items: [
      "Plataforma self-service automatizada con guías interactivas de IA",
      "Soporte comunitario peer-to-peer y resolución transparente de disputas",
      "Gobernanza basada en reputación (los usuarios de alto score son moderadores)",
      "Transparencia absoluta en comisiones y uso de datos"
    ]
  },
  {
    id: "canales",
    title: "Canales",
    icon: Compass,
    description: "Los medios a través de los cuales entregamos nuestra propuesta de valor y nos comunicamos con los segmentos.",
    items: [
      "Aplicación web y móvil oficial de AynAI",
      "Redes sociales y comunidades de freelancers en línea",
      "Campus universitarios y eventos tecnológicos locales en Bolivia",
      "Mecanismo de referidos de boca en boca dentro de comunidades locales"
    ]
  },
  {
    id: "segmentos",
    title: "Segmentos de Clientes",
    icon: Users,
    description: "Los usuarios a quienes ayudamos de manera prioritaria a resolver sus necesidades laborales y de confianza.",
    items: [
      "Freelancers excluidos del sistema bancario tradicional",
      "Estudiantes universitarios que buscan crear su primer historial laboral verificado",
      "Emprendedores y PyMEs que buscan talento de confianza sin altas tarifas",
      "Comunidades locales interesadas en el trueque y economía de reciprocidad"
    ]
  },
  {
    id: "costos",
    title: "Estructura de Costos",
    icon: Coins,
    description: "Los egresos financieros necesarios para mantener en marcha la infraestructura, desarrollo y adquisición de AynAI.",
    items: [
      "Infraestructura tecnológica en la nube (hosting, APIs, IA y bases de datos)",
      "Salarios del equipo de desarrollo, diseño y soporte al cliente",
      "Costos de marketing digital, publicidad y eventos en universidades",
      "Tarjetas de gas en la blockchain L2 para subsidiar transacciones de reputación"
    ]
  },
  {
    id: "ingresos",
    title: "Fuentes de Ingreso",
    icon: TrendingUp,
    description: "Los flujos monetarios que garantizan la sostenibilidad económica a largo plazo de AynAI.",
    items: [
      "Comisión transaccional del 10% al 15% en contratos cerrados con éxito",
      "Suscripción premium para empresas (herramientas de búsqueda y filtrado avanzado)",
      "Tarifa por verificación oficial y emisión física/portable del AynAI Score",
      "Intereses generados por depósitos en garantía (escrow) en stablecoins"
    ]
  }
];

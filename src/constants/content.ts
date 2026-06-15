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
} from "lucide-react";

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
    title: "Publica tu habilidad",
    description: "Describe lo que sabes hacer y la IA te conecta con quien lo necesita, al instante.",
  },
  {
    number: "02",
    icon: Repeat,
    title: "Intercambia o cobra",
    description: "Con dinero o por trueque de habilidades. Tú decides cómo cierras cada trato.",
  },
  {
    number: "03",
    icon: Award,
    title: "Gana reputación on-chain",
    description: "Cada trabajo suma a tu AynAI Score. Es tuyo para siempre, nadie puede borrarlo.",
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

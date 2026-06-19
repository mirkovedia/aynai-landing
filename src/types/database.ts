export type SkillKind = "offer" | "seek";
export type SkillLevel = "basico" | "intermedio" | "experto";
export type Availability = "available" | "busy" | "unavailable";

/** Links sociales/portfolio del perfil (guardados como jsonb). */
export interface ProfileLinks {
  web?: string;
  linkedin?: string;
  github?: string;
  x?: string;
}

/** Fila de la tabla profiles. */
export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  ayni_score: number;
  bio: string | null;
  /** Campo legado (text[]); la UI usa user_skills. */
  skills: string[];
  location: string | null;
  username: string | null;
  avatar_url: string | null;
  availability: Availability;
  modality: string | null;
  links: ProfileLinks;
  created_at: string;
}

/** Fila de la tabla user_skills (ofrezco/busco). */
export interface UserSkill {
  id: string;
  user_id: string;
  name: string;
  kind: SkillKind;
  category: string | null;
  level: SkillLevel | null;
  created_at: string;
}

/** Fila de la tabla waitlist. */
export interface WaitlistEntry {
  id: string;
  email: string;
  created_at: string;
}

/** Estado de una solicitud de intercambio. */
export type ExchangeStatus = "pending" | "accepted" | "rejected" | "cancelled";

/** Fila de la tabla exchange_requests. */
export interface ExchangeRequest {
  id: string;
  requester_id: string;
  recipient_id: string;
  offer_skill: string;
  want_skill: string;
  message: string | null;
  status: ExchangeStatus;
  created_at: string;
  updated_at: string;
}

/** Estado de un pago de comisión. */
export type PaymentStatus = "pending" | "paid" | "failed";

/** Fila de la tabla commission_payments (una por parte por intercambio). */
export interface CommissionPayment {
  id: string;
  exchange_request_id: string;
  payer_id: string;
  amount_bs: number;
  status: PaymentStatus;
  provider: string;
  provider_ref: string | null;
  qr_payload: string | null;
  created_at: string;
  paid_at: string | null;
}

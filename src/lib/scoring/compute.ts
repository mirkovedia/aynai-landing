/** Entrada cruda para calcular el AynAI Score de un usuario. */
export interface ScoreInput {
  /** Promedio de estrellas recibidas (null si no tiene ratings). */
  avgStars: number | null;
  /** Cantidad de ratings recibidos. */
  ratingCount: number;
  /** Intercambios completados. */
  completedCount: number;
  /** Intercambios que llegaron al menos a 'accepted' (accepted + completed). */
  acceptedOrMore: number;
  /** Ítems de perfil completos (0–5). */
  profileItems: number;
}

/** Desglose explicable del score. */
export interface ScoreResult {
  total: number;
  factors: {
    reputation: number;
    volume: number;
    reliability: number;
    profile: number;
  };
}

const VOLUME_CAP = 20;

/**
 * Calcula el AynAI Score (0–1000) con desglose por factor.
 * Arranque neutro: sin ratings NI intercambios completados → 600.
 * Espejo de la función SQL recalc_ayni_score (deben mantenerse en sincronía).
 */
export const computeAyniScore = (input: ScoreInput): ScoreResult => {
  const { avgStars, ratingCount, completedCount, acceptedOrMore, profileItems } = input;

  if (ratingCount === 0 && completedCount === 0) {
    return { total: 600, factors: { reputation: 0, volume: 0, reliability: 0, profile: 0 } };
  }

  const reputation = ((avgStars ?? 3) / 5) * 500;
  const volume = Math.min(Math.log(1 + completedCount) / Math.log(1 + VOLUME_CAP), 1) * 250;
  const reliability = acceptedOrMore > 0 ? (completedCount / acceptedOrMore) * 150 : 0;
  const profile = Math.min(Math.max(profileItems, 0), 5) * 20;

  const round = (n: number) => Math.round(n);
  const factors = {
    reputation: round(reputation),
    volume: round(volume),
    reliability: round(reliability),
    profile: round(profile),
  };
  const total = Math.min(factors.reputation + factors.volume + factors.reliability + factors.profile, 1000);

  return { total, factors };
};

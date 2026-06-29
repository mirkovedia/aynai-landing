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

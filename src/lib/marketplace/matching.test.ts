import { describe, it, expect } from "vitest";
import { classifyMatches } from "@/lib/marketplace/matching";
import type { SearchResult } from "@/lib/marketplace/search";
import type { PublicProfile } from "@/components/features/profile/ProfileCard";
import type { UserSkill } from "@/types/database";

const makeProfile = (id: string): PublicProfile => ({
  id,
  full_name: `Usuario ${id}`,
  ayni_score: 600,
  bio: null,
  skills: [],
  location: null,
  username: id,
  avatar_url: null,
  availability: "available",
  modality: null,
  links: {},
  created_at: new Date().toISOString(),
});

const makeSkill = (userId: string, name: string, kind: "offer" | "seek"): UserSkill => ({
  id: `${userId}-${name}-${kind}`,
  user_id: userId,
  name,
  kind,
  category: null,
  level: null,
  created_at: new Date().toISOString(),
});

const makeResult = (
  id: string,
  offers: string[],
  seeks: string[],
  score = 600
): SearchResult => ({
  profile: { ...makeProfile(id), ayni_score: score },
  skills: [
    ...offers.map((n) => makeSkill(id, n, "offer")),
    ...seeks.map((n) => makeSkill(id, n, "seek")),
  ],
});

describe("classifyMatches", () => {
  it("match perfecto cuando hay cruce bilateral", () => {
    // Yo ofrezco "Desarrollo web" y busco "Diseño UX"
    // María ofrece "Diseño UX" y busca "Desarrollo web"
    const maria = makeResult("maria", ["Diseño UX"], ["Desarrollo web"]);
    const { perfect, partial, rest } = classifyMatches([maria], ["Desarrollo web"], ["Diseño UX"]);
    expect(perfect).toHaveLength(1);
    expect(perfect[0].profile.id).toBe("maria");
    expect(partial).toHaveLength(0);
    expect(rest).toHaveLength(0);
  });

  it("match parcial cuando ellos ofrecen lo que yo busco pero no me buscan", () => {
    // Yo busco "Fotografía"; Juan ofrece "Fotografía" pero busca "Marketing" (no lo que yo ofrezco)
    const juan = makeResult("juan", ["Fotografía"], ["Marketing"]);
    const { perfect, partial, rest } = classifyMatches([juan], ["Desarrollo web"], ["Fotografía"]);
    expect(perfect).toHaveLength(0);
    expect(partial).toHaveLength(1);
    expect(partial[0].profile.id).toBe("juan");
    expect(rest).toHaveLength(0);
  });

  it("resto cuando no hay overlap de ningún tipo", () => {
    const ana = makeResult("ana", ["Contabilidad"], ["Legal"]);
    const { perfect, partial, rest } = classifyMatches([ana], ["Desarrollo web"], ["Diseño UX"]);
    expect(perfect).toHaveLength(0);
    expect(partial).toHaveLength(0);
    expect(rest).toHaveLength(1);
  });

  it("comparación case-insensitive y trim", () => {
    const carlos = makeResult("carlos", ["  Diseño UX  "], ["Desarrollo Web"]);
    const { perfect } = classifyMatches([carlos], ["desarrollo web"], ["diseño ux"]);
    expect(perfect).toHaveLength(1);
  });

  it("sin mySeeks → nadie es match (parcial ni perfecto)", () => {
    const maria = makeResult("maria", ["Diseño UX"], ["Desarrollo web"]);
    const { perfect, partial, rest } = classifyMatches([maria], ["Desarrollo web"], []);
    expect(perfect).toHaveLength(0);
    expect(partial).toHaveLength(0);
    expect(rest).toHaveLength(1);
  });

  it("sin myOffers → puede haber parcial pero nunca perfecto", () => {
    const maria = makeResult("maria", ["Diseño UX"], []);
    const { perfect, partial } = classifyMatches([maria], [], ["Diseño UX"]);
    expect(perfect).toHaveLength(0);
    expect(partial).toHaveLength(1);
  });

  it("ordena cada bucket por ayni_score descendente", () => {
    const bajo = makeResult("bajo", [], [], 400);
    const alto = makeResult("alto", [], [], 800);
    const { rest } = classifyMatches([bajo, alto], ["X"], ["Y"]);
    expect(rest[0].profile.ayni_score).toBe(800);
    expect(rest[1].profile.ayni_score).toBe(400);
  });

  it("lista vacía devuelve tres buckets vacíos", () => {
    const { perfect, partial, rest } = classifyMatches([], ["X"], ["Y"]);
    expect(perfect).toHaveLength(0);
    expect(partial).toHaveLength(0);
    expect(rest).toHaveLength(0);
  });
});

import { describe, it, expect } from "vitest";
import { profileSchema } from "@/lib/profile/schema";

const valid = {
  username: "mirko_01",
  full_name: "Mirko Barón",
  bio: "Diseñador y dev",
  location: "La Paz",
  availability: "available",
  modality: "remoto",
  links: { github: "https://github.com/mirko" },
  skills: [
    { name: "Diseño UI", kind: "offer", level: "experto" },
    { name: "Marketing", kind: "seek" },
  ],
};

describe("profileSchema", () => {
  it("acepta un perfil válido", () => {
    expect(profileSchema.safeParse(valid).success).toBe(true);
  });

  it("rechaza username con mayúsculas o símbolos", () => {
    expect(profileSchema.safeParse({ ...valid, username: "Mirko!" }).success).toBe(false);
  });

  it("rechaza username demasiado corto", () => {
    expect(profileSchema.safeParse({ ...valid, username: "ab" }).success).toBe(false);
  });

  it("rechaza un link que no es URL", () => {
    expect(
      profileSchema.safeParse({ ...valid, links: { web: "no-es-url" } }).success
    ).toBe(false);
  });

  it("rechaza un kind de skill inválido", () => {
    expect(
      profileSchema.safeParse({ ...valid, skills: [{ name: "X", kind: "trade" }] }).success
    ).toBe(false);
  });

  it("rechaza más de 30 skills", () => {
    const skills = Array.from({ length: 31 }, (_, i) => ({ name: `s${i}`, kind: "offer" }));
    expect(profileSchema.safeParse({ ...valid, skills }).success).toBe(false);
  });

  it("acepta links y campos opcionales vacíos", () => {
    const r = profileSchema.safeParse({
      username: "abc",
      full_name: "Ab Cd",
      availability: "unavailable",
      links: {},
      skills: [],
    });
    expect(r.success).toBe(true);
  });
});

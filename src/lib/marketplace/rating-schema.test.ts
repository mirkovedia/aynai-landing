import { describe, it, expect } from "vitest";
import { submitRatingSchema } from "./schema";

const VALID_UUID = "11111111-1111-4111-8111-111111111111";

describe("submitRatingSchema", () => {
  it("acepta un rating válido con comentario", () => {
    const r = submitRatingSchema.safeParse({ requestId: VALID_UUID, stars: 5, comment: "Excelente" });
    expect(r.success).toBe(true);
  });

  it("acepta sin comentario", () => {
    const r = submitRatingSchema.safeParse({ requestId: VALID_UUID, stars: 3 });
    expect(r.success).toBe(true);
  });

  it("rechaza estrellas fuera de 1-5", () => {
    expect(submitRatingSchema.safeParse({ requestId: VALID_UUID, stars: 0 }).success).toBe(false);
    expect(submitRatingSchema.safeParse({ requestId: VALID_UUID, stars: 6 }).success).toBe(false);
  });

  it("rechaza estrellas no enteras", () => {
    expect(submitRatingSchema.safeParse({ requestId: VALID_UUID, stars: 4.5 }).success).toBe(false);
  });

  it("rechaza comentario demasiado largo", () => {
    const long = "a".repeat(501);
    expect(submitRatingSchema.safeParse({ requestId: VALID_UUID, stars: 4, comment: long }).success).toBe(false);
  });
});

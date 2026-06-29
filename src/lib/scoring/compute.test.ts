import { describe, it, expect } from "vitest";
import { computeAyniScore } from "./compute";

describe("computeAyniScore", () => {
  it("usuario nuevo sin actividad ni ratings arranca en 600", () => {
    const r = computeAyniScore({ avgStars: null, ratingCount: 0, completedCount: 0, acceptedOrMore: 0, profileItems: 0 });
    expect(r.total).toBe(600);
  });

  it("nuevo con perfil completo pero sin actividad sigue siendo el arranque neutro (600)", () => {
    const r = computeAyniScore({ avgStars: null, ratingCount: 0, completedCount: 0, acceptedOrMore: 0, profileItems: 5 });
    expect(r.total).toBe(600);
  });

  it("reputación perfecta aporta el tope del factor (500)", () => {
    const r = computeAyniScore({ avgStars: 5, ratingCount: 3, completedCount: 3, acceptedOrMore: 3, profileItems: 5 });
    expect(r.factors.reputation).toBe(500);
    expect(r.factors.reliability).toBe(150);
    expect(r.factors.profile).toBe(100);
    expect(r.total).toBe(500 + r.factors.volume + 150 + 100);
  });

  it("cumplimiento parcial penaliza el factor de fiabilidad", () => {
    const r = computeAyniScore({ avgStars: 4, ratingCount: 2, completedCount: 1, acceptedOrMore: 2, profileItems: 5 });
    expect(r.factors.reliability).toBe(75); // 1/2 * 150
  });

  it("el total nunca excede 1000", () => {
    const r = computeAyniScore({ avgStars: 5, ratingCount: 50, completedCount: 50, acceptedOrMore: 50, profileItems: 5 });
    expect(r.total).toBeLessThanOrEqual(1000);
  });

  it("el volumen tiene rendimientos decrecientes (tope ~20)", () => {
    const a = computeAyniScore({ avgStars: 4, ratingCount: 5, completedCount: 5, acceptedOrMore: 5, profileItems: 5 });
    const b = computeAyniScore({ avgStars: 4, ratingCount: 40, completedCount: 40, acceptedOrMore: 40, profileItems: 5 });
    expect(b.factors.volume).toBeGreaterThan(a.factors.volume);
    expect(b.factors.volume).toBeLessThanOrEqual(250);
  });
});

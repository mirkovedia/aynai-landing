import { describe, it, expect } from "vitest";
import { portfolioItemSchema } from "@/lib/portfolio/schema";

describe("portfolioItemSchema", () => {
  it("acepta un ítem completo válido", () => {
    const r = portfolioItemSchema.safeParse({
      title: "Rediseño de app bancaria",
      description: "UX/UI para app móvil de banca digital.",
      url: "https://behance.net/mi-proyecto",
    });
    expect(r.success).toBe(true);
  });

  it("acepta un ítem solo con título", () => {
    const r = portfolioItemSchema.safeParse({ title: "Mi proyecto" });
    expect(r.success).toBe(true);
  });

  it("rechaza título vacío", () => {
    const r = portfolioItemSchema.safeParse({ title: "" });
    expect(r.success).toBe(false);
  });

  it("rechaza título de más de 120 caracteres", () => {
    const r = portfolioItemSchema.safeParse({ title: "a".repeat(121) });
    expect(r.success).toBe(false);
  });

  it("acepta exactamente 120 caracteres en título", () => {
    const r = portfolioItemSchema.safeParse({ title: "a".repeat(120) });
    expect(r.success).toBe(true);
  });

  it("rechaza descripción de más de 500 caracteres", () => {
    const r = portfolioItemSchema.safeParse({
      title: "Proyecto",
      description: "x".repeat(501),
    });
    expect(r.success).toBe(false);
  });

  it("acepta descripción de exactamente 500 caracteres", () => {
    const r = portfolioItemSchema.safeParse({
      title: "Proyecto",
      description: "x".repeat(500),
    });
    expect(r.success).toBe(true);
  });

  it("rechaza URL malformada", () => {
    const r = portfolioItemSchema.safeParse({
      title: "Proyecto",
      url: "no-es-una-url",
    });
    expect(r.success).toBe(false);
  });

  it("acepta URL vacía (campo opcional)", () => {
    const r = portfolioItemSchema.safeParse({ title: "Proyecto", url: "" });
    expect(r.success).toBe(true);
  });

  it("trim al título antes de validar", () => {
    const r = portfolioItemSchema.safeParse({ title: "  Mi proyecto  " });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.title).toBe("Mi proyecto");
  });
});

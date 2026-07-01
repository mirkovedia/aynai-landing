import { describe, it, expect } from "vitest";
import { validateMilestoneTitle, validateNoteContent } from "@/lib/workspace/schema";

const VALID_UUID = "11111111-1111-1111-1111-111111111111";

describe("validateMilestoneTitle", () => {
  it("acepta un título normal", () => {
    const r = validateMilestoneTitle("Entregar diseño de pantalla principal");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe("Entregar diseño de pantalla principal");
  });

  it("hace trim al título", () => {
    const r = validateMilestoneTitle("  Hito con espacios  ");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe("Hito con espacios");
  });

  it("rechaza título vacío", () => {
    expect(validateMilestoneTitle("").ok).toBe(false);
  });

  it("rechaza solo espacios", () => {
    expect(validateMilestoneTitle("   ").ok).toBe(false);
  });

  it("rechaza título de más de 200 caracteres", () => {
    expect(validateMilestoneTitle("x".repeat(201)).ok).toBe(false);
  });

  it("acepta exactamente 200 caracteres", () => {
    expect(validateMilestoneTitle("x".repeat(200)).ok).toBe(true);
  });

  it("rechaza un número", () => {
    expect(validateMilestoneTitle(42).ok).toBe(false);
  });
});

describe("validateNoteContent", () => {
  it("acepta contenido normal", () => {
    const r = validateNoteContent("Acordamos entregar en dos semanas.");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe("Acordamos entregar en dos semanas.");
  });

  it("acepta string vacío (borrar la nota)", () => {
    const r = validateNoteContent("");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe("");
  });

  it("rechaza contenido de más de 5000 caracteres", () => {
    expect(validateNoteContent("x".repeat(5001)).ok).toBe(false);
  });

  it("acepta exactamente 5000 caracteres", () => {
    expect(validateNoteContent("x".repeat(5000)).ok).toBe(true);
  });

  it("rechaza un número", () => {
    expect(validateNoteContent(123).ok).toBe(false);
  });
});

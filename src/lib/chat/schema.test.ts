import { describe, it, expect } from "vitest";
import { validateExchangeId, validateMessage } from "@/lib/chat/schema";

const VALID_UUID = "11111111-1111-1111-1111-111111111111";

describe("validateExchangeId", () => {
  it("acepta un UUID válido", () => {
    const r = validateExchangeId(VALID_UUID);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe(VALID_UUID);
  });

  it("rechaza un string que no es UUID", () => {
    expect(validateExchangeId("no-uuid").ok).toBe(false);
  });

  it("rechaza string vacío", () => {
    expect(validateExchangeId("").ok).toBe(false);
  });

  it("rechaza un número", () => {
    expect(validateExchangeId(123).ok).toBe(false);
  });

  it("rechaza null", () => {
    expect(validateExchangeId(null).ok).toBe(false);
  });

  it("acepta UUID en mayúsculas", () => {
    expect(validateExchangeId(VALID_UUID.toUpperCase()).ok).toBe(true);
  });
});

describe("validateMessage", () => {
  it("acepta un mensaje normal", () => {
    const r = validateMessage("Hola, ¿te interesa el intercambio?");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe("Hola, ¿te interesa el intercambio?");
  });

  it("trim al contenido", () => {
    const r = validateMessage("  Hola  ");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe("Hola");
  });

  it("rechaza string vacío", () => {
    expect(validateMessage("").ok).toBe(false);
  });

  it("rechaza solo espacios", () => {
    expect(validateMessage("   ").ok).toBe(false);
  });

  it("rechaza mensaje de más de 2000 caracteres", () => {
    expect(validateMessage("x".repeat(2001)).ok).toBe(false);
  });

  it("acepta exactamente 2000 caracteres", () => {
    expect(validateMessage("x".repeat(2000)).ok).toBe(true);
  });

  it("rechaza un número (no string)", () => {
    expect(validateMessage(42).ok).toBe(false);
  });

  it("rechaza null", () => {
    expect(validateMessage(null).ok).toBe(false);
  });
});

import { describe, it, expect } from "vitest";
import { MockQrProvider } from "@/lib/payments/mock-provider";

const provider = new MockQrProvider();

describe("MockQrProvider.createCharge", () => {
  it("devuelve un cargo pendiente con chargeId y qrPayload derivados de la referencia", async () => {
    const charge = await provider.createCharge({ amountBs: 20, reference: "ref-123" });
    expect(charge.status).toBe("pending");
    expect(charge.chargeId).toContain("ref-123");
    expect(charge.qrPayload).toContain("ref-123");
    expect(charge.qrPayload).toContain("20");
  });

  it("es determinístico: misma referencia produce el mismo chargeId", async () => {
    const a = await provider.createCharge({ amountBs: 20, reference: "ref-x" });
    const b = await provider.createCharge({ amountBs: 20, reference: "ref-x" });
    expect(a.chargeId).toBe(b.chargeId);
  });
});

describe("MockQrProvider.parseWebhook", () => {
  it("acepta un body con chargeId y status válidos", () => {
    const r = provider.parseWebhook({ chargeId: "AYNI-MOCK-ref-1", status: "paid" });
    expect(r).toEqual({ chargeId: "AYNI-MOCK-ref-1", status: "paid" });
  });

  it("rechaza un status desconocido", () => {
    expect(provider.parseWebhook({ chargeId: "x", status: "weird" })).toBeNull();
  });

  it("rechaza un body sin chargeId", () => {
    expect(provider.parseWebhook({ status: "paid" })).toBeNull();
  });

  it("rechaza un body que no es objeto", () => {
    expect(provider.parseWebhook("nope")).toBeNull();
  });
});

describe("MockQrProvider.name", () => {
  it("se identifica como 'mock'", () => {
    expect(provider.name).toBe("mock");
  });
});

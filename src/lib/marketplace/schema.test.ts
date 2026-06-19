import { describe, it, expect } from "vitest";
import {
  createExchangeSchema,
  respondSchema,
  cancelSchema,
  canRespond,
  startCommissionPaymentSchema,
  confirmMockPaymentSchema,
} from "@/lib/marketplace/schema";

const uuid = "11111111-1111-1111-1111-111111111111";

describe("createExchangeSchema", () => {
  it("acepta una propuesta válida", () => {
    const r = createExchangeSchema.safeParse({
      recipientId: uuid,
      offerSkill: "Diseño UI",
      wantSkill: "Marketing",
      message: "Hola, te propongo un Ayni",
    });
    expect(r.success).toBe(true);
  });

  it("acepta sin mensaje (opcional)", () => {
    const r = createExchangeSchema.safeParse({
      recipientId: uuid,
      offerSkill: "Diseño",
      wantSkill: "SEO",
    });
    expect(r.success).toBe(true);
  });

  it("rechaza recipientId que no es uuid", () => {
    const r = createExchangeSchema.safeParse({
      recipientId: "no-uuid",
      offerSkill: "Diseño",
      wantSkill: "SEO",
    });
    expect(r.success).toBe(false);
  });

  it("rechaza offerSkill vacío", () => {
    const r = createExchangeSchema.safeParse({
      recipientId: uuid,
      offerSkill: "",
      wantSkill: "SEO",
    });
    expect(r.success).toBe(false);
  });

  it("rechaza wantSkill de más de 40 caracteres", () => {
    const r = createExchangeSchema.safeParse({
      recipientId: uuid,
      offerSkill: "Diseño",
      wantSkill: "x".repeat(41),
    });
    expect(r.success).toBe(false);
  });

  it("rechaza message de más de 500 caracteres", () => {
    const r = createExchangeSchema.safeParse({
      recipientId: uuid,
      offerSkill: "Diseño",
      wantSkill: "SEO",
      message: "x".repeat(501),
    });
    expect(r.success).toBe(false);
  });
});

describe("respondSchema", () => {
  it("acepta action 'accept'", () => {
    expect(respondSchema.safeParse({ requestId: uuid, action: "accept" }).success).toBe(true);
  });

  it("acepta action 'reject'", () => {
    expect(respondSchema.safeParse({ requestId: uuid, action: "reject" }).success).toBe(true);
  });

  it("rechaza un action desconocido", () => {
    expect(respondSchema.safeParse({ requestId: uuid, action: "cancel" }).success).toBe(false);
  });
});

describe("cancelSchema", () => {
  it("acepta un requestId uuid", () => {
    expect(cancelSchema.safeParse({ requestId: uuid }).success).toBe(true);
  });

  it("rechaza requestId que no es uuid", () => {
    expect(cancelSchema.safeParse({ requestId: "x" }).success).toBe(false);
  });
});

describe("canRespond", () => {
  it("es true solo para 'pending'", () => {
    expect(canRespond("pending")).toBe(true);
    expect(canRespond("accepted")).toBe(false);
    expect(canRespond("rejected")).toBe(false);
    expect(canRespond("cancelled")).toBe(false);
  });
});

describe("startCommissionPaymentSchema", () => {
  const uuid = "11111111-1111-1111-1111-111111111111";

  it("acepta un exchangeRequestId uuid", () => {
    expect(startCommissionPaymentSchema.safeParse({ exchangeRequestId: uuid }).success).toBe(true);
  });

  it("rechaza un exchangeRequestId que no es uuid", () => {
    expect(startCommissionPaymentSchema.safeParse({ exchangeRequestId: "x" }).success).toBe(false);
  });
});

describe("confirmMockPaymentSchema", () => {
  it("acepta un chargeId no vacío", () => {
    expect(confirmMockPaymentSchema.safeParse({ chargeId: "AYNI-MOCK-abc" }).success).toBe(true);
  });

  it("rechaza un chargeId vacío", () => {
    expect(confirmMockPaymentSchema.safeParse({ chargeId: "" }).success).toBe(false);
  });
});

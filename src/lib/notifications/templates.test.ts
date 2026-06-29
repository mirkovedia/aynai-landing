import { describe, it, expect } from "vitest";
import { buildNotificationEmail } from "./email";

describe("buildNotificationEmail", () => {
  it("usa el título como asunto", () => {
    const m = buildNotificationEmail("request_received", "Nueva solicitud", "María quiere intercambiar", "/intercambios");
    expect(m.subject).toContain("Nueva solicitud");
  });

  it("incluye el cuerpo y un enlace absoluto al link", () => {
    const m = buildNotificationEmail("request_accepted", "Aceptada", "Tu propuesta fue aceptada", "/intercambios");
    expect(m.html).toContain("Tu propuesta fue aceptada");
    expect(m.html).toContain("/intercambios");
  });

  it("funciona sin body ni link", () => {
    const m = buildNotificationEmail("rating_received", "Nueva calificación", null, null);
    expect(m.subject).toContain("Nueva calificación");
    expect(typeof m.html).toBe("string");
  });
});

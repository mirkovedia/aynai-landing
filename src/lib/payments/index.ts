import type { PaymentProvider } from "./provider";
import { MockQrProvider } from "./mock-provider";

const mock = new MockQrProvider();

/** Devuelve el proveedor de pago activo. Hoy: mock. Futuro: selección por env PAYMENT_PROVIDER. */
export const getPaymentProvider = (): PaymentProvider => mock;

export type { PaymentProvider, Charge, CreateChargeInput } from "./provider";

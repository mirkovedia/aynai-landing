import { z } from "zod";

export const portfolioItemSchema = z.object({
  title: z.string().trim().min(1, "El título es requerido").max(120, "Máximo 120 caracteres"),
  description: z.string().trim().max(500, "Máximo 500 caracteres").optional(),
  url: z.string().trim().url("URL inválida").optional().or(z.literal("")),
});

export type PortfolioItemInput = z.infer<typeof portfolioItemSchema>;

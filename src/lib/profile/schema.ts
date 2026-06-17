import { z } from "zod";

/** URL opcional que también acepta cadena vacía (campo no llenado). */
const optionalUrl = z.string().url().optional().or(z.literal(""));

export const skillSchema = z.object({
  name: z.string().min(1).max(40),
  kind: z.enum(["offer", "seek"]),
  level: z.enum(["basico", "intermedio", "experto"]).optional(),
});

export const profileSchema = z.object({
  username: z
    .string()
    .regex(/^[a-z0-9_]{3,20}$/, "3-20 caracteres: a-z, 0-9, _"),
  avatar_url: optionalUrl,
  full_name: z.string().min(2).max(80),
  bio: z.string().max(500).optional().or(z.literal("")),
  location: z.string().max(80).optional().or(z.literal("")),
  availability: z.enum(["available", "busy", "unavailable"]),
  modality: z.enum(["remoto", "presencial", "hibrido"]).optional(),
  links: z
    .object({
      web: optionalUrl,
      linkedin: optionalUrl,
      github: optionalUrl,
      x: optionalUrl,
    })
    .partial(),
  skills: z.array(skillSchema).max(30),
});

export type SkillInput = z.infer<typeof skillSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;

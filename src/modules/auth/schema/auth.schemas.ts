import { z } from 'zod';

const emailSchema = z
  .string()
  .trim()
  .max(255)
  .email()
  .transform((email) => email.toLowerCase());

export const registerBodySchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    email: emailSchema,
    password: z.string().min(12).max(128),
  })
  .strict();

export const loginBodySchema = z
  .object({
    email: emailSchema,
    password: z.string().min(1).max(128),
  })
  .strict();

export type RegisterInput = z.infer<typeof registerBodySchema>;
export type LoginInput = z.infer<typeof loginBodySchema>;

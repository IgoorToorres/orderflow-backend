import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),

  PORT: z.coerce.number().int().min(1).max(65535).default(3000),

  DATABASE_URL: z
    .string()
    .url()
    .refine((value) => value.startsWith('mysql://'), {
      message: 'must use mysql:// protocol',
    }),

  JWT_SECRET: z.string().min(32),

  JWT_EXPIRES_IN: z.coerce.number().int().min(60).max(3600).default(900),
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(input: NodeJS.ProcessEnv): Env {
  const result = envSchema.safeParse(input);

  if (!result.success) {
    const invalidFields = [
      ...new Set(
        result.error.issues.map(
          (issue) => issue.path.join('.') || 'environment',
        ),
      ),
    ];

    throw new Error(
      `Invalid environment variables: ${invalidFields.join(', ')}`,
    );
  }

  return result.data;
}

export function loadEnv(): Env {
  return parseEnv(process.env);
}

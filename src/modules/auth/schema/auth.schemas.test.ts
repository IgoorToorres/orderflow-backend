import { describe, expect, it } from 'vitest';
import { loginBodySchema, registerBodySchema } from './auth.schemas.js';

describe('auth schemas', () => {
  it('normalizes the registration name and email', () => {
    const result = registerBodySchema.parse({
      name: '  Igor Torres  ',
      email: '  IGOR@EXAMPLE.COM  ',
      password: 'strong-password-123',
    });

    expect(result).toEqual({
      name: 'Igor Torres',
      email: 'igor@example.com',
      password: 'strong-password-123',
    });
  });

  it('does not allow the client to choose a role', () => {
    const result = registerBodySchema.safeParse({
      name: 'Igor Torres',
      email: 'igor@example.com',
      password: 'strong-password-123',
      role: 'ADMIN',
    });

    expect(result.success).toBe(false);
  });

  it('rejects short registration passwords', () => {
    const result = registerBodySchema.safeParse({
      name: 'Igor Torres',
      email: 'igor@example.com',
      password: 'short',
    });

    expect(result.success).toBe(false);
  });

  it('accepts login credentials', () => {
    const result = loginBodySchema.parse({
      email: '  USER@EXAMPLE.COM ',
      password: 'any-password',
    });

    expect(result).toEqual({
      email: 'user@example.com',
      password: 'any-password',
    });
  });
});

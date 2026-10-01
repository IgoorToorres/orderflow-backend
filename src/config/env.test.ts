import { describe, expect, it } from 'vitest';
import { parseEnv } from './env.js';

describe('parseEnv', () => {
  it('applies defaults and accepts a valid MySQL URL', () => {
    expect(
      parseEnv({
        DATABASE_URL: 'mysql://orderflow:password@localhost:3306/orderflow',
      }),
    ).toEqual({
      NODE_ENV: 'development',
      PORT: 3000,
      DATABASE_URL: 'mysql://orderflow:password@localhost:3306/orderflow',
    });
  });

  it.each(['0', '-1', '65536', 'abc'])('rejects invalid PORT %s', (PORT) => {
    expect(() =>
      parseEnv({
        PORT,
        DATABASE_URL: 'mysql://orderflow:password@localhost:3306/orderflow',
      }),
    ).toThrow(/PORT/);
  });

  it('rejects a missing DATABASE_URL', () => {
    expect(() => parseEnv({})).toThrow(/DATABASE_URL/);
  });

  it('rejects a non-MySQL URL without exposing its value', () => {
    const secretValue = 'https://user:super-secret@example.com/database';

    expect(() => parseEnv({ DATABASE_URL: secretValue })).toThrow(
      /DATABASE_URL/,
    );

    try {
      parseEnv({ DATABASE_URL: secretValue });
    } catch (error) {
      expect(String(error)).not.toContain('super-secret');
    }
  });
});
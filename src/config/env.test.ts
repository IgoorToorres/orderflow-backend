import { describe, expect, it } from 'vitest';
import { parseEnv } from './env.js';

const validEnv: NodeJS.ProcessEnv = {
  DATABASE_URL: 'mysql://orderflow:password@localhost:3306/orderflow',
  JWT_SECRET: 'test-secret-with-more-than-thirty-two-characters',
  JWT_EXPIRES_IN: '900',
};

describe('parseEnv', () => {
  it('applies defaults and accepts a valid environment', () => {
    expect(parseEnv(validEnv)).toEqual({
      NODE_ENV: 'development',
      PORT: 3000,
      DATABASE_URL: 'mysql://orderflow:password@localhost:3306/orderflow',
      JWT_SECRET: 'test-secret-with-more-than-thirty-two-characters',
      JWT_EXPIRES_IN: 900,
    });
  });

  it.each(['0', '-1', '65536', 'abc'])('rejects invalid PORT %s', (PORT) => {
    expect(() =>
      parseEnv({
        ...validEnv,
        PORT,
      }),
    ).toThrow(/PORT/);
  });

  it('rejects a missing DATABASE_URL', () => {
    const input: NodeJS.ProcessEnv = {
      ...validEnv,
    };

    delete input.DATABASE_URL;

    expect(() => parseEnv(input)).toThrow(/DATABASE_URL/);
  });

  it('rejects a non-MySQL URL without exposing its value', () => {
    const secretValue = 'https://user:super-secret@example.com/database';

    expect(() =>
      parseEnv({
        ...validEnv,
        DATABASE_URL: secretValue,
      }),
    ).toThrow(/DATABASE_URL/);

    try {
      parseEnv({
        ...validEnv,
        DATABASE_URL: secretValue,
      });
    } catch (error) {
      expect(String(error)).not.toContain('super-secret');
    }
  });

  it('rejects a missing JWT_SECRET', () => {
    const input: NodeJS.ProcessEnv = {
      ...validEnv,
    };

    delete input.JWT_SECRET;

    expect(() => parseEnv(input)).toThrow(/JWT_SECRET/);
  });

  it('rejects a short JWT_SECRET without exposing its value', () => {
    const secretValue = 'very-secret';

    expect(() =>
      parseEnv({
        ...validEnv,
        JWT_SECRET: secretValue,
      }),
    ).toThrow(/JWT_SECRET/);

    try {
      parseEnv({
        ...validEnv,
        JWT_SECRET: secretValue,
      });
    } catch (error) {
      expect(String(error)).not.toContain(secretValue);
    }
  });

  it.each(['0', '59', '3601', 'invalid'])(
    'rejects invalid JWT_EXPIRES_IN %s',
    (JWT_EXPIRES_IN) => {
      expect(() =>
        parseEnv({
          ...validEnv,
          JWT_EXPIRES_IN,
        }),
      ).toThrow(/JWT_EXPIRES_IN/);
    },
  );

  it('uses the default JWT expiration when it is omitted', () => {
    const input: NodeJS.ProcessEnv = {
      ...validEnv,
    };

    delete input.JWT_EXPIRES_IN;

    expect(parseEnv(input).JWT_EXPIRES_IN).toBe(900);
  });

  it('converts JWT_EXPIRES_IN to a number', () => {
    const env = parseEnv({
      ...validEnv,
      JWT_EXPIRES_IN: '1800',
    });

    expect(env.JWT_EXPIRES_IN).toBe(1800);
  });
});

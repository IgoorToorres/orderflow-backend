import { decodeJwt } from 'jose';
import { describe, expect, it } from 'vitest';
import { UserRole } from '../../../generated/prisma/enums.js';
import { createTokenService } from './token.js';

const userId = '550e8400-e29b-41d4-a716-446655440000';
const now = new Date('2026-01-01T12:00:00.000Z');

describe('TokenService', () => {
  it('creates and verifies an access token', async () => {
    const service = createTokenService({
      secret: 'a'.repeat(64),
      expiresInSeconds: 900,
    });

    const token = await service.issueAccessToken(
      {
        userId,
        role: UserRole.CUSTOMER,
      },
      now,
    );

    await expect(service.verifyAccessToken(token, now)).resolves.toEqual({
      userId,
      role: UserRole.CUSTOMER,
    });
  });

  it('puts only the allowed claims in the payload', async () => {
    const service = createTokenService({
      secret: 'a'.repeat(64),
      expiresInSeconds: 900,
    });

    const token = await service.issueAccessToken(
      {
        userId,
        role: UserRole.ADMIN,
      },
      now,
    );

    const payload = decodeJwt(token);

    expect(Object.keys(payload).sort()).toEqual(['exp', 'iat', 'role', 'sub']);
  });

  it('rejects an expired token', async () => {
    const service = createTokenService({
      secret: 'a'.repeat(64),
      expiresInSeconds: 900,
    });

    const token = await service.issueAccessToken(
      {
        userId,
        role: UserRole.CUSTOMER,
      },
      now,
    );

    const afterExpiration = new Date(now.getTime() + 901_000);

    await expect(
      service.verifyAccessToken(token, afterExpiration),
    ).resolves.toBeNull();
  });

  it('rejects a token signed with another secret', async () => {
    const issuer = createTokenService({
      secret: 'a'.repeat(64),
      expiresInSeconds: 900,
    });

    const verifier = createTokenService({
      secret: 'b'.repeat(64),
      expiresInSeconds: 900,
    });

    const token = await issuer.issueAccessToken(
      {
        userId,
        role: UserRole.CUSTOMER,
      },
      now,
    );

    await expect(verifier.verifyAccessToken(token, now)).resolves.toBeNull();
  });
});

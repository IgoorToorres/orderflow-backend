import { jwtVerify, SignJWT } from 'jose';
import { z } from 'zod';
import {
  UserRole,
  type UserRole as UserRoleValue,
} from '../../../generated/prisma/enums.js';

export interface AuthIdentity {
  userId: string;
  role: UserRoleValue;
}

export interface TokenService {
  readonly expiresInSeconds: number;

  issueAccessToken(identity: AuthIdentity, now?: Date): Promise<string>;

  verifyAccessToken(token: string, now?: Date): Promise<AuthIdentity | null>;
}

interface TokenServiceOptions {
  secret: string;
  expiresInSeconds: number;
}

const accessTokenPayloadSchema = z
  .object({
    sub: z.string().uuid(),
    role: z.enum([UserRole.CUSTOMER, UserRole.ADMIN]),
    iat: z.number().int(),
    exp: z.number().int(),
  })
  .strict();

export function createTokenService({
  secret,
  expiresInSeconds,
}: TokenServiceOptions): TokenService {
  const secretKey = new TextEncoder().encode(secret);

  return {
    expiresInSeconds,

    async issueAccessToken(identity, now = new Date()) {
      const issuedAt = Math.floor(now.getTime() / 1000);

      return new SignJWT({
        role: identity.role,
      })
        .setProtectedHeader({
          alg: 'HS256',
          typ: 'JWT',
        })
        .setSubject(identity.userId)
        .setIssuedAt(issuedAt)
        .setExpirationTime(issuedAt + expiresInSeconds)
        .sign(secretKey);
    },

    async verifyAccessToken(token, now = new Date()) {
      try {
        const { payload } = await jwtVerify(token, secretKey, {
          algorithms: ['HS256'],
          currentDate: now,
        });

        const result = accessTokenPayloadSchema.safeParse(payload);

        if (!result.success) {
          return null;
        }

        return {
          userId: result.data.sub,
          role: result.data.role,
        };
      } catch {
        return null;
      }
    },
  };
}

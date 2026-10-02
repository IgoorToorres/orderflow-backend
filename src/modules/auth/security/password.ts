import { argon2id, hash as argonHash, verify as argonVerify } from 'argon2';

export interface PasswordHasher {
  hash(plainPassword: string): Promise<string>;
  verify(passwordHash: string, plainPassword: string): Promise<boolean>;
}

export const passwordHasher: PasswordHasher = {
  async hash(plainPassword) {
    return argonHash(plainPassword, {
      type: argon2id,
    });
  },

  async verify(passwordHash, plainPassword) {
    return argonVerify(passwordHash, plainPassword);
  },
};

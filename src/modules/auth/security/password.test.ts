import { describe, expect, it } from 'vitest';
import { passwordHasher } from './password.js';

describe('passwordHasher', () => {
  it('hashes and verifies the correct password', async () => {
    const plainPassword = 'strong-password-123';

    const passwordHash = await passwordHasher.hash(plainPassword);

    expect(passwordHash).not.toBe(plainPassword);
    expect(passwordHash).not.toContain(plainPassword);
    expect(passwordHash).toMatch(/^\$argon2id\$/);

    await expect(
      passwordHasher.verify(passwordHash, plainPassword),
    ).resolves.toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const passwordHash = await passwordHasher.hash('correct-password-123');

    await expect(
      passwordHasher.verify(passwordHash, 'incorrect-password-123'),
    ).resolves.toBe(false);
  });
});

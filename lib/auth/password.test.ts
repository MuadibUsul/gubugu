import { describe, expect, it } from 'vitest';

import { hashPassword, verifyPassword } from './password';

describe('local password hashing', () => {
  it('accepts only the original password', async () => {
    const hash = await hashPassword('correct horse battery staple');

    await expect(
      verifyPassword('correct horse battery staple', hash),
    ).resolves.toBe(true);
    await expect(verifyPassword('wrong password', hash)).resolves.toBe(false);
  });
});

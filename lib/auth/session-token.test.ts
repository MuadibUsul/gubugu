import { describe, expect, it } from 'vitest';

import {
  createLocalSessionToken,
  LOCAL_SESSION_TTL_SECONDS,
  readLocalSessionToken,
} from './session-token';

const USER_ID = '10000000-0000-4000-8000-000000000001';
const SECRET = 'test-secret-that-is-at-least-32-characters';

describe('local session token', () => {
  it('verifies the signed user and rejects tampering or expiry', () => {
    const now = Date.UTC(2026, 7, 22);
    const token = createLocalSessionToken(USER_ID, SECRET, now);

    expect(readLocalSessionToken(token, SECRET, now)?.userId).toBe(USER_ID);
    expect(readLocalSessionToken(`${token}x`, SECRET, now)).toBeNull();
    expect(
      readLocalSessionToken(
        token,
        SECRET,
        now + (LOCAL_SESSION_TTL_SECONDS + 1) * 1000,
      ),
    ).toBeNull();
  });
});

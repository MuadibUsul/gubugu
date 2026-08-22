import { createHmac, timingSafeEqual } from 'crypto';
import { z } from 'zod';

const userIdSchema = z.string().uuid();
export const LOCAL_SESSION_TTL_SECONDS = 60 * 60 * 24 * 14;

function signature(payload: string, secret: string) {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

export function createLocalSessionToken(
  userId: string,
  secret: string,
  now = Date.now(),
) {
  const validUserId = userIdSchema.parse(userId);
  const expiresAt = Math.floor(now / 1000) + LOCAL_SESSION_TTL_SECONDS;
  const payload = `${validUserId}.${expiresAt}`;
  return `${payload}.${signature(payload, secret)}`;
}

export function readLocalSessionToken(
  token: string,
  secret: string,
  now = Date.now(),
) {
  const [userId, rawExpiresAt, suppliedSignature, extra] = token.split('.');
  const parsedUserId = userIdSchema.safeParse(userId);
  const expiresAt = Number(rawExpiresAt);
  if (
    extra !== undefined ||
    !parsedUserId.success ||
    !Number.isSafeInteger(expiresAt) ||
    expiresAt <= Math.floor(now / 1000) ||
    !suppliedSignature
  ) {
    return null;
  }

  const expectedSignature = signature(`${userId}.${expiresAt}`, secret);
  const expected = Buffer.from(expectedSignature);
  const supplied = Buffer.from(suppliedSignature);
  if (
    expected.length !== supplied.length ||
    !timingSafeEqual(expected, supplied)
  ) {
    return null;
  }

  return { userId: parsedUserId.data, expiresAt };
}

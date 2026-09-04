import 'server-only';

import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';

import { localAuthAccounts, profiles } from '@/drizzle/schema';
import {
  createLocalSessionToken,
  LOCAL_SESSION_TTL_SECONDS,
  readLocalSessionToken,
} from '@/lib/auth/session-token';
import { getDb } from '@/server/db/client';

import type { AuthUser } from './types';

const LOCAL_AUTH_COOKIE_NAME = 'gubugu-local-session';
const LEGACY_DEMO_COOKIE_NAME = 'gubugu-local-demo-user';

function getLocalAuthSecret() {
  const secret = process.env.LOCAL_AUTH_SECRET?.trim();
  if (!secret || secret.length < 32) {
    throw new Error('本地认证需要配置至少 32 位的 LOCAL_AUTH_SECRET。');
  }
  return secret;
}

function shouldUseSecureCookie() {
  const appUrl = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) return process.env.NODE_ENV === 'production';
  try {
    return new URL(appUrl).protocol === 'https:';
  } catch {
    return process.env.NODE_ENV === 'production';
  }
}

export async function getLocalAuthUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(LOCAL_AUTH_COOKIE_NAME)?.value;
  if (!rawToken) return null;

  const session = readLocalSessionToken(rawToken, getLocalAuthSecret());
  if (!session) return null;

  const account = (
    await getDb()
      .select({
        id: profiles.id,
        email: localAuthAccounts.email,
        handle: profiles.handle,
        displayName: profiles.displayName,
      })
      .from(localAuthAccounts)
      .innerJoin(profiles, eq(profiles.id, localAuthAccounts.userId))
      .where(eq(localAuthAccounts.userId, session.userId))
      .limit(1)
  )[0];
  if (!account) return null;

  return {
    id: account.id,
    email: account.email,
    phone: null,
    handle: account.handle,
    displayLabel: account.displayName,
    provider: 'local',
  };
}

export async function setLocalAuthSession(userId: string) {
  const cookieStore = await cookies();
  cookieStore.set(
    LOCAL_AUTH_COOKIE_NAME,
    createLocalSessionToken(userId, getLocalAuthSecret()),
    {
      httpOnly: true,
      sameSite: 'lax',
      secure: shouldUseSecureCookie(),
      path: '/',
      maxAge: LOCAL_SESSION_TTL_SECONDS,
    },
  );
  cookieStore.delete(LEGACY_DEMO_COOKIE_NAME);
}

export async function clearLocalAuthSession() {
  const cookieStore = await cookies();
  cookieStore.delete(LOCAL_AUTH_COOKIE_NAME);
  cookieStore.delete(LEGACY_DEMO_COOKIE_NAME);
}

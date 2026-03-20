import 'server-only';

import { cookies } from 'next/headers';

import {
  isLocalDemoViewerKey,
  localDemoAuthEmailByKey,
} from '@/lib/auth/local-demo';
import { demoViewers, type DemoViewerKey } from '@/lib/config/demo-viewers';
import { getSupabaseAuthConfig } from '@/lib/supabase/config';

import type { AuthUser } from './types';

const LOCAL_DEMO_AUTH_COOKIE_NAME = 'gubugu-local-demo-user';

const localDemoCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 60 * 60 * 24 * 30,
};

export function isLocalDemoAuthEnabled() {
  return !getSupabaseAuthConfig();
}

export async function getLocalDemoAuthUser(): Promise<AuthUser | null> {
  if (!isLocalDemoAuthEnabled()) {
    return null;
  }

  const cookieStore = await cookies();
  const viewerKey = cookieStore.get(LOCAL_DEMO_AUTH_COOKIE_NAME)?.value;

  if (!viewerKey || !isLocalDemoViewerKey(viewerKey)) {
    return null;
  }

  const viewer = demoViewers[viewerKey];

  return {
    id: viewer.userId,
    email: localDemoAuthEmailByKey[viewerKey],
    phone: null,
    handle: viewer.handle,
    displayLabel: viewer.displayName,
    provider: 'local-demo',
  } satisfies AuthUser;
}

export async function setLocalDemoAuthSession(viewerKey: DemoViewerKey) {
  const cookieStore = await cookies();

  cookieStore.set(LOCAL_DEMO_AUTH_COOKIE_NAME, viewerKey, localDemoCookieOptions);
}

export async function clearLocalDemoAuthSession() {
  const cookieStore = await cookies();

  cookieStore.delete(LOCAL_DEMO_AUTH_COOKIE_NAME);
}

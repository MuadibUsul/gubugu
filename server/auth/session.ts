import 'server-only';

import { cache } from 'react';
import { redirect } from 'next/navigation';

import { getSupabaseAuthConfig } from '@/lib/supabase/config';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getLocalDemoAuthUser } from '@/server/auth/local-session';

import type { AuthUser } from './types';

export const getAuthUser = cache(async () => {
  if (!getSupabaseAuthConfig()) {
    return getLocalDemoAuthUser();
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email ?? null,
    phone: user.phone ?? null,
    handle: null,
    displayLabel: user.email ?? user.phone ?? 'Authenticated User',
    provider: 'supabase',
  } satisfies AuthUser;
});

export async function requireAuthUser(nextPath = '/') {
  const user = await getAuthUser();

  if (!user) {
    const nextQuery =
      nextPath && nextPath !== '/'
        ? `?next=${encodeURIComponent(nextPath)}`
        : '';

    redirect(`/login${nextQuery}`);
  }

  return user;
}

import 'server-only';

import { cache } from 'react';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';

import { profiles } from '@/drizzle/schema';
import { getSupabaseAuthConfig } from '@/lib/supabase/config';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getLocalAuthUser } from '@/server/auth/local-session';
import { ensureAuthProfile } from '@/server/auth/profile';
import { getDb } from '@/server/db/client';

import type { AuthUser } from './types';

export const getAuthUser = cache(async () => {
  if (!getSupabaseAuthConfig()) {
    return getLocalAuthUser();
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  let profile = (
    await getDb()
      .select({ handle: profiles.handle, displayName: profiles.displayName })
      .from(profiles)
      .where(eq(profiles.id, user.id))
      .limit(1)
  )[0];
  if (!profile) {
    profile = await ensureAuthProfile({
      id: user.id,
      email: user.email,
      displayName:
        typeof user.user_metadata?.display_name === 'string'
          ? user.user_metadata.display_name
          : null,
    });
  }

  return {
    id: user.id,
    email: user.email ?? null,
    phone: user.phone ?? null,
    handle: profile.handle,
    displayLabel: profile.displayName,
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

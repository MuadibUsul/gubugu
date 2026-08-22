import 'server-only';

import { z } from 'zod';

import { profiles } from '@/drizzle/schema';
import { getDb } from '@/server/db/client';

const authProfileInputSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email().max(320).nullish(),
  displayName: z.string().nullish(),
});

/** Supabase owns credentials; the app still needs its own SKU/social profile row. */
export async function ensureAuthProfile(input: {
  id: string;
  email?: string | null;
  displayName?: string | null;
}) {
  const parsed = authProfileInputSchema.parse(input);
  const fallbackName = parsed.email?.split('@')[0]?.trim() || '新收藏者';
  const displayName = (parsed.displayName?.trim() || fallbackName).slice(
    0,
    120,
  );
  const handle = `user-${parsed.id.replaceAll('-', '')}`;
  await getDb()
    .insert(profiles)
    .values({
      id: parsed.id,
      handle,
      displayName,
    })
    .onConflictDoNothing({ target: profiles.id });
  return { handle, displayName };
}

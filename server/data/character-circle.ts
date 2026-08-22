import 'server-only';

import { and, countDistinct, desc, eq, isNotNull } from 'drizzle-orm';
import { z } from 'zod';

import {
  characters,
  goodsCharacters,
  profiles,
  userGoods,
} from '@/drizzle/schema';
import { getDb } from '@/server/db/client';

const inputSchema = z.object({
  characterSlug: z.string().trim().min(1),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(48).default(24),
});

export async function listCharacterCollectors(
  input: z.input<typeof inputSchema>,
) {
  const { characterSlug, page, pageSize } = inputSchema.parse(input);
  const db = getDb();
  const [items, totals] = await Promise.all([
    db
      .selectDistinct({
        userId: profiles.id,
        handle: profiles.handle,
        displayName: profiles.displayName,
      })
      .from(characters)
      .innerJoin(
        goodsCharacters,
        eq(goodsCharacters.characterId, characters.id),
      )
      .innerJoin(
        userGoods,
        and(
          eq(userGoods.goodsId, goodsCharacters.goodsId),
          eq(userGoods.status, 'owned'),
          isNotNull(userGoods.litAt),
        ),
      )
      .innerJoin(
        profiles,
        and(
          eq(profiles.id, userGoods.userId),
          eq(profiles.visibility, 'public'),
        ),
      )
      .where(eq(characters.slug, characterSlug))
      .orderBy(desc(profiles.displayName))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({ total: countDistinct(profiles.id) })
      .from(characters)
      .innerJoin(
        goodsCharacters,
        eq(goodsCharacters.characterId, characters.id),
      )
      .innerJoin(
        userGoods,
        and(
          eq(userGoods.goodsId, goodsCharacters.goodsId),
          eq(userGoods.status, 'owned'),
          isNotNull(userGoods.litAt),
        ),
      )
      .innerJoin(
        profiles,
        and(
          eq(profiles.id, userGoods.userId),
          eq(profiles.visibility, 'public'),
        ),
      )
      .where(eq(characters.slug, characterSlug)),
  ]);
  return { items, total: totals[0]?.total ?? 0, page, pageSize };
}

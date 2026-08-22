import 'server-only';

import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';

import { exchangeReviews } from '@/drizzle/schema';
import { getDb } from '@/server/db/client';

export async function getUserReputation(userId: string) {
  const id = z.string().uuid().parse(userId);
  const row = (
    await getDb()
      .select({
        average: sql<string | null>`avg(${exchangeReviews.score})`,
        count: sql<number>`count(${exchangeReviews.id})`,
      })
      .from(exchangeReviews)
      .where(eq(exchangeReviews.revieweeId, id))
  )[0];
  return {
    averageScore: row?.average ? Number(row.average) : null,
    reviewCount: Number(row?.count ?? 0),
  };
}

import 'server-only';

import { and, eq, or, sql } from 'drizzle-orm';

import { directConversations, userBlocks } from '@/drizzle/schema';
import { normalizeConversationMembers } from '@/lib/messages';
import { getDb, type DatabaseTransaction } from '@/server/db/client';

export async function lockUserPair(
  tx: DatabaseTransaction,
  firstUserId: string,
  secondUserId: string,
) {
  const members = normalizeConversationMembers(firstUserId, secondUserId);
  if (!members) return false;
  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtextextended(${`${members[0]}:${members[1]}`}, 0))`,
  );
  return true;
}

export async function areUsersBlockedInTransaction(
  tx: DatabaseTransaction,
  firstUserId: string,
  secondUserId: string,
) {
  return Boolean(
    (
      await tx
        .select({ blockerId: userBlocks.blockerId })
        .from(userBlocks)
        .where(
          or(
            and(
              eq(userBlocks.blockerId, firstUserId),
              eq(userBlocks.blockedId, secondUserId),
            ),
            and(
              eq(userBlocks.blockerId, secondUserId),
              eq(userBlocks.blockedId, firstUserId),
            ),
          ),
        )
        .limit(1)
    )[0],
  );
}

export async function areUsersBlocked(
  firstUserId: string,
  secondUserId: string,
) {
  return Boolean(
    (
      await getDb()
        .select({ blockerId: userBlocks.blockerId })
        .from(userBlocks)
        .where(
          or(
            and(
              eq(userBlocks.blockerId, firstUserId),
              eq(userBlocks.blockedId, secondUserId),
            ),
            and(
              eq(userBlocks.blockerId, secondUserId),
              eq(userBlocks.blockedId, firstUserId),
            ),
          ),
        )
        .limit(1)
    )[0],
  );
}

/** Internal domain helper; callers must authorize why these users may connect. */
export async function ensureConversationBetween(
  firstUserId: string,
  secondUserId: string,
) {
  const members = normalizeConversationMembers(firstUserId, secondUserId);
  if (!members) return null;
  const [memberAId, memberBId] = members;
  const db = getDb();
  return db.transaction(async (tx) => {
    await lockUserPair(tx, memberAId, memberBId);
    if (await areUsersBlockedInTransaction(tx, memberAId, memberBId)) {
      return null;
    }
    const inserted = await tx
      .insert(directConversations)
      .values({ memberAId, memberBId })
      .onConflictDoNothing({
        target: [directConversations.memberAId, directConversations.memberBId],
      })
      .returning({ id: directConversations.id });
    if (inserted[0]) return inserted[0].id;

    return (
      await tx
        .select({ id: directConversations.id })
        .from(directConversations)
        .where(
          and(
            eq(directConversations.memberAId, memberAId),
            eq(directConversations.memberBId, memberBId),
          ),
        )
        .limit(1)
    )[0]?.id;
  });
}

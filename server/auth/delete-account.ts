import 'server-only';

import { rm } from 'node:fs/promises';

import { eq, inArray, sql } from 'drizzle-orm';

import { postImages, posts, userScans } from '@/drizzle/schema';
import { communityImageAssetPath } from '@/server/community/image-store';
import { getDb } from '@/server/db/client';
import { userScanAssetPath } from '@/server/user-scans/image-store';

/** 删除账号及其 V1 用户数据；不保留可反查用户身份的删除审计。 */
export async function deleteAccountData(userId: string) {
  const db = getDb();
  const scanAssets = await db
    .select({ assetKey: userScans.assetKey })
    .from(userScans)
    .where(eq(userScans.userId, userId));
  const communityAssets = await db
    .select({ assetKey: postImages.storagePath })
    .from(postImages)
    .innerJoin(posts, eq(postImages.postId, posts.id))
    .where(eq(posts.userId, userId));

  await db.transaction(async (tx) => {
    // 先清掉带多方参与者的记录，再清用户独占数据。表间已有的 cascade 会处理子表。
    const statements = [
      sql`delete from market_transactions where buyer_id = ${userId} or seller_id = ${userId}`,
      sql`delete from orders where buyer_id = ${userId} or seller_id = ${userId}`,
      sql`delete from listings where seller_id = ${userId}`,
      sql`delete from want_orders where user_id = ${userId}`,
      sql`delete from exchange_offers where proposer_id = ${userId} or recipient_id = ${userId} or awaiting_user_id = ${userId}`,
      sql`delete from exchanges where initiator_id = ${userId} or recipient_id = ${userId}`,
      sql`delete from exchange_listings where user_id = ${userId}`,
      sql`delete from direct_conversations where member_a_id = ${userId} or member_b_id = ${userId}`,
      sql`delete from direct_messages where sender_id = ${userId}`,
      sql`delete from exchange_reviews where reviewer_id = ${userId} or reviewee_id = ${userId}`,
      sql`delete from notifications where recipient_id = ${userId}`,
      sql`update notifications set actor_id = null where actor_id = ${userId}`,
      sql`delete from follows where follower_id = ${userId} or following_id = ${userId}`,
      sql`delete from user_blocks where blocker_id = ${userId} or blocked_id = ${userId}`,
      sql`delete from coordination_proposals where initiator_id = ${userId} or ${userId} = any(participant_ids)`,
      sql`delete from reports where reporter_id = ${userId}`,
      sql`update reports set resolved_by = null where resolved_by = ${userId}`,
      sql`update catalog_submissions set reviewed_by = null where reviewed_by = ${userId}`,
      sql`update posts set reviewed_by = null where reviewed_by = ${userId}`,
      sql`update post_images set reviewed_by = null where reviewed_by = ${userId}`,
      sql`update exchange_listings set reviewed_by = null where reviewed_by = ${userId}`,
      sql`update listings set reviewed_by = null where reviewed_by = ${userId}`,
      sql`delete from posts where user_id = ${userId}`,
      sql`delete from ratings where user_id = ${userId}`,
      sql`delete from catalog_submissions where user_id = ${userId}`,
      sql`delete from goods_watches where user_id = ${userId}`,
      sql`delete from user_achievements where user_id = ${userId}`,
      sql`delete from user_goods where user_id = ${userId}`,
      sql`delete from user_scans where user_id = ${userId}`,
      sql`delete from recognition_attempts where user_id = ${userId}`,
      sql`delete from profiles where id = ${userId}`,
    ];

    for (const statement of statements) await tx.execute(statement);
  });

  // 两类资产都是内容寻址的：同一张图可能被多个账号引用，所以要等事务提交、本人的
  // 行已经删掉之后，再回查是否还有别人指着同一个 key，只删无人引用的物理文件。
  //
  // 两次清理都必须发生：曾经这里在扫描图为空时直接 return，只发过帖、没扫过货的账号
  // 删号后社区图片会永远留在磁盘上——那正好是隐私承诺最不该漏的一类。
  await Promise.all([
    removeUnreferencedAssets({
      label: '私密扫描图',
      keys: scanAssets.map((item) => item.assetKey),
      stillReferenced: (keys) =>
        db
          .select({ assetKey: userScans.assetKey })
          .from(userScans)
          .where(inArray(userScans.assetKey, keys)),
      pathOf: userScanAssetPath,
    }),
    removeUnreferencedAssets({
      label: '社区图片',
      keys: communityAssets.map((item) => item.assetKey),
      stillReferenced: (keys) =>
        db
          .select({ assetKey: postImages.storagePath })
          .from(postImages)
          .where(inArray(postImages.storagePath, keys)),
      pathOf: communityImageAssetPath,
    }),
  ]);
}

type AssetCleanup = {
  /** 只用于日志，出现在清理失败的告警里。 */
  label: string;
  keys: (string | null)[];
  /** 回查这批 key 里还有哪些被别人引用；调用方保证传入非空数组。 */
  stillReferenced: (keys: string[]) => Promise<{ assetKey: string | null }[]>;
  pathOf: (assetKey: string) => string;
};

async function removeUnreferencedAssets({
  label,
  keys,
  stillReferenced,
  pathOf,
}: AssetCleanup) {
  const unique = Array.from(new Set(keys.filter((key) => key !== null)));
  if (unique.length === 0) return;

  const referenced = new Set(
    (await stillReferenced(unique)).map((item) => item.assetKey),
  );

  await Promise.all(
    unique
      .filter((assetKey) => !referenced.has(assetKey))
      .map(async (assetKey) => {
        try {
          await rm(pathOf(assetKey), { force: true });
        } catch (error) {
          // 文件删不掉不该让删号整体失败：数据库里的行已经没了，剩下的是一个
          // 无人引用的孤儿文件，值得告警但不值得把账号留下来。
          console.error(`[account-delete] ${label}清理失败`, assetKey, error);
        }
      }),
  );
}

import type { Metadata } from 'next';
import { z } from 'zod';

import { UserAchievementLedger } from '@/components/user/user-achievement-ledger';
import { UserCollectionHeader } from '@/components/user/user-collection-header';
import {
  UserCollectionSheet,
  type CollectionStatusFilter,
} from '@/components/user/user-collection-sheet';
import { UserExchangeListings } from '@/components/user/user-exchange-listings';
import { UserPhotoStrip } from '@/components/user/user-photo-strip';
import { getSingleSearchParamValue } from '@/lib/search-params';
import { requireAuthUser } from '@/server/auth/session';
import { getUserProfilePageData } from '@/server/data';
import { listAchievementLedger } from '@/server/data/achievements';

export const metadata: Metadata = {
  title: '我的收藏',
  description: '当前登录用户的收藏帖。',
};

export const dynamic = 'force-dynamic';

const statusSchema = z
  .enum(['owned', 'wanted', 'exchange'])
  .default('owned') satisfies z.ZodType<CollectionStatusFilter>;

type MyCollectionPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function MyCollectionPage({
  searchParams,
}: MyCollectionPageProps) {
  const user = await requireAuthUser('/me/collection');
  const resolved = (await searchParams) ?? {};
  const status = statusSchema.parse(
    getSingleSearchParamValue(resolved.status) ?? undefined,
  );

  const [data, ledger] = await Promise.all([
    getUserProfilePageData({ userId: user.id, viewerMode: 'self' }),
    listAchievementLedger(user.id),
  ]);

  const exchangeEntryGoods =
    data.goods.exchange.length > 0 ? data.goods.exchange : data.goods.owned;

  return (
    <main className="mx-auto w-full max-w-[1180px] px-5 pt-14 pb-24 md:px-10">
      <UserCollectionHeader
        data={data}
        displayName={user.displayLabel}
        eyebrow="収集帖"
        handle={user.handle ?? user.email ?? null}
        railLabel="私の収蔵"
      />

      <section className="spread py-14">
        <div>
          <p className="lbl">一覧</p>
          <div className="rail-jp">目録</div>
        </div>
        <div className="min-w-0">
          <UserCollectionSheet
            basePath="/me/collection"
            data={data}
            status={status}
          />
        </div>
      </section>

      <UserAchievementLedger
        entries={ledger}
        ownedTotal={data.summary.ownedCount}
      />

      <section className="spread border-border border-t py-14">
        <div>
          <p className="lbl">交换</p>
          <div className="rail-jp">交換</div>
        </div>
        <div className="min-w-0">
          <UserExchangeListings
            entryGoods={exchangeEntryGoods.map((item) => ({
              id: item.id,
              slug: item.slug,
              name: item.name,
            }))}
            items={data.exchangeListings}
          />
        </div>
      </section>

      <UserPhotoStrip items={data.recentPhotoEntries} />
    </main>
  );
}

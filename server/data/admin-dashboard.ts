import 'server-only';

import { desc, eq, sql } from 'drizzle-orm';

import {
  goods,
  goodsImages,
  ips,
  postImages,
  posts,
  series,
} from '@/drizzle/schema';
import { getDb, isDatabaseAccessConfigurationError } from '@/server/db/client';

export type AdminStatisticCard = {
  key: string;
  label: string;
  value: string;
};

export type AdminGoodsRecord = {
  id: string;
  slug: string;
  skuCode: string;
  name: string;
  status: 'draft' | 'published' | 'archived';
  seriesName: string;
  ipName: string;
  updatedAt: Date;
};

export type AdminDashboardData = {
  mode: 'live' | 'fallback';
  generatedAt: Date;
  statistics: AdminStatisticCard[];
  recentGoods: AdminGoodsRecord[];
};

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  try {
    const db = getDb();
    const [goodsCount, imageCount, postCount, photoCount, recentGoods] =
      await Promise.all([
        db.select({ value: sql<number>`count(*)` }).from(goods),
        db.select({ value: sql<number>`count(*)` }).from(goodsImages),
        db.select({ value: sql<number>`count(*)` }).from(posts),
        db.select({ value: sql<number>`count(*)` }).from(postImages),
        db
          .select({
            id: goods.id,
            slug: goods.slug,
            skuCode: goods.skuCode,
            name: goods.name,
            status: goods.status,
            seriesName: series.name,
            ipName: ips.name,
            updatedAt: goods.updatedAt,
          })
          .from(goods)
          .innerJoin(series, eq(goods.seriesId, series.id))
          .innerJoin(ips, eq(series.ipId, ips.id))
          .orderBy(desc(goods.updatedAt))
          .limit(10),
      ]);

    const format = (value: number) =>
      new Intl.NumberFormat('zh-CN').format(value);
    return {
      mode: 'live',
      generatedAt: new Date(),
      statistics: [
        {
          key: 'goods',
          label: 'SKU',
          value: format(Number(goodsCount[0]?.value ?? 0)),
        },
        {
          key: 'images',
          label: '官图',
          value: format(Number(imageCount[0]?.value ?? 0)),
        },
        {
          key: 'posts',
          label: '评论',
          value: format(Number(postCount[0]?.value ?? 0)),
        },
        {
          key: 'photos',
          label: '晒图',
          value: format(Number(photoCount[0]?.value ?? 0)),
        },
      ],
      recentGoods,
    };
  } catch (error) {
    if (!isDatabaseAccessConfigurationError(error)) throw error;
    return {
      mode: 'fallback',
      generatedAt: new Date(),
      statistics: [],
      recentGoods: [],
    };
  }
}

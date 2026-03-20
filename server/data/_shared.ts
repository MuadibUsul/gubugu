import 'server-only';

import { and, asc, desc, eq, inArray } from 'drizzle-orm';

import {
  characters,
  goods,
  goodsCharacters,
  goodsImages,
  goodsTags,
  ips,
  series,
  tags,
} from '@/drizzle/schema';
import { getDb } from '@/server/db/client';

export type GoodsCardData = {
  id: string;
  slug: string;
  skuCode: string;
  name: string;
  description: string | null;
  goodsType: string;
  material: string | null;
  sizeLabel: string | null;
  edition: string | null;
  releaseDate: Date | null;
  primaryImageUrl: string | null;
  series: {
    id: string;
    slug: string;
    name: string;
    seriesType: string;
  };
  ip: {
    id: string;
    slug: string;
    name: string;
    nameLocalized: string | null;
  };
  characters: Array<{
    id: string;
    slug: string;
    name: string;
    isPrimary: boolean;
    sortOrder: number;
  }>;
  tags: Array<{
    id: string;
    slug: string;
    name: string;
  }>;
};

export async function getPublishedGoodsCardsByIds(goodsIds: readonly string[]) {
  const db = getDb();

  if (goodsIds.length === 0) {
    return [] satisfies GoodsCardData[];
  }

  const [baseRows, imageRows, characterRows, tagRows] = await Promise.all([
    db
      .select({
        id: goods.id,
        slug: goods.slug,
        skuCode: goods.skuCode,
        name: goods.name,
        description: goods.description,
        goodsType: goods.goodsType,
        material: goods.material,
        sizeLabel: goods.sizeLabel,
        edition: goods.edition,
        releaseDate: goods.releaseDate,
        seriesId: series.id,
        seriesSlug: series.slug,
        seriesName: series.name,
        seriesType: series.seriesType,
        ipId: ips.id,
        ipSlug: ips.slug,
        ipName: ips.name,
        ipNameLocalized: ips.nameLocalized,
      })
      .from(goods)
      .innerJoin(
        series,
        and(eq(goods.seriesId, series.id), eq(series.status, 'published')),
      )
      .innerJoin(ips, and(eq(series.ipId, ips.id), eq(ips.status, 'published')))
      .where(and(inArray(goods.id, goodsIds), eq(goods.status, 'published'))),
    db
      .select({
        goodsId: goodsImages.goodsId,
        imageUrl: goodsImages.imageUrl,
        isPrimary: goodsImages.isPrimary,
        sortOrder: goodsImages.sortOrder,
      })
      .from(goodsImages)
      .where(inArray(goodsImages.goodsId, goodsIds))
      .orderBy(
        asc(goodsImages.goodsId),
        desc(goodsImages.isPrimary),
        asc(goodsImages.sortOrder),
      ),
    db
      .select({
        goodsId: goodsCharacters.goodsId,
        characterId: characters.id,
        slug: characters.slug,
        name: characters.name,
        sortOrder: goodsCharacters.sortOrder,
        isPrimary: goodsCharacters.isPrimary,
      })
      .from(goodsCharacters)
      .innerJoin(
        characters,
        and(
          eq(goodsCharacters.characterId, characters.id),
          eq(characters.status, 'published'),
        ),
      )
      .where(inArray(goodsCharacters.goodsId, goodsIds))
      .orderBy(
        asc(goodsCharacters.goodsId),
        asc(goodsCharacters.sortOrder),
        desc(goodsCharacters.isPrimary),
      ),
    db
      .select({
        goodsId: goodsTags.goodsId,
        tagId: tags.id,
        slug: tags.slug,
        name: tags.name,
      })
      .from(goodsTags)
      .innerJoin(tags, eq(goodsTags.tagId, tags.id))
      .where(inArray(goodsTags.goodsId, goodsIds))
      .orderBy(asc(goodsTags.goodsId), asc(tags.name)),
  ]);

  const primaryImageByGoodsId = new Map<string, string | null>();
  const charactersByGoodsId = new Map<string, GoodsCardData['characters']>();
  const tagsByGoodsId = new Map<string, GoodsCardData['tags']>();

  for (const row of imageRows) {
    if (!primaryImageByGoodsId.has(row.goodsId)) {
      primaryImageByGoodsId.set(row.goodsId, row.imageUrl);
    }
  }

  for (const row of characterRows) {
    const existing = charactersByGoodsId.get(row.goodsId) ?? [];

    existing.push({
      id: row.characterId,
      slug: row.slug,
      name: row.name,
      isPrimary: row.isPrimary,
      sortOrder: row.sortOrder,
    });

    charactersByGoodsId.set(row.goodsId, existing);
  }

  for (const row of tagRows) {
    const existing = tagsByGoodsId.get(row.goodsId) ?? [];

    existing.push({
      id: row.tagId,
      slug: row.slug,
      name: row.name,
    });

    tagsByGoodsId.set(row.goodsId, existing);
  }

  const baseByGoodsId = new Map(
    baseRows.map((row) => [
      row.id,
      {
        id: row.id,
        slug: row.slug,
        skuCode: row.skuCode,
        name: row.name,
        description: row.description,
        goodsType: row.goodsType,
        material: row.material,
        sizeLabel: row.sizeLabel,
        edition: row.edition,
        releaseDate: row.releaseDate,
        primaryImageUrl: primaryImageByGoodsId.get(row.id) ?? null,
        series: {
          id: row.seriesId,
          slug: row.seriesSlug,
          name: row.seriesName,
          seriesType: row.seriesType,
        },
        ip: {
          id: row.ipId,
          slug: row.ipSlug,
          name: row.ipName,
          nameLocalized: row.ipNameLocalized,
        },
        characters: charactersByGoodsId.get(row.id) ?? [],
        tags: tagsByGoodsId.get(row.id) ?? [],
      } satisfies GoodsCardData,
    ]),
  );

  return goodsIds
    .map((goodsId) => baseByGoodsId.get(goodsId))
    .filter((row): row is GoodsCardData => Boolean(row));
}

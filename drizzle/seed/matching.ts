import { demoViewers } from '../../lib/config/demo-viewers';

const collectorId = demoViewers.collector.userId;
const traderId = demoViewers.trader.userId;
const reviewerId = demoViewers.reviewer.userId;

export const matchingSeedSlugs = [
  'aoi-tsukishiro-spring-bloom-acrylic-stand',
  'ren-kagetsu-spring-bloom-glitter-can-badge',
  'aoi-ren-spring-bloom-foil-mini-shikishi',
  'sora-amane-voltage-shift-hologram-badge',
] as const;

type GoodsRef = {
  id: string;
  name: string;
  slug: string;
  skuCode: string;
  goodsType: string;
  primaryImageUrl: string | null;
};

/** Stable three-account fixture for bilateral and cycle matching acceptance. */
export function buildMatchingUserGoods(
  goodsBySlug: Map<string, GoodsRef>,
): Array<{
  userId: string;
  goodsId: string;
  status: string;
  note: string;
  quantity: number;
  tradableQuantity: number;
  wishlistPriority: 'normal' | 'super_want';
  litAt?: Date | null;
}> {
  const rows: ReturnType<typeof buildMatchingUserGoods> = [];
  const add = (
    userId: string,
    slug: (typeof matchingSeedSlugs)[number],
    status: 'wanted' | 'exchange',
    note: string,
  ) => {
    const good = goodsBySlug.get(slug);
    if (!good) return;

    if (status === 'exchange') {
      rows.push({
        userId,
        goodsId: good.id,
        status: 'owned',
        note: '演示账号：已通过实物识别点亮。',
        quantity: 1,
        tradableQuantity: 0,
        wishlistPriority: 'normal',
        litAt: new Date('2026-08-01T09:00:00.000Z'),
      });
    }

    rows.push({
      userId,
      goodsId: good.id,
      status,
      note,
      quantity: 1,
      tradableQuantity: status === 'exchange' ? 1 : 0,
      wishlistPriority:
        status === 'wanted' && note.includes('想要') ? 'super_want' : 'normal',
      litAt: null,
    });
  };

  add(
    collectorId,
    'aoi-tsukishiro-spring-bloom-acrylic-stand',
    'exchange',
    '重复入手，可换。',
  );
  add(
    collectorId,
    'ren-kagetsu-spring-bloom-glitter-can-badge',
    'wanted',
    '想补这只吧唧。',
  );
  add(
    collectorId,
    'sora-amane-voltage-shift-hologram-badge',
    'wanted',
    '想要这枚镭射徽章。',
  );
  add(
    traderId,
    'ren-kagetsu-spring-bloom-glitter-can-badge',
    'exchange',
    '多抽的一只，可换。',
  );
  add(
    traderId,
    'aoi-ren-spring-bloom-foil-mini-shikishi',
    'wanted',
    '想要这张双人色纸。',
  );
  add(
    reviewerId,
    'aoi-ren-spring-bloom-foil-mini-shikishi',
    'exchange',
    '重复色纸，可换。',
  );
  add(
    reviewerId,
    'sora-amane-voltage-shift-hologram-badge',
    'exchange',
    '多出的徽章，可换。',
  );
  add(
    reviewerId,
    'aoi-tsukishiro-spring-bloom-acrylic-stand',
    'wanted',
    '想要这只立牌。',
  );

  return rows;
}

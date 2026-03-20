import { z } from 'zod';

export const goodsRatingDimensionMeta = [
  {
    key: 'artworkScore',
    label: '柄图',
    title: '柄图表现',
    description: '角色立绘、姿势、裁切和整体观感是否足够吸引人。',
  },
  {
    key: 'craftsmanshipScore',
    label: '做工',
    title: '做工质量',
    description: '印刷、装配、表面处理和整体一致性是否到位。',
  },
  {
    key: 'valueScore',
    label: '性价比',
    title: '价格价值',
    description: '结合售价与实物表现，是否觉得值这个价格。',
  },
  {
    key: 'rarityScore',
    label: '稀有度',
    title: '稀有程度',
    description: '获取难度、活动限定属性和补全压力如何。',
  },
  {
    key: 'satisfactionScore',
    label: '满意度',
    title: '总体满意度',
    description: '入手或见到实物后，整体收藏满足感如何。',
  },
] as const;

export const goodsRatingDimensionKeys = goodsRatingDimensionMeta.map(
  (item) => item.key,
);

export type GoodsRatingDimensionKey =
  (typeof goodsRatingDimensionMeta)[number]['key'];

export const goodsRatingVerdictValues = [
  'positive',
  'neutral',
  'negative',
] as const;

export const goodsRatingVerdictSchema = z.enum(goodsRatingVerdictValues);

export type GoodsRatingVerdict = (typeof goodsRatingVerdictValues)[number];

export const goodsRatingVerdictMeta: Record<
  GoodsRatingVerdict,
  {
    label: string;
    description: string;
  }
> = {
  positive: {
    label: '夯',
    description: '强烈推荐，或者整体评价非常高。',
  },
  neutral: {
    label: '中立',
    description: '评价偏中性，需要看个人偏好和场景。',
  },
  negative: {
    label: '拉',
    description: '不太推荐，或者存在明显短板。',
  },
};

export const goodsRatingScoreSchema = z.coerce.number().int().min(1).max(5);

export const goodsRatingValueSchema = z.object({
  artworkScore: goodsRatingScoreSchema,
  craftsmanshipScore: goodsRatingScoreSchema,
  valueScore: goodsRatingScoreSchema,
  rarityScore: goodsRatingScoreSchema,
  satisfactionScore: goodsRatingScoreSchema,
  worthBuying: z.boolean(),
  overallTag: goodsRatingVerdictSchema,
});

export type GoodsRatingValues = z.infer<typeof goodsRatingValueSchema>;

export function calculateGoodsRatingScore({
  artworkScore,
  craftsmanshipScore,
  valueScore,
  rarityScore,
  satisfactionScore,
}: Pick<
  GoodsRatingValues,
  | 'artworkScore'
  | 'craftsmanshipScore'
  | 'valueScore'
  | 'rarityScore'
  | 'satisfactionScore'
>) {
  const average =
    (artworkScore +
      craftsmanshipScore +
      valueScore +
      rarityScore +
      satisfactionScore) /
    goodsRatingDimensionMeta.length;

  return average.toFixed(2);
}

export function createDefaultGoodsRatingValues(): GoodsRatingValues {
  return {
    artworkScore: 3,
    craftsmanshipScore: 3,
    valueScore: 3,
    rarityScore: 3,
    satisfactionScore: 3,
    worthBuying: false,
    overallTag: 'neutral',
  };
}

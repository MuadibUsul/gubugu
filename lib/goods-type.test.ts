import { describe, expect, it } from 'vitest';

import {
  classifyGoodsType,
  GOODS_TYPE_KEYS,
  goodsTypeLabel,
  goodsTypeShort,
} from './goods-type';

describe('classifyGoodsType — 形态优先', () => {
  it.each([
    ['『咒术回战』5周年 アクリルスタンド／五条 悟', 'standee'],
    ['亚克力立牌', 'standee'],
    ['缶バッジ 第3弾', 'badge'],
    ['ホロEYE缶バッジ', 'badge'],
    ['アクリルキーホルダー', 'charm'],
    ['亚克力挂件', 'charm'],
    ['ラバーストラップ', 'charm'],
    ['ミニ色紙', 'shikishi'],
    ['ブロマイドセット', 'card'],
    ['クリアカード', 'card'],
    ['トレーディングカード', 'card'],
    ['タペストリー', 'tapestry'],
    ['フィギュア', 'figure'],
    // 材质不作类型：纯亚克力块归其他；抽赏/くじ 套系没有单一形态，归其他。
    ['アクリルブロック', 'other'],
    ['在线抽赏', 'other'],
    ['', 'other'],
  ])('%s → %s', (hint, expected) => {
    expect(classifyGoodsType(hint)).toBe(expected);
  });

  it('每个键都能分类且落在 8 类内', () => {
    expect(GOODS_TYPE_KEYS).toHaveLength(8);
    expect(new Set(GOODS_TYPE_KEYS).size).toBe(8);
  });
});

describe('goodsTypeLabel — 中文（English）', () => {
  it('固定类型给出双语标签', () => {
    expect(goodsTypeLabel('badge')).toBe('吧唧（Badge）');
    expect(goodsTypeLabel('card')).toBe('卡片（Card）');
    expect(goodsTypeLabel('other')).toBe('其他（Other）');
  });

  it('紧凑标签只给中文', () => {
    expect(goodsTypeShort('standee')).toBe('立牌');
    expect(goodsTypeShort('other')).toBe('其他');
  });
});

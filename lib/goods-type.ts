/**
 * 商品类型（形态优先）。谷圈按「东西是什么」分类，不按材质——所以「亚克力」是材质、不作
 * 类型：亚克力立牌归「立牌」、亚克力挂件归「挂件」，纯亚克力块才进「其他」。材质另做标签/筛选。
 *
 * 这是类型的单一真源：枚举值、中日英匹配词、以及「中文（English）」展示标签都在这里。
 */
export type GoodsTypeKey =
  | 'badge'
  | 'standee'
  | 'charm'
  | 'shikishi'
  | 'card'
  | 'figure'
  | 'tapestry'
  | 'other';

type GoodsTypeDef = {
  key: GoodsTypeKey;
  zh: string;
  en: string;
  /** 分类匹配词（对商品名 / 类型线索做正则匹配，含中日英常见叫法）。 */
  match: RegExp;
};

// 顺序即分类优先级：靠前的先匹配。「其他」是兜底，不参与匹配。
export const GOODS_TYPES: readonly GoodsTypeDef[] = [
  {
    key: 'badge',
    zh: '吧唧',
    en: 'Badge',
    match: /缶バッ|can\s*badge|tin\s*badge|吧唧|徽章|バッジ|badge/i,
  },
  {
    key: 'standee',
    zh: '立牌',
    en: 'Standee',
    match: /アクリルスタンド|アクスタ|acrylic\s*stand|立牌|スタンドポップ|スタンド|standee|台座/i,
  },
  {
    key: 'charm',
    zh: '挂件',
    en: 'Charm',
    match: /アクリルキーホルダー|アクキー|キーホルダー|keychain|挂件|钥匙扣|charm|ラバスト|ストラップ|rubber\s*strap|strap/i,
  },
  {
    key: 'shikishi',
    zh: '色纸',
    en: 'Shikishi',
    match: /ミニ色紙|色紙|色纸|shikishi|アートボード|art\s*board|艺术板/i,
  },
  {
    key: 'card',
    zh: '卡片',
    en: 'Card',
    match: /ブロマイド|bromide|トレーディングカード|トレカ|trading\s*card|クリアカード|clear\s*card|透卡|小卡|写真|photo\s*card|photo\s*set|收藏卡|カード/i,
  },
  {
    key: 'figure',
    zh: '手办',
    en: 'Figure',
    match: /フィギュア|figure|手办|ねんどろいど|nendoroid|スケール/i,
  },
  {
    key: 'tapestry',
    zh: '挂画',
    en: 'Tapestry',
    match: /タペストリー|tapestry|挂画|ポスター|poster|海报/i,
  },
];

export const GOODS_TYPE_KEYS: readonly GoodsTypeKey[] = [
  ...GOODS_TYPES.map((t) => t.key),
  'other',
];

/**
 * 从一段线索（商品名 / 原始类型）判定类型，形态优先；匹配不到归「其他」。
 */
export function classifyGoodsType(hint: string | null | undefined): GoodsTypeKey {
  const text = (hint ?? '').trim();
  if (!text) return 'other';
  return GOODS_TYPES.find((t) => t.match.test(text))?.key ?? 'other';
}

/** 「中文（English）」展示标签，如「吧唧（Badge）」。未知值兜底原样。 */
export function goodsTypeLabel(key: string | null | undefined): string {
  if (!key) return '其他（Other）';
  const def = GOODS_TYPES.find((t) => t.key === key);
  if (def) return `${def.zh}（${def.en}）`;
  if (key === 'other') return '其他（Other）';
  return key;
}

/** 紧凑中文标签（筛选芯片等空间紧张处用），如「吧唧」。 */
export function goodsTypeShort(key: string | null | undefined): string {
  if (!key) return '其他';
  const def = GOODS_TYPES.find((t) => t.key === key);
  if (def) return def.zh;
  return key === 'other' ? '其他' : key;
}

/**
 * 稀有度徽章：把社区「稀有度」评分（rarityScore 1-5 的平均值）显示成一枚绶带徽标。
 * 图放在 public/rarity/，从 VI 图标集里切出并清理。5 档对应 tier 1-5。
 */
export type RarityBadge = {
  tier: 1 | 2 | 3 | 4 | 5;
  label: string;
  src: string;
};

const RARITY_BADGES: readonly RarityBadge[] = [
  { tier: 1, label: '普通', src: '/rarity/tier1.png' },
  { tier: 2, label: '稀有', src: '/rarity/tier2.png' },
  { tier: 3, label: '史诗', src: '/rarity/tier3.png' },
  { tier: 4, label: 'SSR', src: '/rarity/tier4.png' },
  { tier: 5, label: '限定', src: '/rarity/tier5.png' },
] as const;

/**
 * 社区平均稀有度评分（1-5）→ 稀有度徽章。四舍五入夹在 1-5。
 * 无人评分返回 null —— 未评定不等于「普通」，此时不显示徽章，避免误导。
 */
export function rarityBadgeFor(
  rarityAverage: number | null | undefined,
): RarityBadge | null {
  if (rarityAverage == null || !Number.isFinite(rarityAverage)) return null;
  const tier = Math.min(5, Math.max(1, Math.round(rarityAverage))) as
    | 1
    | 2
    | 3
    | 4
    | 5;
  return RARITY_BADGES[tier - 1];
}

/**
 * 收藏相框：只用于「谷柜 / 收藏展示」里已拥有的藏品，按社区平均稀有度评分（1-5）分档。
 * 相框图放在 public/frames/，中心透空。`inset` 是每张相框实测的开口位置（占卡片百分比），
 * 卡纸取略大于开口（约 -1.2%）以压住接缝、不漏图。
 */
export type CollectionFrame = {
  tier: 1 | 2 | 3 | 4 | 5;
  label: string;
  src: string;
  /** 卡纸窗口相对卡片的 inset（%）。 */
  mat: { top: number; right: number; bottom: number; left: number };
};

export const COLLECTION_FRAMES: readonly CollectionFrame[] = [
  {
    tier: 1,
    label: '普通',
    src: '/frames/frame1.png',
    mat: { top: 8.1, right: 10.5, bottom: 7.5, left: 10.4 },
  },
  {
    tier: 2,
    label: '稀有',
    src: '/frames/frame2.png',
    mat: { top: 10.5, right: 11, bottom: 10.6, left: 10.8 },
  },
  {
    tier: 3,
    label: '史诗',
    src: '/frames/frame3.png',
    mat: { top: 16.5, right: 11.1, bottom: 12.7, left: 11 },
  },
  {
    tier: 4,
    label: 'SSR',
    src: '/frames/frame4.png',
    mat: { top: 13.5, right: 14.3, bottom: 14, left: 14.2 },
  },
  {
    tier: 5,
    label: '限定',
    src: '/frames/frame5.png',
    mat: { top: 17.6, right: 10.5, bottom: 17.3, left: 10.4 },
  },
] as const;

/**
 * 平均稀有度评分（1-5）→ 相框档位。四舍五入并夹在 1-5；无人评分（null）默认最基础的第 1 款，
 * 评分够了自动升级到对应档。
 */
export function frameForRarity(
  rarityAverage: number | null | undefined,
): CollectionFrame {
  if (rarityAverage == null || !Number.isFinite(rarityAverage)) {
    return COLLECTION_FRAMES[0];
  }
  const tier = Math.min(5, Math.max(1, Math.round(rarityAverage)));
  return COLLECTION_FRAMES[tier - 1];
}

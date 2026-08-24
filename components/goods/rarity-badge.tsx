import { rarityBadgeFor } from '@/lib/rarity-badge';

/**
 * 稀有度徽标：按社区平均稀有度评分显示一枚绶带 + 档位文字。无人评分不渲染。
 * 绶带是小尺寸静态 PNG，用普通 <img> 即可（无需 next/image 的 fill/尺寸约束）。
 */
export function RarityBadge({
  rarityAverage,
}: {
  rarityAverage: number | null;
}) {
  const badge = rarityBadgeFor(rarityAverage);
  if (!badge) return null;

  return (
    <span
      className="chip inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px]"
      title={`社区评定稀有度 · ${badge.label}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt=""
        aria-hidden
        decoding="async"
        src={badge.src}
        style={{ height: 18, width: 'auto' }}
      />
      {badge.label}
    </span>
  );
}

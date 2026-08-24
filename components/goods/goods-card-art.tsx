import type { ReactNode } from 'react';

import { RemoteImage } from '@/components/ui/remote-image';
import { isCatalogAssetUrl } from '@/lib/goods-image';

type GoodsCardArtProps = {
  imageUrl: string | null;
  /** Describes the item, not the picture — screen readers announce it in place
   *  of the art. The background-image treatment this replaced exposed nothing. */
  alt: string;
  /** Rendered width at each breakpoint, not the intrinsic image size. */
  sizes: string;
  className?: string;
  /** Set on art that is above the fold; it opts out of lazy loading. */
  priority?: boolean;
  children?: ReactNode;
};

/**
 * The art plate of a goods card. Owns the element the lighting treatment in
 * globals.css hangs off (.goods-card__art-image), so lit and dormant states
 * stay defined in one place rather than at each call site.
 */
export function GoodsCardArt({
  imageUrl,
  alt,
  sizes,
  className = '',
  priority = false,
  children,
}: GoodsCardArtProps) {
  // 目录图按内容原始比例存储，用 contain 完整呈现（不裁切宽图），卡片尺寸仍由外层统一。
  // 用 inline style 而非自定义类：动态拼接的类名会被 Tailwind v4 的内容扫描 tree-shake 掉，
  // inline style 保证生效，且优先级高过 .goods-card__art-image 的 object-fit: cover。
  const fitContain = isCatalogAssetUrl(imageUrl);

  return (
    <div
      className={`goods-card__art ${className}`}
      style={fitContain ? { background: 'rgb(250, 247, 249)' } : undefined}
    >
      {imageUrl ? (
        <RemoteImage
          alt={alt}
          className="goods-card__art-image"
          priority={priority}
          sizes={sizes}
          src={imageUrl}
          style={fitContain ? { objectFit: 'contain' } : undefined}
        />
      ) : null}

      {children}
    </div>
  );
}

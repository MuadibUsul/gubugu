import type { ReactNode } from 'react';

import { RemoteImage } from '@/components/ui/remote-image';

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
  return (
    <div className={`goods-card__art ${className}`}>
      {imageUrl ? (
        <RemoteImage
          alt={alt}
          className="goods-card__art-image"
          priority={priority}
          sizes={sizes}
          src={imageUrl}
        />
      ) : null}

      {children}
    </div>
  );
}

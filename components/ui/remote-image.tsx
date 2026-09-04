import type { CSSProperties } from 'react';
import Image from 'next/image';

import { isOptimizableImageUrl } from '@/lib/goods-image';

type RemoteImageProps = {
  src: string;
  alt: string;
  /** Rendered width at each breakpoint, used to pick a srcset entry. */
  sizes: string;
  className?: string;
  /** Inline overrides (e.g. object-fit) that must beat the .goods-card CSS. */
  style?: CSSProperties;
  /** Set on art above the fold; opts out of lazy loading. */
  priority?: boolean;
  /** Fetch directly in the browser so authenticated image routes receive cookies. */
  privateSource?: boolean;
};

/**
 * Fills its positioned parent with an image, using next/image when the URL is
 * one next/image is allowed to fetch and a plain lazy <img> otherwise.
 *
 * The fallback exists because goods_images.image_url and post_images.image_url
 * accept any absolute URL, while next/image only accepts internal paths and
 * hosts listed in images.remotePatterns. Without it, migrating to next/image
 * would stop rendering images that work today.
 */
export function RemoteImage({
  src,
  alt,
  sizes,
  className = '',
  style,
  priority = false,
  privateSource = false,
}: RemoteImageProps) {
  if (!privateSource && isOptimizableImageUrl(src)) {
    return (
      <Image
        alt={alt}
        className={className}
        fill
        priority={priority}
        sizes={sizes}
        src={src}
        style={style}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt={alt}
      className={className}
      decoding="async"
      loading={priority ? 'eager' : 'lazy'}
      src={src}
      style={style}
    />
  );
}

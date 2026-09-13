export const IMAGE_WIDTHS = [160, 320, 640, 960, 1280] as const;
export type ImageWidth = (typeof IMAGE_WIDTHS)[number];

/** Only our asset endpoints implement w; leave external/blob/demo URLs alone. */
export function imagePreviewProps(src: string, sizes: string) {
  if (
    !/^\/catalog-assets\/[a-f0-9]{64}\.webp(?:\?|$)/.test(src) &&
    !/^\/api\/(?:user-scans\/[\da-f-]+\/image|post-images\/[\da-f-]+)(?:\?|$)/i.test(
      src,
    )
  ) {
    return { src };
  }
  const url = new URL(src, 'https://asset.invalid');
  const atWidth = (width: ImageWidth) => {
    url.searchParams.set('w', String(width));
    return `${url.pathname}${url.search}`;
  };
  return {
    src: atWidth(320),
    sizes,
    srcSet: IMAGE_WIDTHS.map((width) => `${atWidth(width)} ${width}w`).join(
      ', ',
    ),
  };
}

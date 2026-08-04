import type { CSSProperties } from 'react';

import { toCssUrl } from '@/lib/css-url';
import type { GoodsDetailPageData } from '@/server/data';

type GoodsGalleryProps = {
  goods: GoodsDetailPageData;
};

export function GoodsGallery({ goods }: GoodsGalleryProps) {
  const primaryImage =
    goods.images.find((image) => image.isPrimary) ?? goods.images[0];
  const secondaryImages = goods.images.filter(
    (image) => image.id !== primaryImage?.id,
  );
  const primaryArtUrl = toCssUrl(primaryImage?.imageUrl);

  return (
    <section className="space-y-4">
      <div className="collection-panel goods-plate relative overflow-hidden p-4">
        <div
          className="goods-card__art border-border/70 aspect-[4/5] rounded-[1.8rem] border"
          style={
            primaryArtUrl
              ? ({ '--goods-card-art': primaryArtUrl } as CSSProperties)
              : undefined
          }
        >
          {!primaryImage ? (
            <div className="goods-card__art-content flex h-full items-end p-5">
              <div className="border-border/70 bg-background/80 max-w-xs rounded-[1.4rem] border border-dashed px-4 py-3 backdrop-blur">
                <p className="text-muted-foreground text-[0.68rem] font-semibold tracking-[0.28em] uppercase">
                  图片待补充
                </p>
                <p className="text-muted-foreground mt-2 text-sm leading-7">
                  这个 SKU 暂时还没有补充官方图库图片。
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {secondaryImages.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {secondaryImages.map((image) => {
            const artUrl = toCssUrl(image.imageUrl);

            return (
              <div
                className="collection-panel goods-plate relative overflow-hidden p-3"
                key={image.id}
              >
                <div
                  className="goods-card__art border-border/70 aspect-[1/1] rounded-[1.35rem] border"
                  style={
                    artUrl
                      ? ({ '--goods-card-art': artUrl } as CSSProperties)
                      : undefined
                  }
                />
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

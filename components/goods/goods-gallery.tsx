import { GoodsCardArt } from '@/components/goods/goods-card-art';
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

  return (
    <section className="space-y-4">
      <div className="collection-panel goods-plate relative overflow-hidden p-4">
        <GoodsCardArt
          // Falls back to the SKU name when the record has no alt text, so the
          // image is never announced as unlabelled.
          alt={primaryImage?.altText ?? goods.name}
          className="border-border/70 aspect-[4/5] rounded-[var(--radius)] border"
          imageUrl={primaryImage?.imageUrl ?? null}
          // The largest element above the fold on a SKU page, and the LCP
          // candidate — it must not be lazy loaded.
          priority
          sizes="(max-width: 1023px) 100vw, 40vw"
        >
          {!primaryImage ? (
            <div className="goods-card__art-content flex h-full items-end p-5">
              <div className="border-border/70 bg-background/80 max-w-xs rounded-[var(--radius)] border border-dashed px-4 py-3">
                <p className="text-muted-foreground text-[0.68rem] font-semibold uppercase">
                  图片待补充
                </p>
                <p className="text-muted-foreground mt-2 text-sm leading-7">
                  这个 SKU 暂时还没有补充官方图库图片。
                </p>
              </div>
            </div>
          ) : null}
        </GoodsCardArt>
      </div>

      {secondaryImages.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {secondaryImages.map((image) => (
            <div
              className="collection-panel goods-plate relative overflow-hidden p-3"
              key={image.id}
            >
              <GoodsCardArt
                alt={image.altText ?? goods.name}
                className="border-border/70 aspect-[1/1] rounded-[var(--radius)] border"
                imageUrl={image.imageUrl}
                sizes="(max-width: 639px) 100vw, 15vw"
              />
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

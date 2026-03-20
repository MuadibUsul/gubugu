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
      <div className="collection-panel relative overflow-hidden p-4">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--accent)_10%,transparent),transparent_36%,color-mix(in_oklab,var(--background)_88%,var(--card))_100%)]" />
        <div
          className="border-border/70 relative aspect-[4/5] overflow-hidden rounded-[1.8rem] border bg-[color:color-mix(in_oklab,var(--background)_86%,var(--card))] bg-cover bg-center"
          style={
            primaryImage
              ? {
                  backgroundImage: `url(${primaryImage.imageUrl})`,
                }
              : undefined
          }
        >
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,color-mix(in_oklab,white_18%,transparent)_42%,transparent_100%)]" />

          {!primaryImage ? (
            <div className="flex h-full items-end p-5">
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
          {secondaryImages.map((image) => (
            <div
              className="collection-panel relative overflow-hidden p-3"
              key={image.id}
            >
              <div
                className="border-border/70 aspect-[1/1] rounded-[1.35rem] border bg-[color:color-mix(in_oklab,var(--background)_86%,var(--card))] bg-cover bg-center"
                style={{
                  backgroundImage: `url(${image.imageUrl})`,
                }}
              />
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

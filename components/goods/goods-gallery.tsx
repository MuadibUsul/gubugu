import { GoodsCardArt } from '@/components/goods/goods-card-art';

// 客户端组件只依赖它真正用到的字段，避免从 `@/server/data`（server-only 桶）引入类型。
type GoodsGalleryImage = {
  id: string;
  imageUrl: string;
  altText: string | null;
  isPrimary: boolean;
};

type GoodsGalleryProps = {
  goods: {
    name: string;
    images: GoodsGalleryImage[];
  };
};

/**
 * SKU 图廊：多图**横向滑动**（scroll-snap 原生触摸滑动，无需 JS 水合）。主图在前，
 * 其余按序排在同一横向轨道里，一屏一张、吸附对齐。数据侧已把主图排到首位。
 */
export function GoodsGallery({ goods }: GoodsGalleryProps) {
  const primaryImage =
    goods.images.find((image) => image.isPrimary) ?? goods.images[0];

  if (!primaryImage) {
    return (
      <section>
        <div className="goods-plate relative overflow-hidden p-4">
          <GoodsCardArt
            alt={goods.name}
            className="aspect-[4/5] rounded-[var(--radius)] border border-[var(--rule)]"
            imageUrl={null}
            priority
            sizes="(max-width: 1023px) 100vw, 40vw"
          >
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
          </GoodsCardArt>
        </div>
      </section>
    );
  }

  // 主图排首位，其余按原顺序跟随。
  const images = [
    primaryImage,
    ...goods.images.filter((image) => image.id !== primaryImage.id),
  ];

  return (
    <section>
      <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto [scrollbar-width:none]">
        {images.map((image, index) => (
          <div
            className="flex w-full flex-none snap-center items-center justify-center overflow-hidden rounded-[var(--radius)] border border-[var(--rule)] bg-[var(--sunken)]"
            key={`slide-${image.id}`}
          >
            {/* 以图的横向宽度为准，自然高度铺满、尽量显示全，不留大面积空白。 */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt={image.altText ?? goods.name}
              className="block h-auto w-full"
              loading={index === 0 ? 'eager' : 'lazy'}
              src={image.imageUrl}
            />
          </div>
        ))}
      </div>

      {images.length > 1 ? (
        <p className="text-muted-foreground mt-1.5 text-center text-[11px]">
          ← 左右滑动查看 {images.length} 张官图 →
        </p>
      ) : null}
    </section>
  );
}

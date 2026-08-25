import { GoodsCardArt } from '@/components/goods/goods-card-art';

// 客户端组件只依赖它真正用到的字段，避免从 `@/server/data`（server-only 桶）引入类型。
// 结构上与 GoodsDetailPageData 兼容，调用方仍可直接传完整的 goods。
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
 * SKU 图廊：点缩略图切换主图。用纯 CSS（隐藏的单选框 + `:checked ~` 兄弟选择器）实现，
 * 不依赖 JavaScript——本站页面主体走渐进增强、基本不做客户端水合，纯 CSS 才能保证切换在任何
 * 环境都生效。每张图配一个隐藏 radio，缩略图是它的 label，选中谁就显示谁那张主图。
 */
export function GoodsGallery({ goods }: GoodsGalleryProps) {
  const images = goods.images;
  const primaryImage =
    images.find((image) => image.isPrimary) ?? images[0];

  if (!primaryImage) {
    return (
      <section className="space-y-4">
        <div className="collection-panel goods-plate relative overflow-hidden p-4">
          <GoodsCardArt
            alt={goods.name}
            className="border-border/70 aspect-[4/5] rounded-[var(--radius)] border"
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

  // radio 组名按主图 id 命名，避免同页多图廊串组。
  const groupName = `gallery-${primaryImage.id}`;
  const selId = (id: string) => `gsel-${primaryImage.id}-${id}`;

  // 每张图两条规则：选中它的 radio 时，显示对应主图 slide、并高亮对应缩略图。图片数很少
  // （详情最多 4 张），内联样式块极小，也不受 Tailwind 内容扫描 tree-shake 影响。
  const scopedCss =
    `.goods-gallery__slide{display:none}` +
    `.goods-gallery__thumb{opacity:.62;transition:opacity .15s ease}` +
    `.goods-gallery__thumb:hover{opacity:.85}` +
    images
      .map(
        (image) =>
          `#${selId(image.id)}:checked~.goods-gallery__stage [data-slide="${image.id}"]{display:block}` +
          `#${selId(image.id)}:checked~.goods-gallery__thumbs [data-thumb="${image.id}"]{opacity:1;outline:2px solid var(--shu);outline-offset:2px}`,
      )
      .join('');

  return (
    <section className="space-y-4">
      <style dangerouslySetInnerHTML={{ __html: scopedCss }} />

      {/* 隐藏的单选框，必须排在 stage/thumbs 之前作为兄弟节点，`:checked ~` 才能命中。 */}
      {images.map((image) => (
        <input
          aria-label={image.altText ?? `${goods.name} 官图`}
          className="sr-only goods-gallery__pick"
          defaultChecked={image.id === primaryImage.id}
          id={selId(image.id)}
          key={`pick-${image.id}`}
          name={groupName}
          type="radio"
        />
      ))}

      <div className="goods-gallery__stage collection-panel goods-plate relative overflow-hidden p-4">
        {images.map((image, index) => (
          <div
            className="goods-gallery__slide"
            data-slide={image.id}
            key={`slide-${image.id}`}
          >
            <GoodsCardArt
              alt={image.altText ?? goods.name}
              className="border-border/70 aspect-[4/5] rounded-[var(--radius)] border"
              imageUrl={image.imageUrl}
              // 主图是首屏 LCP 候选：仅首张（默认选中）预加载，其余懒加载。
              priority={index === 0}
              sizes="(max-width: 1023px) 100vw, 40vw"
            />
          </div>
        ))}
      </div>

      {images.length > 1 ? (
        <div className="goods-gallery__thumbs grid gap-3 sm:grid-cols-3">
          {images.map((image) => (
            <label
              className="goods-gallery__thumb collection-panel goods-plate relative block cursor-pointer overflow-hidden rounded-[var(--radius)] p-3"
              data-thumb={image.id}
              htmlFor={selId(image.id)}
              key={`thumb-${image.id}`}
            >
              <GoodsCardArt
                alt={image.altText ?? goods.name}
                className="border-border/70 aspect-[1/1] rounded-[var(--radius)] border"
                imageUrl={image.imageUrl}
                sizes="(max-width: 639px) 100vw, 15vw"
              />
            </label>
          ))}
        </div>
      ) : null}
    </section>
  );
}

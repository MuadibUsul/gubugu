'use client';

import { useState } from 'react';

import { HoloCard } from '@/components/collection/holo-card';

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
 * 谷子图廊：主图是一张**可交互全息大卡**（倾斜/箔面/眩光/陀螺仪，移植自
 * pokemon-cards-css），多图时下方一排缩略图切换。数据侧已把主图排到首位。
 */
export function GoodsGallery({ goods }: GoodsGalleryProps) {
  const primaryImage =
    goods.images.find((image) => image.isPrimary) ?? goods.images[0];

  const images = primaryImage
    ? [
        primaryImage,
        ...goods.images.filter((image) => image.id !== primaryImage.id),
      ]
    : [];

  const [activeId, setActiveId] = useState(primaryImage?.id ?? '');
  const active = images.find((image) => image.id === activeId) ?? primaryImage;

  if (!active) {
    return (
      <section>
        <div className="flex aspect-[3/4] items-center justify-center rounded-[var(--radius)] border border-dashed border-[var(--rule)] bg-[var(--surface)]">
          <div className="max-w-xs px-4 text-center">
            <p className="text-muted-foreground text-[0.68rem] font-semibold uppercase">
              图片待补充
            </p>
            <p className="text-muted-foreground mt-2 text-sm leading-7">
              这个谷子暂时还没有补充官方图库图片。
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="mx-auto w-full max-w-[420px]">
        <HoloCard
          alt={active.altText ?? goods.name}
          key={active.id}
          src={active.imageUrl}
        />
      </div>

      {images.length > 1 ? (
        <div className="mt-3 flex justify-center gap-2">
          {images.map((image) => {
            const on = image.id === active.id;
            return (
              <button
                aria-label={image.altText ?? goods.name}
                aria-pressed={on}
                className={`size-14 flex-none overflow-hidden rounded-[8px] border transition ${
                  on
                    ? 'border-[var(--shu)] opacity-100'
                    : 'border-[var(--rule)] opacity-60'
                }`}
                key={image.id}
                onClick={() => setActiveId(image.id)}
                type="button"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt=""
                  className="size-full object-cover"
                  loading="lazy"
                  src={image.imageUrl}
                />
              </button>
            );
          })}
        </div>
      ) : null}

      <p className="text-muted-foreground mt-2 text-center text-[11px]">
        {images.length > 1 ? `${images.length} 张官图 · ` : ''}
        倾斜手机或滑动卡面看全息反光
      </p>
    </section>
  );
}

import Link from 'next/link';

import { RemoteImage } from '@/components/ui/remote-image';
import { formatCatalogDate } from '@/lib/formatters';
import type { UserPhotoEntry } from '@/server/data';

type UserPhotoStripProps = {
  items: UserPhotoEntry[];
};

/**
 * 写真 —— 用户自己拍的实物图。
 *
 * 旧版把每条记录做成一张带标题和正文的大卡，图反而挤在角落。这里反过来：
 * 图占满，文字退成一行说明 —— 这一段的主角是照片。
 */
export function UserPhotoStrip({ items }: UserPhotoStripProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="spread border-border border-t py-14">
      <div>
        <p className="lbl">写真</p>
        <div className="rail-jp">实物记录</div>
      </div>

      <div className="min-w-0">
        <h2 className="text-[26px]">实物记录</h2>
        <div className="rule-kin mt-3" />

        <div className="mt-6 space-y-8">
          {items.map((item) => (
            <article key={item.postId}>
              <div className="flex items-baseline justify-between gap-4">
                <Link
                  className="font-heading text-[16px] font-semibold hover:text-[var(--shu)]"
                  href={`/goods/${item.goodsSlug}`}
                >
                  {item.goodsName}
                </Link>
                <span className="num shrink-0">
                  {formatCatalogDate(item.createdAt)}
                </span>
              </div>

              {item.body ? (
                <p className="text-muted-foreground mt-1 max-w-[60ch] text-[13.5px]">
                  {item.body}
                </p>
              ) : null}

              {item.images.length > 0 ? (
                <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
                  {item.images.slice(0, 4).map((image) => (
                    <div
                      className="goods-plate relative aspect-square"
                      key={image.id}
                    >
                      <div className="goods-card__art absolute inset-[9px]">
                        <RemoteImage
                          alt={image.altText ?? '用户上传的收藏图片'}
                          className="goods-card__art-image"
                          sizes="(max-width: 639px) 33vw, 16vw"
                          src={image.imageUrl}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

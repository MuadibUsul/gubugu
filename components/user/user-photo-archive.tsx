import { RemoteImage } from '@/components/ui/remote-image';
import type { UserPhotoEntry } from '@/server/data';

type UserPhotoArchiveProps = {
  items: UserPhotoEntry[];
};

export function UserPhotoArchive({ items }: UserPhotoArchiveProps) {
  return (
    <section className="space-y-5" id="photo-archive">
      <div className="collection-panel p-6 sm:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <p className="text-muted-foreground text-[0.72rem] font-semibold uppercase">
              图片
            </p>
            <div>
              <h2 className="font-heading text-foreground text-4xl leading-none sm:text-5xl">
                图片归档
              </h2>
            </div>
          </div>
        </div>
      </div>

      {items.length > 0 ? (
        <div className="grid gap-4 2xl:grid-cols-2">
          {items.map((item) => (
            <article
              className="collection-panel overflow-hidden p-5"
              key={item.postId}
            >
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-muted-foreground text-[0.68rem] font-semibold uppercase">
                    图片记录
                  </p>
                  <h3 className="font-heading text-foreground text-3xl leading-none">
                    {item.goodsName}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-7">
                    {item.body}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {item.images.length > 0 ? (
                    item.images.slice(0, 3).map((image) => (
                      <div
                        className="border-border/70 from-accent/10 to-background/82 relative h-28 overflow-hidden rounded-[var(--radius)] border bg-gradient-to-br"
                        key={image.id}
                      >
                        <RemoteImage
                          alt={image.altText ?? '用户上传的收藏图片'}
                          className="size-full object-cover object-center"
                          sizes="(max-width: 639px) 33vw, 12rem"
                          src={image.imageUrl}
                        />
                      </div>
                    ))
                  ) : (
                    <div className="border-border/65 bg-background/72 text-muted-foreground col-span-full rounded-[var(--radius)] border border-dashed px-4 py-6 text-sm">
                      暂无图片
                    </div>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="collection-panel p-6 sm:p-7">
          <div className="border-border/65 bg-background/72 rounded-[var(--radius)] border border-dashed px-5 py-8">
            <p className="text-muted-foreground text-sm">暂无图片</p>
          </div>
        </div>
      )}
    </section>
  );
}

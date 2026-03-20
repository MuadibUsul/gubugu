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
            <p className="text-muted-foreground text-[0.72rem] font-semibold tracking-[0.34em] uppercase">
              图片归档
            </p>
            <div>
              <h2 className="font-heading text-foreground text-4xl leading-none sm:text-5xl">
                收藏照片归档
              </h2>
              <p className="text-muted-foreground mt-3 text-sm leading-7 sm:text-base">
                最近的晒单图片会始终绑定在对应商品下，保留物品上下文，而不是被冲散到一个全局动态流里。
              </p>
            </div>
          </div>
          <a
            className="border-border bg-background/82 text-foreground hover:bg-muted inline-flex h-11 items-center justify-center rounded-full border px-5 text-sm font-semibold transition"
            href="#photo-archive"
          >
            留在图片归档区
          </a>
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
                  <p className="text-muted-foreground text-[0.68rem] font-semibold tracking-[0.28em] uppercase">
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
                        className="border-border/70 from-accent/10 to-background/82 h-28 rounded-[1.35rem] border bg-gradient-to-br bg-cover bg-center"
                        key={image.id}
                        style={{ backgroundImage: `url(${image.imageUrl})` }}
                      />
                    ))
                  ) : (
                    <div className="border-border/65 bg-background/72 text-muted-foreground col-span-full rounded-[1.35rem] border border-dashed px-4 py-6 text-sm">
                      这条图片记录暂时还没有可见的图片资源。
                    </div>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="collection-panel p-6 sm:p-7">
          <div className="border-border/65 bg-background/72 rounded-[1.6rem] border border-dashed px-5 py-8">
            <p className="text-muted-foreground text-sm leading-7">
              暂时还没有可见的藏家图片。通过审核、且带图片的晒单笔记会按照真实 SKU 记录显示在这里。
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

import Link from 'next/link';

import { formatCatalogCurrency, formatCatalogDate } from '@/lib/formatters';
import type { GoodsDetailPageData } from '@/server/data';

type GoodsInfoPanelsProps = {
  goods: GoodsDetailPageData;
};

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-border/60 flex flex-col gap-2 border-b py-3 first:pt-0 last:border-b-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <span className="text-muted-foreground meta-label">{label}</span>
      <span className="text-foreground max-w-full text-sm leading-7 sm:max-w-[18rem] sm:text-right">
        {value}
      </span>
    </div>
  );
}

export function GoodsInfoPanels({ goods }: GoodsInfoPanelsProps) {
  return (
    <div className="space-y-6">
      <section className="collection-panel p-5 sm:p-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-muted-foreground eyebrow-label">图鉴身份</p>
            <h1 className="font-heading text-foreground text-4xl leading-none sm:text-5xl">
              {goods.name}
            </h1>
            <p className="text-muted-foreground text-sm leading-7">
              {goods.description ??
                '这个 SKU 已经收录进图鉴，但编辑说明还没有补全。'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="hud-chip text-muted-foreground px-3 py-1 text-xs tracking-[0.18em] uppercase">
              {goods.goodsType}
            </span>
            <Link
              className="hud-chip text-muted-foreground px-3 py-1 text-xs"
              href={`/ips/${goods.ip.slug}`}
            >
              {goods.ip.name}
            </Link>
            <Link
              className="hud-chip text-muted-foreground px-3 py-1 text-xs"
              href={`/ips/${goods.ip.slug}/series/${goods.series.slug}`}
            >
              {goods.series.name}
            </Link>
            {goods.characters.map((character) => (
              <Link
                className="hud-chip text-muted-foreground px-3 py-1 text-xs"
                href={`/ips/${goods.ip.slug}/characters/${character.slug}`}
                key={character.id}
              >
                {character.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="collection-panel p-5 sm:p-6">
        <div className="space-y-4">
          <div>
            <p className="text-muted-foreground eyebrow-label">结构化属性</p>
            <h2 className="font-heading text-foreground mt-2 text-4xl leading-none">
              SKU 规格卡
            </h2>
          </div>

          <div>
            <InfoRow label="SKU" value={goods.skuCode} />
            <InfoRow label="版本" value={goods.edition ?? '标准版'} />
            <InfoRow label="材质" value={goods.material ?? '暂未收录'} />
            <InfoRow label="尺寸" value={goods.sizeLabel ?? '暂未收录'} />
            <InfoRow
              label="发售日期"
              value={formatCatalogDate(goods.releaseDate)}
            />
            <InfoRow label="系列类型" value={goods.series.seriesType} />
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="collection-panel p-5 sm:p-6">
          <p className="text-muted-foreground eyebrow-label">价格</p>
          <div className="mt-4 space-y-3">
            <div className="hud-card px-4 py-4">
              <p className="text-muted-foreground meta-label">官方定价</p>
              <p className="text-foreground mt-2 text-lg font-semibold">
                {formatCatalogCurrency(goods.msrpAmount, goods.currencyCode)}
              </p>
            </div>
            <div className="hud-card border-dashed px-4 py-4">
              <p className="text-muted-foreground meta-label">市场观察</p>
              <p className="text-muted-foreground mt-2 text-sm leading-7">
                这里会继续补充市场观察信息。当前页面先聚焦图鉴属性、收藏状态与用户内容。
              </p>
            </div>
          </div>
        </div>

        <div className="collection-panel p-5 sm:p-6">
          <p className="text-muted-foreground eyebrow-label">标签</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {goods.tags.length > 0 ? (
              goods.tags.map((tag) => (
                <Link
                  className="hud-chip px-3 py-1 text-sm"
                  href={`/search?tag=${tag.slug}`}
                  key={tag.id}
                >
                  {tag.name}
                </Link>
              ))
            ) : (
              <span className="hud-chip text-muted-foreground border-dashed px-3 py-1 text-sm">
                暂无标签
              </span>
            )}
          </div>
        </div>
      </section>

      <section className="collection-panel p-5 sm:p-6">
        <div className="space-y-2">
          <p className="text-muted-foreground eyebrow-label">识别入口</p>
          <h2 className="font-heading text-foreground text-4xl leading-none">
            相机识别入口
          </h2>
          <p className="text-muted-foreground text-sm leading-7">
            拍照或上传后，可以快速进入候选确认流程，再回到这件商品的详情页继续查看。
          </p>
          <div className="pt-2">
            <Link
              className="bg-secondary text-secondary-foreground hover:bg-secondary/90 inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-semibold transition"
              href="/recognition"
            >
              打开识别入口
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

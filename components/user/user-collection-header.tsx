import Link from 'next/link';

import { SlotStrip } from '@/components/collection/slot-strip';
import type { UserProfilePageData } from '@/server/data';

type UserCollectionHeaderProps = {
  data: UserProfilePageData;
  displayName: string;
  handle: string | null;
  eyebrow: string;
  railLabel: string;
  /** 徽章陈列柜页入口；不传则不显示。 */
  badgesHref?: string;
  badgeCount?: number;
};

export function UserCollectionHeader({
  data,
  displayName,
  handle,
  eyebrow,
  railLabel,
  badgesHref,
  badgeCount,
}: UserCollectionHeaderProps) {
  const { summary } = data;
  const metrics = [
    {
      label: '谷柜收藏',
      value: summary.cabinetCount,
      tone: 'text-[var(--violet)]',
    },
    { label: '已点亮', value: summary.litCount, tone: 'text-[var(--shu)]' },
    { label: '想要', value: summary.wantedCount, tone: 'text-[var(--want)]' },
    {
      label: '可交换',
      value: summary.exchangeCount,
      tone: 'text-[var(--exchange)]',
    },
  ] as const;

  return (
    <section className="relative overflow-hidden rounded-[28px] border border-[var(--rule)] bg-[linear-gradient(135deg,var(--shu-soft),color-mix(in_oklab,var(--violet-soft)_74%,var(--surface)))] p-5 shadow-[var(--shadow-card)] sm:p-8 lg:p-10">
      <span className="absolute -top-24 right-[8%] size-64 rounded-full bg-[color-mix(in_oklab,var(--violet)_9%,transparent)] blur-3xl" />
      <div className="relative min-w-0">
        <p className="section-kicker hidden sm:inline-flex">
          {eyebrow} · {railLabel}
        </p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 sm:mt-4">
          <h1 className="text-[clamp(21px,5vw,48px)] leading-[1.12]">
            {displayName}
          </h1>
          {badgesHref ? (
            <Link
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--kin)] bg-[var(--kin-soft)] px-3 py-1.5 text-[12px] font-bold text-[var(--ink)] transition-colors hover:bg-[var(--kin)]/25"
              href={badgesHref}
            >
              🏅 徽章 {badgeCount ?? 0} →
            </Link>
          ) : null}
        </div>
        {handle ? <p className="accession mt-2">{handle}</p> : null}

        <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {metrics.map((metric) => (
            <div
              className="rounded-[18px] border border-[var(--rule)] bg-[var(--surface)]/76 p-4"
              key={metric.label}
            >
              <span
                className={`text-[30px] leading-none font-extrabold ${metric.tone}`}
              >
                {metric.value}
              </span>
              <p className="text-muted-foreground mt-2 text-[12px] font-semibold">
                {metric.label}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-[18px] bg-[var(--surface)]/62 p-4 sm:p-5">
          <SlotStrip
            label={`谷柜 ${summary.cabinetCount} 件，已点亮 ${summary.litCount} 件`}
            owned={summary.litCount}
            total={summary.cabinetCount}
          />
          {summary.cabinetCount > 0 && summary.cabinetCount <= 120 ? (
            <p className="text-muted-foreground mt-2 text-[12px]">
              实心为已通过实物识别点亮；空格是已收藏、等待扫描的谷子。
            </p>
          ) : (
            // 数量太多时一格一件会糊成一片，退回长条。
            <div className="bar max-w-[420px]">
              <span style={{ width: `${summary.litProgressPercentage}%` }} />
            </div>
          )}
        </div>

        <p className="text-muted-foreground mt-4 text-[12px]">
          点亮度 {summary.litProgressPercentage}% · 共追踪{' '}
          {summary.trackedGoodsCount} 件 · {summary.visiblePhotoCount} 张图片 ·{' '}
          {summary.ratingCount} 条评分
        </p>
      </div>
    </section>
  );
}

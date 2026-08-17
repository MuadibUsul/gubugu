import { SlotStrip } from '@/components/collection/slot-strip';
import type { UserProfilePageData } from '@/server/data';

type UserCollectionHeaderProps = {
  data: UserProfilePageData;
  displayName: string;
  handle: string | null;
  eyebrow: string;
  railLabel: string;
};

/**
 * 表紙 —— 这份收藏的封面。
 *
 * 旧页面在这里叠了三层：个人卡、收藏陈列、进度总览，三者说的是同一批数字。
 * 合成一处：谁的收藏、有多少、点亮到什么程度。
 */
export function UserCollectionHeader({
  data,
  displayName,
  handle,
  eyebrow,
  railLabel,
}: UserCollectionHeaderProps) {
  const { summary } = data;

  return (
    <section className="spread border-border border-b pb-14">
      <div>
        <p className="lbl">{eyebrow}</p>
        <div className="rail-jp">{railLabel}</div>
      </div>

      <div className="min-w-0">
        {handle ? <p className="accession">{handle}</p> : null}

        <h1 className="mt-2 text-[clamp(30px,4vw,46px)] leading-[1.14]">
          {displayName}
        </h1>
        <div className="rule-kin mt-4" />

        <div className="mt-7 flex flex-wrap items-end gap-x-14 gap-y-6">
          <div>
            <span className="meter-value">
              <em>{summary.ownedCount}</em>
            </span>
            <p className="lbl mt-2">已收录</p>
          </div>
          <div>
            <span className="meter-value">{summary.wantedCount}</span>
            <p className="lbl mt-2">想要</p>
          </div>
          <div>
            <span className="meter-value">{summary.exchangeCount}</span>
            <p className="lbl mt-2">可交换</p>
          </div>
          <div>
            <span className="meter-value">
              {summary.litProgressPercentage}%
            </span>
            <p className="lbl mt-2">点亮度</p>
          </div>
        </div>

        {/* 收集条而不是进度条。这一页原本只有一根百分比长条 —— 而「看得见
            的缺口」正是整套设计的论点，最需要它的地方反而没用上。 */}
        <div className="mt-8">
          <SlotStrip
            label={`追踪 ${summary.trackedGoodsCount} 件，已收录 ${summary.ownedCount} 件`}
            owned={summary.ownedCount}
            total={summary.trackedGoodsCount}
          />
          {summary.trackedGoodsCount > 0 && summary.trackedGoodsCount <= 120 ? (
            <p className="lbl mt-2">
              实心为已收录。空格是标记过、但还没到手的那些。
            </p>
          ) : (
            // 数量太多时一格一件会糊成一片，退回长条。
            <div className="bar max-w-[420px]">
              <span style={{ width: `${summary.litProgressPercentage}%` }} />
            </div>
          )}
        </div>

        <p className="text-muted-foreground mt-5 text-sm">
          共追踪 {summary.trackedGoodsCount} 件 · {summary.visiblePhotoCount}{' '}
          张图片 · {summary.ratingCount} 条评分
        </p>
      </div>
    </section>
  );
}

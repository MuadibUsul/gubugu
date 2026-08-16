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

        <div className="bar mt-8 max-w-[420px]">
          <span style={{ width: `${summary.litProgressPercentage}%` }} />
        </div>

        <p className="text-muted-foreground mt-4 text-sm">
          共追踪 {summary.trackedGoodsCount} 件 · {summary.visiblePhotoCount}{' '}
          张图片 · {summary.ratingCount} 条评分
        </p>
      </div>
    </section>
  );
}

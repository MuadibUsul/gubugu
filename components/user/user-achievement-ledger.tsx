import { formatCatalogDate } from '@/lib/formatters';
import type { AchievementKind } from '@/lib/achievements';
import type { LedgerEntry } from '@/server/data/achievements';

type UserAchievementLedgerProps = {
  entries: LedgerEntry[];
  /** 全站已点亮件数，用于累计类记录的进度。 */
  ownedTotal: number;
  /** 已点亮收藏覆盖的品类数，用于品类广度记录的进度。 */
  typeBreadthTotal: number;
};

type BadgeGroup = {
  key: string;
  label: string;
  kicker: string;
  kinds: readonly AchievementKind[];
  mark: string;
};

// 徽章陈列柜按语义分三柜：累计数量、品类广度、成套补全。参考成熟成就系统的
// 做法——同一主题的徽章排在一起，锁定态显示离下一枚还差多少，而不是一味隐藏。
const badgeGroups: readonly BadgeGroup[] = [
  {
    key: 'count',
    label: '数量里程碑',
    kicker: '累计点亮',
    kinds: ['owned_count'],
    mark: '❖',
  },
  {
    key: 'breadth',
    label: '品类广度',
    kicker: '收藏的类型跨度',
    kinds: ['type_breadth'],
    mark: '◈',
  },
  {
    key: 'complete',
    label: '成套补全',
    kicker: '集齐一整套',
    kinds: ['character_complete', 'series_complete', 'ip_complete'],
    mark: '✦',
  },
];

function currentTotalFor(
  kind: AchievementKind,
  totals: { ownedTotal: number; typeBreadthTotal: number },
): number | null {
  if (kind === 'owned_count') {
    return totals.ownedTotal;
  }

  if (kind === 'type_breadth') {
    return totals.typeBreadthTotal;
  }

  // 补全类没有单一进度数字（按每个作用域各自补全），返回 null 表示不画进度条。
  return null;
}

export function UserAchievementLedger({
  entries,
  ownedTotal,
  typeBreadthTotal,
}: UserAchievementLedgerProps) {
  if (entries.length === 0) {
    return null;
  }

  const totals = { ownedTotal, typeBreadthTotal };
  const unlockedCount = entries.filter(
    (entry) => entry.achievedCount > 0,
  ).length;

  return (
    <section className="mt-14" id="achievement-cabinet">
      <div className="flex items-baseline justify-between gap-5">
        <div>
          <p className="section-kicker">収蔵記録 · 徽章陈列</p>
          <h2 className="mt-2 text-[clamp(24px,3vw,34px)]">徽章陈列柜</h2>
        </div>
        <span className="accession shrink-0">
          <b>{unlockedCount}</b> <i>/ {entries.length}</i>
        </span>
      </div>
      <div className="rule-kin mt-3" />

      <div className="mt-8 space-y-9">
        {badgeGroups.map((group) => {
          const groupEntries = entries.filter((entry) =>
            group.kinds.includes(entry.kind),
          );

          if (groupEntries.length === 0) {
            return null;
          }

          return (
            <div key={group.key}>
              <div className="mb-4 flex items-center gap-2.5">
                <span className="text-[15px] text-[var(--kin)]">
                  {group.mark}
                </span>
                <h3 className="text-[17px] font-bold">{group.label}</h3>
                <span className="text-muted-foreground text-[12px]">
                  {group.kicker}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {groupEntries.map((entry) => {
                  const unlocked = entry.achievedCount > 0;
                  const current = currentTotalFor(entry.kind, totals);
                  const showBar =
                    !unlocked && current !== null && entry.threshold !== null;
                  const pct =
                    showBar && entry.threshold
                      ? Math.min(
                          100,
                          Math.round((current! / entry.threshold) * 100),
                        )
                      : 0;

                  return (
                    <div
                      className={
                        unlocked
                          ? 'relative overflow-hidden rounded-[16px] border border-[color-mix(in_oklab,var(--kin)_55%,var(--rule))] bg-[linear-gradient(150deg,color-mix(in_oklab,var(--kin-soft)_70%,var(--surface)),var(--surface))] p-4'
                          : 'relative overflow-hidden rounded-[16px] border border-[var(--rule)] bg-[var(--sunken)] p-4'
                      }
                      key={entry.code}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span
                          className={
                            unlocked
                              ? 'grid size-10 place-items-center rounded-full bg-[var(--kin)] text-[17px] text-[var(--ink)] shadow-[0_0_0_3px_color-mix(in_oklab,var(--kin)_30%,transparent)]'
                              : 'grid size-10 place-items-center rounded-full border border-dashed border-[var(--rule-2)] text-[15px] text-[var(--ink-3)]'
                          }
                        >
                          {unlocked ? group.mark : '·'}
                        </span>
                        {entry.achievedCount > 1 ? (
                          <span className="num text-[12px] text-[var(--kin)]">
                            ×{entry.achievedCount}
                          </span>
                        ) : null}
                      </div>

                      <p
                        className={
                          unlocked
                            ? 'mt-3 text-[14px] font-bold'
                            : 'text-muted-foreground mt-3 text-[14px] font-semibold'
                        }
                      >
                        {entry.name}
                      </p>
                      <p className="text-muted-foreground mt-1 text-[11.5px] leading-relaxed">
                        {entry.description}
                      </p>

                      {unlocked ? (
                        <p className="num mt-3 text-[11px] text-[var(--kin)]">
                          {entry.achievedAt
                            ? formatCatalogDate(entry.achievedAt)
                            : '已达成'}
                        </p>
                      ) : showBar ? (
                        <div className="mt-3">
                          <div className="h-1.5 overflow-hidden rounded-full bg-[var(--rule)]">
                            <div
                              className="h-full rounded-full bg-[color-mix(in_oklab,var(--kin)_75%,var(--shu))]"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <p className="num text-muted-foreground mt-1.5 text-[10.5px]">
                            {current} / {entry.threshold}
                          </p>
                        </div>
                      ) : (
                        <p className="text-muted-foreground mt-3 text-[10.5px]">
                          尚未达成
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

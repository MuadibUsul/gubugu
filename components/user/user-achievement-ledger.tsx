import { formatCatalogDate } from '@/lib/formatters';
import type { LedgerEntry } from '@/server/data/achievements';

type UserAchievementLedgerProps = {
  entries: LedgerEntry[];
  /** 全站已收录件数，用于展示累计类记录还差多少。 */
  ownedTotal: number;
};

/**
 * 收藏记录 —— 一份登录簿，不是奖章墙。
 *
 * 用和规格表相同的细线、和藏品编号相同的等宽数字：这是同一套语言里的一个
 * 部件，不是贴上去的游戏化模块。
 */
function describeProgress(entry: LedgerEntry, ownedTotal: number) {
  if (entry.kind === 'owned_count' && entry.threshold !== null) {
    const remaining = entry.threshold - ownedTotal;

    return remaining > 0 ? `还差 ${remaining} 件` : '待结算';
  }

  switch (entry.kind) {
    case 'character_complete':
      return '集齐任意一位角色';
    case 'series_complete':
      return '集齐任意一个系列';
    case 'ip_complete':
      return '集齐任意一部作品';
    default:
      return '未达成';
  }
}

export function UserAchievementLedger({
  entries,
  ownedTotal,
}: UserAchievementLedgerProps) {
  if (entries.length === 0) {
    return null;
  }

  const achievedCount = entries.filter(
    (entry) => entry.achievedAt !== null,
  ).length;

  return (
    <section className="mt-14" id="achievement-ledger">
      <div className="spread">
        <div>
          <p className="lbl">记录</p>
          <div className="rail-jp">收藏记录</div>
        </div>

        <div className="min-w-0">
          <div className="flex items-baseline justify-between gap-5">
            <h2 className="text-[26px]">收藏记录</h2>
            <span className="accession">
              <b>{achievedCount}</b> <i>/ {entries.length}</i>
            </span>
          </div>
          <div className="rule-kin mt-3" />
          <p className="text-muted-foreground mt-3 text-sm">
            收藏路上的节点，按达成时间登记在册。
          </p>

          {/* 表格不会收缩到 min-content 以下：窄屏时让它在自己的容器里横滚，
              而不是把整页撑出横向滚动条。 */}
          <div className="mt-6 overflow-x-auto">
            <table className="ledger">
              <thead>
                <tr>
                  <th>编号</th>
                  <th>项目</th>
                  <th>条件</th>
                  <th className="text-right">达成</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, index) => {
                  const achieved = entry.achievedAt !== null;

                  return (
                    <tr
                      className={achieved ? 'is-done' : 'is-pending'}
                      key={entry.code}
                    >
                      <td className="ledger__no">
                        {String(index + 1).padStart(3, '0')}
                      </td>
                      <td className="ledger__name">
                        {entry.name}
                        {entry.achievedCount > 1 ? (
                          <span className="num ml-2">
                            ×{entry.achievedCount}
                          </span>
                        ) : null}
                      </td>
                      <td className="ledger__cond">{entry.description}</td>
                      <td className="ledger__date">
                        {achieved
                          ? formatCatalogDate(entry.achievedAt)
                          : describeProgress(entry, ownedTotal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

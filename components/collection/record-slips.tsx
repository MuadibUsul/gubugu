import type { RecordedUnlock } from '@/server/data/achievements';

type RecordSlipsProps = {
  unlocked: RecordedUnlock[] | undefined;
};

/**
 * 記録纸条 —— 达成収蔵記録时的回执。
 *
 * 一张纸条，靠细线不靠阴影；金色左边框，因为「达成」属于拥有那一层。
 * 不做弹窗、不拦操作：它是一条记录被写下的回执，不是需要确认的事件。
 *
 * 出现与淡出整段由 CSS 动画负责（.slip），组件本身没有状态也没有计时器。
 * key 用记录代码：新达成的记录带着新 key 挂载，动画自然重播；已经播完的
 * 保持在收尾帧上，不会再抢注意力。
 */
export function RecordSlips({ unlocked }: RecordSlipsProps) {
  if (!unlocked || unlocked.length === 0) {
    return null;
  }

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex flex-col items-center gap-2 px-4"
    >
      {unlocked.map((record) => (
        <div className="slip" key={record.code}>
          <p className="font-heading text-[11.5px] text-[var(--kin-2)]">記録</p>
          <div>
            <p className="font-heading text-[15.5px] font-semibold">
              {record.name}
            </p>
            <p className="lbl mt-0.5">{record.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

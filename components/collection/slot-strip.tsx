type SlotStripProps = {
  total: number;
  owned: number;
  label?: string;
  /** 刚填上的那一格，用于渗墨动效。 */
  justFilledIndex?: number;
};

/**
 * 收集条：一格一件，金＝已收录。
 *
 * 图鉴的驱动力来自看得见的空格，不是一个百分比 —— 「62%」不会让人想去补，
 * 五个排在那里的空格会。
 */
export function SlotStrip({
  total,
  owned,
  label,
  justFilledIndex,
}: SlotStripProps) {
  // 一格一件只在数量可数时成立。上千件时整条会糊成一片，那时百分比反而更
  // 有用 —— 这种情况留给调用方处理，这里直接不渲染。
  if (total <= 0 || total > 120) {
    return null;
  }

  return (
    <div
      aria-label={label ?? `已收录 ${owned} 件，共 ${total} 件`}
      className="slot-strip"
      role="img"
    >
      {Array.from({ length: total }).map((_, index) => {
        const filled = index < owned;

        return (
          <span
            className={[
              'slot',
              filled ? 'slot--filled' : '',
              index === justFilledIndex ? 'slot--just' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            key={index}
          />
        );
      })}
    </div>
  );
}

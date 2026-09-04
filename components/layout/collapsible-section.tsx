import type { ReactNode } from 'react';

type CollapsibleSectionProps = {
  title: string;
  kicker?: string;
  hint?: string;
  /** 摘要右侧的计数/状态徽标，例如「12 条」。 */
  badge?: string;
  /** 默认是否展开。次要内容默认收起，按需点开。 */
  defaultOpen?: boolean;
  children: ReactNode;
};

/**
 * 折叠区块：把次要、按需查看的内容默认收起，用户点标题展开。
 *
 * 用原生 <details> —— 不需要客户端 JS，键盘与读屏原生可用，SSR 直接渲染。
 */
export function CollapsibleSection({
  title,
  kicker,
  hint,
  badge,
  defaultOpen = false,
  children,
}: CollapsibleSectionProps) {
  return (
    <details className="group" open={defaultOpen}>
      <summary className="flex cursor-pointer list-none items-center gap-4 py-2 marker:hidden [&::-webkit-details-marker]:hidden">
        <div className="min-w-0 flex-1">
          {kicker ? <p className="section-kicker">{kicker}</p> : null}
          <div className="mt-1 flex items-center gap-3">
            <h2 className="text-[clamp(22px,3vw,32px)]">{title}</h2>
            {badge ? (
              <span className="chip px-2.5 py-1 text-[11px]">{badge}</span>
            ) : null}
          </div>
          {hint ? (
            <p className="text-muted-foreground mt-1 text-[13px]">{hint}</p>
          ) : null}
        </div>
        <span
          aria-hidden
          className="grid size-9 shrink-0 place-items-center rounded-full border border-[var(--rule)] text-[15px] leading-none transition-transform duration-200 ease-[var(--ease)] group-open:rotate-180"
        >
          ⌄
        </span>
      </summary>
      <div className="mt-6">{children}</div>
    </details>
  );
}

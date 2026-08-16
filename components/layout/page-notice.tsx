import Link from 'next/link';

export type PageNoticeAction = {
  href: string;
  label: string;
};

type PageNoticeProps = {
  eyebrow: string;
  railLabel?: string;
  title: string;
  description: string;
  actions?: PageNoticeAction[];
  /** 错误页要给一个重试按钮，它不是链接。 */
  onRetryLabel?: string;
  children?: React.ReactNode;
};

/**
 * 全站的错误 / 未找到 / 无权限页面共用这一个版式。
 *
 * 之前这 11 个页面各自复制了一份同样的面板结构，任何视觉调整都要改 11 遍，
 * 而且它们已经和主体页面脱节了。合并成一个之后，它们自动跟着体系走。
 */
export function PageNotice({
  eyebrow,
  railLabel,
  title,
  description,
  actions = [],
  children,
}: PageNoticeProps) {
  return (
    <main className="mx-auto w-full max-w-[1180px] px-5 pt-20 pb-24 md:px-10">
      <div className="spread">
        <div>
          <p className="lbl">{eyebrow}</p>
          {railLabel ? <div className="rail-jp">{railLabel}</div> : null}
        </div>

        <div className="min-w-0">
          <h1 className="text-[clamp(26px,3.4vw,40px)] leading-[1.16] text-balance">
            {title}
          </h1>
          <div className="rule-kin mt-4" />
          <p className="text-muted-foreground mt-4 max-w-[58ch]">
            {description}
          </p>

          {children}

          {actions.length > 0 ? (
            <div className="mt-8">
              {actions.map((action) => (
                <Link
                  className="border-border group flex items-baseline gap-4 border-b py-4 last:border-b-0"
                  href={action.href}
                  key={action.href}
                >
                  <span className="font-heading text-[17px] font-semibold transition-colors group-hover:text-[var(--shu)]">
                    {action.label}
                  </span>
                  <span
                    aria-hidden="true"
                    className="border-border mx-1 hidden min-w-6 flex-1 translate-y-[-4px] border-b border-dotted sm:block"
                  />
                  <span className="num shrink-0">{action.href}</span>
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}

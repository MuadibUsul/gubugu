type SiteShellProps = {
  children: React.ReactNode;
  eyebrow: string;
  title: string;
  description: string;
  /** 竖排标记，画册骨架的一部分。省略则只显示横向小标签。 */
  railLabel?: string;
};

/**
 * 画册的开页：左窄栏放标记，右主栏放内容。
 * 标题下一道金线，是每个区块的起首。
 */
export function SiteShell({
  children,
  eyebrow,
  title,
  description,
  railLabel,
}: SiteShellProps) {
  return (
    <main className="mx-auto w-full max-w-[1180px] px-5 py-12 md:px-10 md:py-16">
      <div className="spread">
        <div>
          <p className="lbl">{eyebrow}</p>
          {railLabel ? <div className="rail-jp">{railLabel}</div> : null}
        </div>

        <div className="min-w-0">
          <header>
            <h1 className="text-foreground text-[clamp(30px,4vw,50px)] leading-[1.16] text-balance">
              {title}
            </h1>
            <div className="rule-kin mt-4" />
            <p className="text-muted-foreground mt-4 max-w-[60ch] text-base">
              {description}
            </p>
          </header>

          <div className="mt-10">{children}</div>
        </div>
      </div>
    </main>
  );
}

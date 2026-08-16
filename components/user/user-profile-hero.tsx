import type { UserProfilePageData } from '@/server/data';

export type UserNotebookProfile = {
  label: string;
  displayName: string;
  handle: string | null;
  bio: string | null;
  city: string | null;
  accentTitle: string;
};

type UserProfileHeroProps = {
  profile: UserNotebookProfile;
  data: UserProfilePageData;
};

function getPrivacyModeLabel(mode: string) {
  switch (mode) {
    case 'public-demo':
      return '公开展示';
    case 'self':
      return '仅自己可见';
    case 'public':
      return '公开';
    case 'followers':
      return '仅关注者可见';
    case 'private':
      return '私密';
    default:
      return mode;
  }
}

export function UserProfileHero({ profile, data }: UserProfileHeroProps) {
  const initials = profile.displayName
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
    .slice(0, 2);

  return (
    <section className="collection-panel relative overflow-hidden px-6 py-7 sm:px-8 sm:py-9 lg:px-10 lg:py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,color-mix(in_oklab,var(--accent)_22%,transparent),transparent_34%),radial-gradient(circle_at_bottom_right,color-mix(in_oklab,var(--primary)_14%,transparent),transparent_46%),linear-gradient(180deg,color-mix(in_oklab,var(--card)_90%,white)_0%,color-mix(in_oklab,var(--background)_90%,var(--card))_100%)]" />
      <div className="pointer-events-none absolute inset-x-6 top-5 h-px bg-[linear-gradient(90deg,transparent,color-mix(in_oklab,var(--accent)_48%,white),transparent)] sm:inset-x-8 lg:inset-x-10" />

      <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1.12fr)_minmax(320px,0.88fr)]">
        <div className="space-y-7">
          <div className="space-y-4">
            <p className="text-muted-foreground text-[0.72rem] font-semibold uppercase">
              Collection
            </p>

            <div className="flex flex-wrap items-start gap-5">
              <div className="border-border/70 from-accent/16 to-background/84 flex size-24 shrink-0 items-center justify-center rounded-[var(--radius)] border bg-gradient-to-br text-2xl font-semibold sm:size-28 sm:text-3xl">
                {initials}
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <span className="border-border/70 bg-background/76 text-muted-foreground rounded-full border px-3 py-1 text-sm">
                      {profile.label}
                    </span>
                    <span className="border-border/70 bg-background/76 text-muted-foreground rounded-full border px-3 py-1 text-sm">
                      {profile.accentTitle}
                    </span>
                  </div>
                  <h1 className="font-heading text-foreground text-5xl leading-[0.94] text-balance sm:text-6xl xl:text-[5rem]">
                    {profile.displayName}
                  </h1>
                  {profile.handle ? (
                    <p className="text-muted-foreground text-base font-semibold">
                      {profile.handle}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="border-border/65 bg-card/72 rounded-[var(--radius)] border px-4 py-4">
              <p className="text-muted-foreground text-[0.68rem] uppercase">
                已拥有
              </p>
              <p className="font-heading text-foreground mt-3 text-4xl leading-none">
                {data.summary.ownedCount}
              </p>
            </div>
            <div className="border-border/65 bg-card/72 rounded-[var(--radius)] border px-4 py-4">
              <p className="text-muted-foreground text-[0.68rem] uppercase">
                想要
              </p>
              <p className="font-heading text-foreground mt-3 text-4xl leading-none">
                {data.summary.wantedCount}
              </p>
            </div>
            <div className="border-border/65 bg-card/72 rounded-[var(--radius)] border px-4 py-4">
              <p className="text-muted-foreground text-[0.68rem] uppercase">
                可交换
              </p>
              <p className="font-heading text-foreground mt-3 text-4xl leading-none">
                {data.summary.exchangeCount}
              </p>
            </div>
            <div className="border-border/65 bg-card/72 rounded-[var(--radius)] border px-4 py-4">
              <p className="text-muted-foreground text-[0.68rem] uppercase">
                点亮率
              </p>
              <p className="font-heading text-foreground mt-3 text-4xl leading-none">
                {data.summary.litProgressPercentage}%
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              className="bg-secondary text-secondary-foreground hover:bg-secondary/90 inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-semibold transition"
              href="#owned-shelf"
            >
              已拥有
            </a>
            <a
              className="border-border bg-background/82 text-foreground hover:bg-muted inline-flex h-11 items-center justify-center rounded-full border px-5 text-sm font-semibold transition"
              href="#exchange-board"
            >
              交换
            </a>
            <a
              className="border-border bg-background/82 text-foreground hover:bg-muted inline-flex h-11 items-center justify-center rounded-full border px-5 text-sm font-semibold transition"
              href="#photo-archive"
            >
              图片
            </a>
          </div>
        </div>

        <aside className="border-border/70 relative overflow-hidden rounded-[var(--radius)] border bg-[linear-gradient(180deg,color-mix(in_oklab,var(--card)_76%,white)_0%,color-mix(in_oklab,var(--background)_90%,var(--card))_100%)] p-5">
          <div className="pointer-events-none absolute top-8 -right-14 size-40 rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--accent)_20%,transparent),transparent_70%)]" />
          <div className="pointer-events-none absolute bottom-6 -left-12 size-36 rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--primary)_16%,transparent),transparent_72%)]" />

          <div className="relative flex h-full flex-col gap-5">
            <div className="space-y-3">
              <p className="text-muted-foreground text-[0.68rem] font-semibold uppercase">
                Visibility
              </p>
              <h2 className="font-heading text-foreground text-4xl leading-none">
                当前设置
              </h2>
            </div>

            <div className="grid gap-3">
              <div className="border-border/65 bg-background/76 rounded-[var(--radius)] border px-4 py-3">
                <p className="text-muted-foreground text-[0.66rem] uppercase">
                  收藏者
                </p>
                <p className="text-foreground mt-2 text-sm font-semibold">
                  {profile.city ?? '当前登录账户'}
                </p>
              </div>
              <div className="border-border/65 bg-background/76 rounded-[var(--radius)] border px-4 py-3">
                <p className="text-muted-foreground text-[0.66rem] uppercase">
                  可见性
                </p>
                <p className="text-foreground mt-2 text-sm font-semibold">
                  {getPrivacyModeLabel(data.privacy.currentMode)}
                </p>
              </div>
              <div className="border-border/65 bg-card/72 rounded-[var(--radius)] border border-dashed px-4 py-3">
                <p className="text-muted-foreground text-[0.66rem] uppercase">
                  其他模式
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {data.privacy.reservedModes.map((mode) => (
                    <span
                      className="border-border/65 bg-background/76 text-muted-foreground rounded-full border px-3 py-1 text-xs"
                      key={mode}
                    >
                      {getPrivacyModeLabel(mode)}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { LoginForm } from '@/components/auth/login-form';
import { getSingleSearchParamValue } from '@/lib/search-params';
import { getSupabaseAuthConfig } from '@/lib/supabase/config';
import { getAuthUser } from '@/server/auth/session';

export const metadata: Metadata = {
  title: '登录',
  description: '用于收藏、评分、评论与交换记录同步的账户入口。',
};

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function normalizeNextPath(nextPath?: string) {
  if (!nextPath || !nextPath.startsWith('/')) {
    return '/';
  }

  return nextPath;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const user = await getAuthUser();
  const resolvedSearchParams = (await searchParams) ?? {};
  const nextPath = normalizeNextPath(
    getSingleSearchParamValue(resolvedSearchParams.next),
  );

  if (user) {
    redirect(nextPath);
  }

  const routeError = getSingleSearchParamValue(resolvedSearchParams.error);
  const authMode = getSupabaseAuthConfig() ? 'supabase' : 'local-demo';
  const heroEyebrow = '账户入口';
  const heroTitle =
    authMode === 'supabase'
      ? '登录后继续管理你的收藏、评分与交换线索。'
      : '选择一个收藏档案，直接进入对应的浏览与记录视角。';
  const heroDescription =
    authMode === 'supabase'
      ? '登录后，已拥有、想要、可交换、评论和评分都会绑定到当前账户，并自动回到你刚才浏览的位置。'
      : '你可以直接进入不同的收藏视角，查看各自的收藏墙、交换板、评分记录与内容管理入口。';
  const featureCards =
    authMode === 'supabase'
      ? [
          '登录后，收藏状态、交换线索和评分记录都会跟随当前账户同步。',
          '浏览中发起的操作会自动回写到当前账户名下。',
          '账户入口保持轻量，优先服务收藏、评论与内容管理流程。',
        ]
      : [
          '不同档案分别对应补全优先、交换优先和评测优先的收藏视角。',
          '进入后可以直接查看各自的收藏墙、留言、评分与交换记录。',
          '如具备内容管理权限，也会自动显示对应入口。',
        ];
  const panelEyebrow = '登录';
  const panelTitle =
    authMode === 'supabase'
      ? '登录你的收藏册'
      : '选择一个收藏档案';
  const panelDescription =
    authMode === 'supabase'
      ? '登录成功后，你的收藏、评论、评分与交换记录都会在同一账户下持续累积。'
      : '每个档案都对应一套完整的收藏与内容记录。进入后会直接切换到该视角下的当前状态。';
  const extensionChips =
    authMode === 'supabase'
      ? ['收藏同步', '评分与评论', '交换记录']
      : ['收藏墙', '交换板', '评分记录'];

  return (
    <main className="relative isolate overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[32rem] bg-[radial-gradient(circle_at_top,color-mix(in_oklab,var(--accent)_18%,transparent),transparent_58%)]" />
      <div className="pointer-events-none absolute top-[-4rem] right-[-10rem] size-[22rem] rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--primary)_14%,transparent),transparent_68%)] blur-xl" />

      <div className="mx-auto flex min-h-screen w-full max-w-[90rem] items-center px-5 py-[5.5rem] md:px-8 md:py-24 xl:px-10 xl:py-24">
        <section className="grid w-full gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
          <article className="collection-panel relative overflow-hidden px-6 py-7 sm:px-8 sm:py-9 lg:px-10 lg:py-10">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,color-mix(in_oklab,var(--accent)_20%,transparent),transparent_34%),linear-gradient(180deg,color-mix(in_oklab,var(--surface-strong)_94%,transparent)_0%,color-mix(in_oklab,var(--surface-soft)_88%,var(--background))_100%)]" />

            <div className="relative space-y-6">
              <div className="space-y-4">
                <p className="text-muted-foreground text-[0.72rem] font-semibold tracking-[0.36em] uppercase">
                  {heroEyebrow}
                </p>
                <h1 className="font-heading text-foreground max-w-4xl text-5xl leading-[0.94] text-balance sm:text-6xl xl:text-[5rem]">
                  {heroTitle}
                </h1>
                <p className="max-w-3xl text-base leading-8 text-[color:color-mix(in_oklab,var(--foreground)_72%,var(--background))] sm:text-lg">
                  {heroDescription}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {featureCards.map((item) => (
                  <div
                    className="hud-card px-4 py-4 text-sm leading-7"
                    key={item}
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </article>

          <aside className="collection-panel p-6 sm:p-8">
            <div className="space-y-6">
              <div className="space-y-3">
                <p className="text-muted-foreground text-[0.72rem] font-semibold tracking-[0.34em] uppercase">
                  {panelEyebrow}
                </p>
                <h2 className="font-heading text-foreground text-4xl leading-none">
                  {panelTitle}
                </h2>
                <p className="text-muted-foreground text-sm leading-7">
                  {panelDescription}
                </p>
              </div>

              <LoginForm
                authMode={authMode}
                nextPath={nextPath}
                routeError={routeError}
              />

              <div className="hud-card text-muted-foreground border-dashed px-4 py-4 text-sm leading-7">
                {authMode === 'supabase'
                  ? '登录后会自动回到刚才浏览的位置。'
                  : '下列档案分别对应不同的收藏与浏览视角。'}
                <div className="mt-3 flex flex-wrap gap-2">
                  {extensionChips.map((item) => (
                    <span className="hud-chip px-3 py-1 text-xs" key={item}>
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

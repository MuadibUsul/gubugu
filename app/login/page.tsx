import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { LoginForm } from '@/components/auth/login-form';
import { getSingleSearchParamValue } from '@/lib/search-params';
import { getSupabaseAuthConfig } from '@/lib/supabase/config';
import { getAuthUser } from '@/server/auth/session';

export const metadata: Metadata = {
  title: '登录',
  description: '登录后保存收藏、评分、评论和交换记录。',
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
  const heroTitle =
    authMode === 'supabase' ? '登录后继续。' : '选择一个收藏档案。';
  const panelTitle = authMode === 'supabase' ? '登录' : '选择档案';
  const extensionChips =
    authMode === 'supabase'
      ? ['收藏同步', '评分评论', '交换记录']
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
                  账户入口
                </p>
                <h1 className="font-heading text-foreground max-w-4xl text-5xl leading-[0.94] text-balance sm:text-6xl xl:text-[5rem]">
                  {heroTitle}
                </h1>
              </div>

              <div className="flex flex-wrap gap-2">
                {extensionChips.map((item) => (
                  <span className="hud-chip px-3 py-1 text-xs" key={item}>
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </article>

          <aside className="collection-panel p-6 sm:p-8">
            <div className="space-y-6">
              <div className="space-y-3">
                <p className="text-muted-foreground text-[0.72rem] font-semibold tracking-[0.34em] uppercase">
                  登录
                </p>
                <h2 className="font-heading text-foreground text-4xl leading-none">
                  {panelTitle}
                </h2>
              </div>

              <LoginForm
                authMode={authMode}
                nextPath={nextPath}
                routeError={routeError}
              />
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { LoginForm } from '@/components/auth/login-form';
import { normalizeInternalPath } from '@/lib/internal-path';
import { getSingleSearchParamValue } from '@/lib/search-params';
import { getAuthUser } from '@/server/auth/session';

export const metadata: Metadata = {
  title: '登录',
  description: '登录后保存收藏、评分、评论和交换记录。',
};

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const user = await getAuthUser();
  const resolvedSearchParams = (await searchParams) ?? {};
  const nextPath = normalizeInternalPath(
    getSingleSearchParamValue(resolvedSearchParams.next),
  );

  if (user) {
    redirect(nextPath);
  }

  const routeError = getSingleSearchParamValue(resolvedSearchParams.error);
  const heroTitle = '进入你的收藏档案。';
  const panelTitle = '登录';
  const benefits = [
    '收藏状态在设备间同步',
    '留下评分、评论与实物照片',
    '保存换谷提案和履约记录',
  ];

  return (
    <main>
      <div className="mx-auto w-full max-w-[1060px] px-4 py-8 sm:px-6 md:px-8 md:py-12">
        <section className="grid w-full overflow-hidden rounded-[28px] border border-[var(--rule)] bg-[var(--surface)] shadow-[var(--shadow-float)] lg:grid-cols-[minmax(0,1fr)_440px]">
          <article className="relative overflow-hidden bg-[linear-gradient(145deg,var(--shu-soft),color-mix(in_oklab,var(--violet-soft)_76%,var(--surface)))] px-6 py-10 sm:px-10 lg:min-h-[620px] lg:px-12 lg:py-14">
            <span className="absolute -top-20 -right-16 size-64 rounded-full bg-[color-mix(in_oklab,var(--violet)_10%,transparent)] blur-3xl" />
            <span className="absolute -bottom-16 -left-16 size-56 rounded-full bg-[color-mix(in_oklab,var(--shu)_10%,transparent)] blur-3xl" />
            <div className="relative flex h-full flex-col">
              <div>
                <p className="section-kicker">欢迎回来</p>
                <h1 className="font-heading text-foreground mt-3 text-[clamp(22px,6vw,58px)] leading-[1.12] text-balance">
                  {heroTitle}
                </h1>
                <p className="text-muted-foreground mt-3 max-w-[46ch] text-sm">
                  喜欢、想要、可换，每一个收藏决定都留在你自己的谷柜里。
                </p>
              </div>

              <div className="mt-10 space-y-3 lg:mt-auto">
                {benefits.map((item, index) => (
                  <div
                    className="flex items-center gap-3 rounded-[16px] bg-[var(--surface)]/72 px-4 py-3 text-sm"
                    key={item}
                  >
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[var(--shu)] text-[11px] font-bold text-white">
                      {index + 1}
                    </span>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </article>

          <aside className="order-first p-6 sm:p-9 lg:order-none lg:px-10 lg:py-12">
            <div className="space-y-7">
              <div>
                <p className="section-kicker">账户入口</p>
                <h2 className="font-heading text-foreground mt-4 text-[32px] leading-tight">
                  {panelTitle}
                </h2>
                <p className="text-muted-foreground mt-2 text-sm">
                  使用邮箱和密码登录。
                </p>
              </div>

              <LoginForm nextPath={nextPath} routeError={routeError} />
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

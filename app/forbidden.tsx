import Link from 'next/link';

export default function ForbiddenPage() {
  return (
    <main className="relative isolate overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[26rem] bg-[radial-gradient(circle_at_top,color-mix(in_oklab,var(--accent)_16%,transparent),transparent_58%)]" />

      <div className="mx-auto flex min-h-screen w-full max-w-[88rem] items-center px-5 py-8 md:px-8 xl:px-10">
        <section className="collection-panel w-full max-w-3xl px-6 py-7 sm:px-8 sm:py-9">
          <div className="space-y-5">
            <div className="space-y-3">
              <p className="text-muted-foreground text-[0.72rem] font-semibold tracking-[0.34em] uppercase">
                无访问权限
              </p>
              <h1 className="font-heading text-foreground text-5xl leading-[0.94] sm:text-6xl">
                你当前无权进入这个管理工作台
              </h1>
              <p className="text-muted-foreground max-w-2xl text-base leading-8">
                这个路由需要已登录账号，并且拥有明确的管理员或审核员权限。
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-semibold transition"
                href="/"
              >
                返回首页
              </Link>
              <Link
                className="border-border bg-background/82 text-foreground hover:bg-muted inline-flex h-11 items-center justify-center rounded-full border px-5 text-sm font-semibold transition"
                href="/login?next=%2Fadmin"
              >
                重新登录
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

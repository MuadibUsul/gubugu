import Link from 'next/link';

import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[94rem] items-center px-5 py-8 md:px-8 xl:px-10">
      <div className="collection-panel relative w-full overflow-hidden p-6 sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,color-mix(in_oklab,var(--accent)_16%,transparent),transparent_44%)]" />
        <div className="relative space-y-6">
          <div className="space-y-4">
            <p className="text-muted-foreground text-[0.72rem] font-semibold tracking-[0.34em] uppercase">
              角色未找到
            </p>
            <h1 className="font-heading text-foreground text-4xl leading-none sm:text-5xl">
              这个角色暂时还没有收录进图鉴
            </h1>
            <p className="text-muted-foreground max-w-2xl text-sm leading-7 sm:text-base">
              当前路径下没有找到对应的角色图鉴。可以先回到首页或搜索页， 继续从
              IP、角色名或 SKU 线索进入。
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button asChild variant="secondary">
              <Link href="/">返回首页</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/search">前往搜索页</Link>
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}

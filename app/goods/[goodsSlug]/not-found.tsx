import Link from 'next/link';

import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[94rem] items-center px-5 py-8 md:px-8 xl:px-10">
      <div className="collection-panel relative w-full overflow-hidden p-6 sm:p-8">
        <div className="space-y-6">
          <div className="space-y-4">
            <p className="text-muted-foreground text-[0.72rem] font-semibold tracking-[0.34em] uppercase">
              SKU 不存在
            </p>
            <h1 className="font-heading text-foreground text-4xl leading-none sm:text-5xl">
              这个 SKU 还没有被收录
            </h1>
            <p className="text-muted-foreground max-w-2xl text-sm leading-7 sm:text-base">
              当前请求的商品详情路径没有匹配到已发布的
              SKU。你可以返回搜索页或首页，从有效的图鉴条目继续浏览。
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button asChild variant="secondary">
              <Link href="/">返回首页</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/search">前往搜索</Link>
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}

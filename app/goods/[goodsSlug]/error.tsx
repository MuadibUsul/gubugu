'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[94rem] items-center px-5 py-8 md:px-8 xl:px-10">
      <div className="collection-panel relative w-full overflow-hidden p-6 sm:p-8">
        <div className="space-y-6">
          <div className="space-y-4">
            <p className="text-muted-foreground text-[0.72rem] font-semibold tracking-[0.34em] uppercase">
              商品路由异常
            </p>
            <h1 className="font-heading text-foreground text-4xl leading-none sm:text-5xl">
              这个 SKU 详情页渲染失败了
            </h1>
            <p className="text-muted-foreground max-w-2xl text-sm leading-7 sm:text-base">
              可以先重试一次；如果仍然失败，再检查数据库连接、登录会话状态，以及目标商品记录是否存在。
            </p>
            <p className="text-muted-foreground text-sm">
              {error.message || '未知商品路由错误。'}
            </p>
          </div>

          <div>
            <button
              className="bg-primary text-primary-foreground shadow-soft hover:bg-primary/90 inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-semibold transition"
              onClick={reset}
              type="button"
            >
              重试渲染
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

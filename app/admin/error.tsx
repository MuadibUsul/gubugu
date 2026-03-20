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
    <main className="mx-auto flex min-h-screen w-full max-w-[96rem] items-center px-5 py-8 md:px-8 xl:px-10">
      <div className="collection-panel relative w-full overflow-hidden p-6 sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,color-mix(in_oklab,var(--accent)_14%,transparent),transparent_46%)]" />
        <div className="relative space-y-6">
          <div className="space-y-4">
            <p className="text-muted-foreground text-[0.72rem] font-semibold tracking-[0.34em] uppercase">
              管理后台路由错误
            </p>
            <h1 className="font-heading text-foreground text-4xl leading-none sm:text-5xl">
              管理后台渲染失败
            </h1>
            <p className="text-muted-foreground max-w-2xl text-sm leading-7 sm:text-base">
              管理后台在准备当前页面壳层时遇到了未预期错误。可以先重试一次；
              如果仍然失败，再检查服务端日志。
            </p>
            <p className="text-muted-foreground text-sm">
              {error.message || '未知的管理后台路由错误。'}
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

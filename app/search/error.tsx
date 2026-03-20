'use client';

import { useEffect } from 'react';

function getDisplayMessage(error: Error) {
  if (!error.message) {
    return '当前搜索暂时不可用，请稍后重试。';
  }

  if (
    error.message.includes('expected string to have >= 1 characters') ||
    error.message.includes('Too small')
  ) {
    return '这次搜索条件已经失效，请重新发起搜索。';
  }

  return '搜索页暂时无法完成这次请求，请稍后重试。';
}

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

  const displayMessage = getDisplayMessage(error);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[92rem] items-center px-5 py-8 md:px-8 xl:px-10">
      <div className="collection-panel relative w-full overflow-hidden p-6 sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,color-mix(in_oklab,var(--accent)_16%,transparent),transparent_44%)]" />
        <div className="relative space-y-6">
          <div className="space-y-4">
            <p className="text-muted-foreground text-[0.72rem] font-semibold tracking-[0.34em] uppercase">
              搜索异常
            </p>
            <h1 className="font-heading text-foreground text-4xl leading-none sm:text-5xl">
              搜索页加载失败
            </h1>
            <p className="text-muted-foreground max-w-2xl text-sm leading-7 sm:text-base">
              {displayMessage}
            </p>
          </div>

          <div>
            <button
              className="bg-primary text-primary-foreground shadow-soft hover:bg-primary/90 inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-semibold transition"
              onClick={reset}
              type="button"
            >
              重试搜索
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

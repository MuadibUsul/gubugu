'use client';

import { useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { SiteShell } from '@/components/layout/site-shell';

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
    <SiteShell
      eyebrow="发生异常"
      title="当前页面遇到了未预期错误。"
      description="站点骨架已经就绪，但这个路由渲染失败了。可以先重试一次，再继续排查更深层的问题。"
    >
      <div className="max-w-2xl rounded-[2rem] border border-destructive/30 bg-card/85 p-8 shadow-soft backdrop-blur">
        <p className="text-sm leading-6 text-muted-foreground">
          {error.message || '未知应用错误。'}
        </p>
        <div className="mt-6">
          <Button onClick={reset}>重试渲染</Button>
        </div>
      </div>
    </SiteShell>
  );
}

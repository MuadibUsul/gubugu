'use client';

import { useEffect } from 'react';

import { PageNotice } from '@/components/layout/page-notice';

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
    <PageNotice
      description="页面渲染时出错了。可以重试一次，如果还是不行，稍后再来。"
      eyebrow="页面出错"
      railLabel="出错"
      title="这一页没能加载出来"
    >
      <button
        className="mt-6 rounded-[var(--radius)] bg-[var(--shu)] px-5 py-2.5 text-[14px] font-medium text-[var(--shu-ink)]"
        onClick={reset}
        type="button"
      >
        重试
      </button>
    </PageNotice>
  );
}

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
      description="检索时出错了。可以重试，或者换一组关键词。"
      eyebrow="搜索出错"
      railLabel="検索"
      title="搜索没能完成"
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

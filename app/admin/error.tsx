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
      description="后台数据加载失败。重试一次，或确认数据库连接是否正常。"
      eyebrow="后台出错"
      railLabel="管理"
      title="后台页面没能加载"
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

import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '离线',
};

// Service Worker 在断网导航时回退到这里。保持极简、无数据依赖，确保离线可渲染。
export default function OfflinePage() {
  return (
    <main className="mx-auto grid min-h-[70vh] max-w-[560px] place-items-center px-6 text-center">
      <div>
        <span className="text-5xl">✦</span>
        <h1 className="mt-5 text-2xl font-bold">当前离线</h1>
        <p className="text-muted-foreground mt-3 text-sm leading-7">
          网络似乎断开了。已缓存的谷子仍可翻阅，恢复联网后即可继续浏览与点亮。
        </p>
        <Link
          className="mt-6 inline-flex rounded-[12px] bg-[var(--shu)] px-5 py-2.5 text-sm font-bold text-[var(--shu-ink)]"
          href="/"
        >
          重试首页
        </Link>
      </div>
    </main>
  );
}

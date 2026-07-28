import Link from 'next/link';

import { SiteShell } from '@/components/layout/site-shell';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <SiteShell
      eyebrow="页面不存在"
      title="这个页面还没有被收录。"
      description="当前路由不存在。你可以返回首页，从已经初始化好的站点入口继续浏览。"
    >
      <div className="border-border/70 bg-card/80 shadow-soft rounded-[2rem] border p-8 backdrop-blur">
        <Button asChild>
          <Link href="/">返回首页</Link>
        </Button>
      </div>
    </SiteShell>
  );
}

import { PageNotice } from '@/components/layout/page-notice';

export default function NotFound() {
  return (
    <PageNotice
      actions={[{ href: '/', label: '回到图鉴首页' }]}
      description="这个收藏者主页不存在，或者对方把主页设成了私密。"
      eyebrow="未找到"
      railLabel="无结果"
      title="找不到这位收藏者"
    />
  );
}

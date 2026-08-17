import { PageNotice } from '@/components/layout/page-notice';

export default function NotFound() {
  return (
    <PageNotice
      actions={[
        { href: '/', label: '回到图鉴首页' },
        { href: '/search', label: '搜索其他条目' },
      ]}
      description="这个路径下没有对应的角色。可以从作品目次进入，或者直接搜角色名。"
      eyebrow="未找到"
      railLabel="无结果"
      title="这个角色还没有收录"
    />
  );
}

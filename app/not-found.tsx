import { PageNotice } from '@/components/layout/page-notice';

export default function NotFound() {
  return (
    <PageNotice
      actions={[
        { href: '/', label: '回到图鉴首页' },
        { href: '/search', label: '搜索条目' },
      ]}
      description="这个地址下没有内容。可以从首页的目次翻起，或者直接搜。"
      eyebrow="未找到"
      railLabel="該当なし"
      title="这一页不存在"
    />
  );
}

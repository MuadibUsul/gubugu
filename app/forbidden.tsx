import { PageNotice } from '@/components/layout/page-notice';

export default function Forbidden() {
  return (
    <PageNotice
      actions={[{ href: '/', label: '回到图鉴首页' }]}
      description="当前账户没有访问这一页的权限。如果这不符合预期，请联系管理员确认允许名单。"
      eyebrow="无权限"
      railLabel="権限なし"
      title="这一页不对当前账户开放"
    />
  );
}

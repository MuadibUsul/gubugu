import { PageNotice } from '@/components/layout/page-notice';

export default function NotFound() {
  return (
    <PageNotice
      actions={[
        { href: '/search', label: '搜索其他条目' },
        { href: '/recognition', label: '用照片找找看' },
      ]}
      description="这个路径下没有对应的条目。如果手上有实物，可以用拍照识别反查。"
      eyebrow="未找到"
      railLabel="該当なし"
      title="这件周边还没有收录"
    />
  );
}
